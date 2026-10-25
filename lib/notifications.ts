import {
  fullName,
  mobilityLabel,
  serviceShortName,
  shortRef,
  type TripRequestInput,
} from './trip-request';
import { describeDetails, detailsFor } from './trip-details';
import { SAAS_BASE } from './saas-links';
import { assertEmailAllowed, EmailBlockedError, type EmailKind } from './marketing-guard';
import { BUSINESS_MAILING_ADDRESS, emailFooterText, emailIdentityText } from './business';
import { isSuppressed } from './email-suppression';
import { unsubscribeUrl } from './unsubscribe-token';
import { NEEDS_PRICE_MARKER, PRICE_PENDING_MESSAGE, PRICE_RANGE_NOTE, priceKind } from './price-fallback';

/**
 * Alerts fire after a request is stored. Each leg is independent and each
 * swallows its own failure.
 *
 * The row is the system of record. An alert is an alert — a dead push service
 * or an email outage must never turn a captured request into a lost one. Every
 * failure is logged with the request id so nothing disappears silently.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PII RULE — read before editing the push payloads.
 *
 * An ntfy topic is readable by ANYONE who knows the topic string. It is a
 * shared secret, not an authenticated channel. So a push notification carries
 * a reference and a pickup time and NOTHING ELSE: no name, no phone number, no
 * pickup address, no destination, no email.
 *
 * The alert is a trigger. /ops is the system of record. That is better design
 * independent of the privacy point — the operator opens one screen that always
 * has the current state, rather than trusting a stale text message.
 *
 * Email is different: the operator email goes to a mailbox we control, and the
 * auto-reply goes to the customer's own address with the customer's own data.
 * Those may carry detail. The PUSH legs may not.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DISPATCH_PHONE = '(704) 941-8508';
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Tassy Transportation <dispatch@tassytrucks.com>';

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tassytrucks.com').replace(/\/+$/, '');
}

function opsUrl(): string {
  return `${siteUrl()}/ops`;
}

/** Short, human-readable pickup time. Carries no location and no identity. */
function shortWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'time TBC';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

/**
 * When a dispatcher can realistically answer.
 *
 * The form now takes requests at any hour, so "within 2 hours" stopped
 * being true at 2am. The old copy papered over that with "during business
 * hours", which leaves the customer to work out what those are and when theirs
 * starts. Now the email knows what time it is and says the actual thing.
 */
const BUSINESS_OPEN_HOUR = 7; // 7am Charlotte
/**
 * 7pm, not 9pm — this is the last hour the two-hour promise can still be KEPT,
 * which is not the same as the last hour someone is around. Dispatch runs to
 * about 9pm, but a request at 8:30pm promised "within 2 hours" lands at
 * 10:30pm, ninety minutes after everyone has stopped. After 7pm the honest
 * answer is the morning.
 */
const BUSINESS_CLOSE_HOUR = 19;

/**
 * The hour of the day in Charlotte, 0-23.
 *
 * Via Intl rather than a fixed UTC offset, because Charlotte is EDT for part of
 * the year and EST for the rest — a hardcoded -5 would put the boundary an hour
 * wrong for eight months of the year. `hour12: false` can render midnight as
 * "24" on some ICU builds, hence the modulo.
 */
function charlotteHour(at: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).format(at);
  return Number(hour) % 24;
}

/**
 * The one sentence that carries the promise, sized to the clock.
 *
 * Inside opening hours the "during business hours" qualifier is dropped: we
 * already know it is business hours, so the plain promise is both shorter and
 * more honest. Outside them we name a time the customer can hold us to instead
 * of a window that has already closed.
 *
 * The dispatch number rides in the same sentence either way — someone who
 * submits at 2am and reads "by 9 AM" is exactly the person who might need to
 * reach a human now.
 */
export function callbackPromise(at: Date = new Date(), hasPrice = false): string {
  const hour = charlotteHour(at);
  const open = hour >= BUSINESS_OPEN_HOUR && hour < BUSINESS_CLOSE_HOUR;
  // When the price is already in the email, the call is only to confirm the details.
  const what = hasPrice ? 'to confirm the details' : 'to confirm the details and give you a price';

  return open
    ? `Someone will call or text you within 2 hours ${what} — if you need us sooner, call dispatch on ${DISPATCH_PHONE}.`
    : `Someone will call or text you by 9 AM ${what} — if you need us sooner, call dispatch on ${DISPATCH_PHONE}.`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Push
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HTTP header values are Latin-1. An em-dash in a Title header throws
 * "Header 'Title' has invalid value" and kills the whole leg — which is exactly
 * how the first escalation attempt failed in testing. The body is a UTF-8
 * request body and is unaffected, so only headers get folded.
 */
function asciiHeader(value: string): string {
  return value
    .replace(/[\u2010-\u2015]/g, '-')   // hyphens, en/em dashes
    .replace(/[\u2018\u2019]/g, "'")     // curly single quotes
    .replace(/[\u201C\u201D]/g, '"')     // curly double quotes
    .replace(/\u2026/g, '...')
    .replace(/\u00B7/g, '-')             // middle dot
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E]/g, '');       // anything still outside printable ASCII
}

type PushMessage = {
  title: string;
  body: string;
  priority?: 'default' | 'high' | 'urgent';
  tags?: string[];
};

/**
 * ntfy.sh — free, no account, no quota. The primary alert sink.
 * Throws if the topic is unset, so the caller records the leg as failed rather
 * than silently believing the operator was told.
 */
async function pushToNtfy(message: PushMessage): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) throw new Error('NTFY_TOPIC is not set');

  // Base URL is configurable so a self-hosted ntfy can be swapped in, and so a
  // test can point at an unroutable host to prove an unreachable push does not
  // fail the request.
  const base = (process.env.NTFY_BASE_URL || 'https://ntfy.sh').replace(/\/+$/, '');

  const res = await fetch(`${base}/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: {
      Title: asciiHeader(message.title),
      Click: opsUrl(),
      Priority: message.priority ?? 'default',
      ...(message.tags?.length ? { Tags: message.tags.join(',') } : {}),
    },
    body: message.body,
  });

  if (!res.ok) throw new Error(`ntfy responded ${res.status}`);
}

/**
 * Optional second sink, kept for later use.
 *
 * ABSENT-SAFE BY CONTRACT: when ZAPIER_SMS_WEBHOOK_URL is unset this resolves
 * without doing anything and without reporting a failure. Unset means "this
 * sink is not configured", which is not an error — nothing else changes.
 *
 * It receives the same PII-free payload as ntfy. A webhook URL is a private
 * endpoint, so personal data there would be defensible, but keeping one shape
 * means there is only one place to check when asking "what leaves the system?".
 */
async function pushToZapier(ref: string, message: PushMessage): Promise<'sent' | 'skipped'> {
  const url = process.env.ZAPIER_SMS_WEBHOOK_URL;
  if (!url) return 'skipped';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, title: message.title, body: message.body, click: opsUrl() }),
  });

  if (!res.ok) throw new Error(`Zapier responded ${res.status}`);
  return 'sent';
}

// ─────────────────────────────────────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────────────────────────────────────

async function sendResendEmail(payload: { to: string; subject: string; text: string; kind?: EmailKind }): Promise<void> {
  // Marketing / outreach is blocked until a mailing address is set (lib/marketing-guard.ts).
  assertEmailAllowed(payload.kind ?? 'transactional');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [payload.to], subject: payload.subject, text: payload.text }),
  });

  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

/**
 * Send one email with both an HTML part and a plain-text alternative.
 *
 * Exported because the confirmation email (lib/confirmation-email.ts) is HTML —
 * it is the document a customer screenshots and shows a front desk — while
 * everything in this file is deliberately plain text. Both parts are sent:
 * hospital mail systems strip HTML, and the pickup time has to survive that.
 *
 * Throws on failure. The caller decides whether that fails the operation, and
 * for a confirmation it should: a trip marked confirmed that the customer was
 * never told about is worse than an error the dispatcher can see and retry.
 */
export async function sendRichEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind?: EmailKind;
}): Promise<void> {
  assertEmailAllowed(payload.kind ?? 'transactional');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

/** Full detail to the operator's own mailbox, plain text. */
/**
 * Who a facility booking is for. Absent for every retail request, so the alert
 * for a normal customer is unchanged. Names the facility in the subject so a
 * dispatcher reading a lock-screen can tell a clinic's job from a walk-in.
 */
export type FacilityAlertContext = {
  facilityName: string;
  facilityRef?: string | null;
  payer?: string | null;
};

async function notifyOperatorEmail(
  id: string,
  data: TripRequestInput,
  facility?: FacilityAlertContext,
  priceUnavailable = false,
): Promise<void> {
  const to = process.env.OPERATOR_EMAIL;
  if (!to) throw new Error('OPERATOR_EMAIL is not set');

  const when = new Date(data.requestedAt);
  const datePart = Number.isNaN(when.getTime())
    ? data.requestedAt
    : when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
  const timePart = Number.isNaN(when.getTime())
    ? ''
    : when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

  const lines = [
    `Reference:         ${shortRef(id)}`,
    `Request ID:        ${id}`,
    `Service:           ${serviceShortName(data.serviceLine)}`,
    // Before anything else a dispatcher reads: this trip has no price on it.
    ...(priceUnavailable
      ? [`${NEEDS_PRICE_MARKER}      the system could not price this trip. Quote it before you confirm.`]
      : []),
    '',
    ...(facility
      ? [
          `Facility:          ${facility.facilityName}`,
          `Billed to:         ${facility.payer === 'facility' ? 'the facility, on account' : 'the passenger'}`,
          `Their reference:   ${facility.facilityRef || '—'}`,
          '',
        ]
      : []),
    `Name:              ${fullName(data)}`,
    `Phone:             ${data.contactPhone}`,
    `Email:             ${data.contactEmail || '—'}`,
    `Preferred contact: ${data.preferredContact}`,
    '',
    `Pickup:            ${data.pickupAddress}`,
    `Destination:       ${data.dropoffAddress}`,
    `Requested:         ${formatWhen(data.requestedAt)}`,
    `Return trip:       ${data.returnTrip ? `yes — ${formatWhen(data.returnAt ?? '')}` : 'no'}`,
    `Passengers:        ${data.passengers ?? 1}`,
    `Mobility:          ${mobilityLabel(data.mobility)}`,
    '',
    `Vehicle notes:     ${data.vehicleNotes || '—'}`,
    '',
    // Who or what is travelling. This is the block that decides which vehicle
    // and which driver, so it goes in the email a dispatcher reads on a phone
    // rather than only in the queue they have to log into.
    ...detailLines(data.serviceLine, data.tripDetails),
    `Quote and confirm here: ${opsUrl()}`,
  ];

  await sendResendEmail({
    to,
    subject: `${priceUnavailable ? `${NEEDS_PRICE_MARKER} ` : ''}NEW REQUEST — ${data.serviceLine} — ${datePart} ${timePart} — ${fullName(data)}${
      facility ? ` (${facility.facilityName}${facility.payer === 'facility' ? ', on account' : ''})` : ''
    }`,
    text: lines.join('\n'),
  });
}

/**
 * The per-service answers, as aligned plain-text lines, under a heading that
 * names the subject. Empty when the line asks nothing extra — in which case the
 * heading is omitted too, rather than printing "About your pet" over nothing.
 */
function detailLines(serviceLine: string, stored: unknown): string[] {
  const items = describeDetails(serviceLine, stored);
  if (items.length === 0) return [];
  const section = detailsFor(serviceLine);
  return [
    `${(section?.title ?? 'Trip details').toUpperCase()}`,
    ...items.map((item) => `  ${`${item.label}:`.padEnd(30)} ${item.value}`),
    '',
  ];
}

/**
 * The plain-text body of the auto-reply. Pure, so the wording can be tested without sending
 * mail. When there is no price AND the server could not compute one, it says so and says what
 * happens next, instead of staying silent about a price the form promised.
 */
export function buildRequesterText(args: {
  firstName: string;
  serviceLine: string;
  requestedAt: string;
  price?: QuotedPrice | null;
  priceUnavailable?: boolean;
  reference: string;
  at?: Date;
}): string {
  const { firstName, price, priceUnavailable } = args;
  return [
    `Hi ${firstName},`,
    '',
    `We have your ${serviceShortName(args.serviceLine)} request for ${formatWhen(args.requestedAt)}.`,
    'A dispatcher is reviewing it now.',
    '',
    ...(price
      ? priceKind(price) === 'range'
        ? // A range is never "your price". One sentence, the same words as the confirmation screen.
          [`Estimated price ${price.text}. ${PRICE_RANGE_NOTE}`, '']
        : [
            `${priceKind(price) === 'firm' ? 'Your price' : 'Estimated price'}: ${price.text}`,
            priceKind(price) === 'firm'
              ? 'That is the price you saw when you booked. If anything about the trip changes, we tell you the new price before you agree to anything.'
              : 'That is an estimate from the ZIP codes you entered. We confirm the exact price with you before anything is booked.',
            '',
          ]
      : priceUnavailable
        ? [PRICE_PENDING_MESSAGE, '']
        : []),
    callbackPromise(args.at ?? new Date(), Boolean(price)),
    'Nothing is booked and nothing is charged until you agree to the price.',
    '',
    '— Tassy Transportation',
    `Reference: ${args.reference}`,
    '',
    ...emailFooterText(),
  ].join('\n');
}

/**
 * Auto-reply to the requester. ~70 words.
 *
 * It confirms what they asked for so they know a person read it, states the
 * callback window the /request page already commits to, gives the dispatch
 * number, and says pricing is quoted first. The callback promise is sized to
 * the clock (see callbackPromise). It asserts nothing about tracking, and it
 * carries no marketing language.
 */
async function notifyRequester(
  id: string,
  data: TripRequestInput,
  tripNumber?: string | null,
  price?: QuotedPrice | null,
  priceUnavailable = false,
): Promise<void> {
  if (!data.contactEmail) return; // email is optional; nothing to reply to

  // The form collects the given name directly now, so the greeting no longer
  // guesses by splitting a full name on whitespace - which pulled "Van" out of
  // "Van Nguyen" for anyone whose family name is written first.
  const firstName = data.contactFirstName.trim() || 'there';

  const text = buildRequesterText({
    firstName,
    serviceLine: data.serviceLine,
    requestedAt: data.requestedAt,
    price,
    priceUnavailable,
    reference: tripNumber ?? shortRef(id),
  });

  await sendResendEmail({
    to: data.contactEmail,
    subject: `We have your request — ref ${tripNumber ?? shortRef(id)}`,
    text,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration
// ─────────────────────────────────────────────────────────────────────────────

export type LegOutcome = 'sent' | 'failed' | 'skipped';

/** The price the visitor was shown, recomputed on the server. `exact` is false for a ZIP-only estimate. */
export type QuotedPrice = { text: string; exact: boolean; range?: boolean };

export type NotificationOutcome = {
  push: LegOutcome;
  pushFallback: LegOutcome;
  operatorEmail: LegOutcome;
  requesterEmail: LegOutcome;
};

async function runLeg(id: string, label: string, fn: () => Promise<LegOutcome | void>): Promise<LegOutcome> {
  try {
    const result = await fn();
    return result === 'skipped' ? 'skipped' : 'sent';
  } catch (err) {
    console.error(
      `[trip-request ${id}] notification "${label}" failed:`,
      err instanceof Error ? err.message : err,
    );
    return 'failed';
  }
}

/**
 * Fires every leg concurrently. Always resolves — never throws, never rejects.
 * The caller returns 200 regardless of what happened here.
 */
export async function fireNotifications(
  id: string,
  data: TripRequestInput,
  tripNumber?: string | null,
  facility?: FacilityAlertContext,
  price?: QuotedPrice | null,
  priceUnavailable = false,
): Promise<NotificationOutcome> {
  const ref = shortRef(id);
  const message: PushMessage = {
    title: `New ${serviceShortName(data.serviceLine)} request`,
    body: `Ref ${ref} · pickup ${shortWhen(data.requestedAt)}${priceUnavailable ? ' · NEEDS PRICE' : ''}`,
    tags: ['bell'],
  };

  const [push, pushFallback, operatorEmail, requesterEmail] = await Promise.all([
    runLeg(id, 'ntfy', () => pushToNtfy(message)),
    runLeg(id, 'zapier', () => pushToZapier(ref, message)),
    runLeg(id, 'operator-email', () => notifyOperatorEmail(id, data, facility, priceUnavailable)),
    data.contactEmail
      ? runLeg(id, 'requester-autoreply', () => notifyRequester(id, data, tripNumber, price, priceUnavailable))
      : Promise.resolve<LegOutcome>('skipped'),
  ]);

  return { push, pushFallback, operatorEmail, requesterEmail };
}

/**
 * Speed-to-lead escalation: a SECOND operator alert for a request still
 * untouched well past the window the auto-reply promised.
 *
 * Operator-only by design. The customer already got one auto-reply; a second
 * message telling them we have not managed it yet makes the silence worse.
 *
 * Throws if EVERY configured sink fails, so the caller leaves `escalated_at`
 * NULL and retries next run. An alert that never sent must not be recorded as
 * sent.
 */
export async function notifyOperatorUrgent(row: { id: string }): Promise<void> {
  const ref = shortRef(row.id);
  const message: PushMessage = {
    title: 'URGENT - request unanswered 90 min',
    body: `Ref ${ref}`,
    priority: 'urgent',
    tags: ['rotating_light'],
  };

  const results = await Promise.allSettled([pushToNtfy(message), pushToZapier(ref, message)]);

  const delivered = results.some(
    (r) => r.status === 'fulfilled' && r.value !== 'skipped',
  );

  if (!delivered) {
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
      .join('; ');
    throw new Error(`no escalation sink delivered${reasons ? `: ${reasons}` : ''}`);
  }
}

/**
 * A facility signed up. Tell the operator — because nothing else does.
 *
 * WHY THIS HAD TO EXIST. /api/facility-signup wrote the account, minted a
 * magic link and emailed the coordinator, and told Phil nothing at all. But a
 * new facility lands in `pending` and CANNOT book until it is approved by
 * hand. So a real clinic could sign up, open its link, reach the welcome
 * screen, and sit there forever — while the one person able to approve it did
 * not know it existed. The dead facility door again, one step further along:
 * the row is now in the right table, and nobody is told to open it.
 *
 * `emailSent: false` is the louder case. The account is saved but the
 * coordinator never got a link, so the follow-up has to come from our side.
 *
 * NEVER THROWS. Its caller has already stored the signup and answered 200; an
 * alert that cannot send must not turn a captured account into a 500 and a
 * clinic that fills the form in twice.
 *
 * PII RULE — see the header. The push carries the business name and nothing
 * about a person: no coordinator name, no email, no phone. Those are in the
 * operator email, which is a mailbox rather than a lock-screen.
 */
export async function notifyOperatorFacilitySignup(input: {
  facilityId: string;
  facilityName: string;
  kind: string;
  contactEmail: string;
  created: boolean;
  emailSent: boolean;
}): Promise<void> {
  const ref = shortRef(input.facilityId);
  const message: PushMessage = input.emailSent
    ? {
        title: 'NEW FACILITY - approve to let them book',
        body: `${input.facilityName} (${input.kind}) - ref ${ref}`,
        priority: 'high',
        tags: ['hospital'],
      }
    : {
        title: 'NEW FACILITY - link did NOT send, call them',
        body: `${input.facilityName} (${input.kind}) - ref ${ref}`,
        priority: 'urgent',
        tags: ['rotating_light'],
      };

  const lines = [
    input.emailSent
      ? 'A facility signed up and has its sign-in link.'
      : 'A facility signed up but the sign-in link DID NOT SEND. Call them — their account is saved, so do not ask them to fill the form in again.',
    '',
    `Facility:  ${input.facilityName}`,
    `Type:      ${input.kind}`,
    `Contact:   ${input.contactEmail}`,
    `Reference: ${ref}`,
    `Record:    ${input.created ? 'new account' : 'existing account, re-submitted'}`,
    '',
    'They are PENDING and cannot book until approved.',
    // Approval lives in TassyOps, not in this site's /ops (which has no facility screens).
    `Approve:   ${SAAS_BASE}/ops/facilities/${input.facilityId}`,
  ].join('\n');

  const results = await Promise.allSettled([
    pushToNtfy(message),
    pushToZapier(ref, message),
    sendResendEmail({
      to: process.env.OPERATOR_EMAIL ?? '',
      subject: input.emailSent
        ? `New facility: ${input.facilityName} — approve to let them book`
        : `New facility: ${input.facilityName} — SIGN-IN LINK FAILED, call them`,
      text: lines,
    }),
  ]);

  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[facility-signup] alert leg failed for', ref, r.reason);
    }
  }
}

/**
 * A family sent a Custom Household Request. Tell the operator.
 *
 * Never throws -- the row is already stored and an alert is only an alert.
 * PII RULE: the push carries the reference and the number of children only.
 * The email goes to OPERATOR_EMAIL (a mailbox we control) and carries detail.
 *
 * There is deliberately NO message to the family from here. The confirmation
 * on screen is the acknowledgement; a follow-up email or text is a person's
 * job once the request has been read, and sending one automatically would
 * promise a response time nobody has agreed to.
 */
export async function notifyOperatorHouseholdRequest(input: {
  id: string;
  guardianName: string;
  email: string;
  phone: string;
  childCount: number;
  reasons: string[];
  desiredStart: string;
}): Promise<void> {
  const ref = shortRef(input.id);
  const message: PushMessage = {
    title: 'NEW SCHOOL HOUSEHOLD REQUEST - review, do not quote yet',
    body: `${input.childCount} child${input.childCount === 1 ? '' : 'ren'} - ref ${ref}`,
    priority: 'high',
    tags: ['school_satchel'],
  };

  const lines = [
    'A family sent a Custom Household Request. It is PENDING REVIEW.',
    'Nothing was booked, charged or promised: no reservation, no subscription, no price, no driver, no start date.',
    '',
    `Guardian:  ${input.guardianName}`,
    `Email:     ${input.email}`,
    `Mobile:    ${input.phone}`,
    `Children:  ${input.childCount}`,
    `Why here:  ${input.reasons.length ? input.reasons.join(', ') : 'chose the custom request directly'}`,
    `Wants:     start around ${input.desiredStart}`,
    `Reference: ${ref}`,
    '',
    'Bell times are not in the database -- check school start/dismissal by hand before offering a plan.',
    `Review:    ${opsUrl()}`,
  ].join('\n');

  const results = await Promise.allSettled([
    pushToNtfy(message),
    pushToZapier(ref, message),
    sendResendEmail({
      to: process.env.OPERATOR_EMAIL ?? '',
      subject: `School household request (${input.childCount} child${input.childCount === 1 ? '' : 'ren'}) - pending review`,
      text: lines,
    }),
  ]);

  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[household-request] alert leg failed for', ref, r.reason);
    }
  }
}

/**
 * The money arrived. Tell the operator.
 *
 * Deliberately UNLIKE notifyOperatorUrgent: this NEVER throws. Its caller is
 * the Stripe webhook, and a non-2xx there makes Stripe retry a payment we have
 * already stored. A dead push service must not turn a recorded payment into a
 * replayed one.
 *
 * PII RULE applies — see the header. Ref only. No name, no amount, no address.
 */
export async function notifyOperatorPaid(row: { id: string }): Promise<void> {
  const ref = shortRef(row.id);
  const message: PushMessage = {
    title: 'PAID - ready to assign',
    body: `Ref ${ref}`,
    priority: 'high',
    tags: ['moneybag'],
  };

  const results = await Promise.allSettled([pushToNtfy(message), pushToZapier(ref, message)]);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[stripe] paid alert leg failed for', ref, r.reason);
    }
  }
}

/**
 * Stripe collected an amount that does not match the payment link we issued (or the link was
 * already replaced). The trip is NOT marked paid; someone must look. NEVER throws (webhook caller).
 * PII RULE: ref only, no name, no amount.
 */
export async function notifyOperatorPaymentMismatch(row: { id: string }, kind: string): Promise<void> {
  const ref = shortRef(row.id);
  const message: PushMessage = {
    title: 'PAYMENT NEEDS A LOOK - not marked paid',
    body: `Ref ${ref} - ${kind}. Open Stripe and the trip.`,
    priority: 'urgent',
    tags: ['warning'],
  };
  const results = await Promise.allSettled([pushToNtfy(message), pushToZapier(ref, message)]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[stripe] mismatch alert leg failed for', ref, r.reason);
  }
}

function dollars(cents: number | null | undefined, currency?: string | null): string {
  if (typeof cents !== 'number') return 'unknown';
  return `$${(cents / 100).toFixed(2)}${currency && currency.toLowerCase() !== 'usd' ? ` ${currency.toUpperCase()}` : ''}`;
}

/**
 * A second Stripe checkout completed for a trip that was already paid: the customer may have been
 * charged twice. The trip stays paid and NOTHING is refunded automatically - a person checks Stripe.
 * Push carries the reference only (PII RULE above); the full detail - trip number, amounts and both
 * Stripe ids - goes to OPERATOR_EMAIL, a mailbox we control. NEVER throws (webhook caller).
 */
export async function notifyOperatorPossibleDoublePayment(info: {
  tripId: string;
  tripNumber: string | null;
  tripAmountCents: number | null;
  first: { sessionId: string | null; paymentIntentId: string | null; amountCents: number | null } | null;
  second: { sessionId: string | null; paymentIntentId: string | null; amountCents: number | null; currency: string | null };
  verified: boolean;
}): Promise<void> {
  const ref = shortRef(info.tripId);
  const trip = info.tripNumber ?? ref;
  const message: PushMessage = {
    title: 'POSSIBLE DOUBLE PAYMENT - check Stripe',
    body: `Ref ${ref} - a second payment arrived for a trip already paid. Details in your email.`,
    priority: 'urgent',
    tags: ['warning'],
  };
  const text = [
    `POSSIBLE DOUBLE PAYMENT - trip ${trip}`,
    '',
    'A second Stripe checkout completed for a trip that was already marked paid.',
    'The customer may have been charged twice. Nothing has been refunded automatically.',
    info.verified
      ? 'The two payments have different Stripe ids.'
      : 'The first payment has no Stripe id on file (it was recorded before ids were kept), so this could also be a repeat delivery of the original payment. Check Stripe to be sure.',
    '',
    `Trip number:        ${trip}`,
    `Request ID:         ${info.tripId}`,
    `Trip price:         ${dollars(info.tripAmountCents)}`,
    '',
    `First payment:      ${dollars(info.first?.amountCents)}`,
    `  checkout session: ${info.first?.sessionId ?? 'not recorded'}`,
    `  payment intent:   ${info.first?.paymentIntentId ?? 'not recorded'}`,
    '',
    `Second payment:     ${dollars(info.second.amountCents, info.second.currency)}`,
    `  checkout session: ${info.second.sessionId ?? 'not available'}`,
    `  payment intent:   ${info.second.paymentIntentId ?? 'not available'}`,
    '',
    'Next step: open both payments in the Stripe dashboard. If the customer really paid twice, refund the second one there.',
  ].join('\n');

  const operator = process.env.OPERATOR_EMAIL;
  const results = await Promise.allSettled([
    pushToNtfy(message),
    pushToZapier(ref, message),
    operator
      ? sendResendEmail({ to: operator, subject: `POSSIBLE DOUBLE PAYMENT - trip ${trip}`, text })
      : Promise.reject(new Error('OPERATOR_EMAIL is not set')),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[stripe] double-payment alert leg failed for', ref, r.reason);
  }
}

/**
 * Scholar monthly billing needs a person: a family's payment failed, or a subscription ended.
 * Push only (same legs as the payment-mismatch alert). PII RULE: ref only, no name, no amount.
 */
export async function notifyOperatorScholarBilling(
  standingOrderId: string,
  kind: 'past_due' | 'canceled',
): Promise<void> {
  const ref = shortRef(standingOrderId);
  const message: PushMessage =
    kind === 'past_due'
      ? {
          title: 'SCHOLAR PAYMENT FAILED',
          body: `Plan ${ref} is past due. Stripe is retrying. Rides pause after 7 days unpaid - see TassyOps Scholar.`,
          priority: 'urgent',
          tags: ['warning'],
        }
      : {
          title: 'Scholar plan ended',
          body: `Plan ${ref} was cancelled and billing has stopped. See TassyOps Scholar.`,
          priority: 'default',
          tags: ['information_source'],
        };
  const results = await Promise.allSettled([pushToNtfy(message), pushToZapier(ref, message)]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[stripe] scholar billing alert leg failed for', ref, r.reason);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Privacy requests (access / correct / delete / stop messages)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tell the operator about a privacy request, and give the requester a receipt.
 *
 * The OPERATOR leg THROWS on failure: until the privacy_requests table exists this email is the
 * only record, so the route must not tell a visitor "received" when it was not. The requester
 * leg is best effort (they may have given only a phone number). Nothing here changes any data.
 */
export async function sendPrivacyRequestEmails(input: {
  reference: string;
  name: string;
  email: string;
  phone: string;
  typeLabel: string;
  details: string;
  responseDays: number;
  identityLine: string;
}): Promise<void> {
  const operator = process.env.OPERATOR_EMAIL;
  if (!operator) throw new Error('OPERATOR_EMAIL is not set');

  await sendResendEmail({
    to: operator,
    subject: `PRIVACY REQUEST ${input.reference} — ${input.typeLabel}`,
    text: [
      `A privacy request came in on the website. Reference ${input.reference}.`,
      '',
      `Asking to:  ${input.typeLabel}`,
      `Name:       ${input.name}`,
      `Email:      ${input.email || '(none given)'}`,
      `Phone:      ${input.phone || '(none given)'}`,
      `Details:    ${input.details || '(none)'}`,
      '',
      `We told them we would reply within ${input.responseDays} days.`,
      'BEFORE ACTING: check the person really is the data subject (ask something only they would know).',
      'Nothing has been deleted or changed. Do not delete anything automatically.',
    ].join('\n'),
  });

  if (!input.email) return;
  try {
    await sendResendEmail({
      to: input.email,
      subject: `We received your privacy request — reference ${input.reference}`,
      text: [
        `Hello ${input.name},`,
        '',
        `We received your request: ${input.typeLabel}.`,
        `Your reference number is ${input.reference}. Please keep it.`,
        '',
        `We aim to reply within ${input.responseDays} days. Before we change or share anything, we will check that you are the person the information is about, which may mean asking you a question only you could answer.`,
        'Nothing has been changed or deleted yet.',
        '',
        'If you did not make this request, you can ignore this email.',
        '',
        input.identityLine,
      ].join('\n'),
    });
  } catch (err) {
    console.error('[privacy-request] receipt email failed for', input.reference, err instanceof Error ? err.message : err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Marketing / outreach email (none is sent from this repo today)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The ONLY way marketing, prospecting or outreach email may be sent. It refuses unless ALL of these hold:
 *   1. a business mailing address is set (lib/business.ts: BUSINESS_MAILING_ADDRESS, empty by default),
 *   2. a signed one-click unsubscribe link can be made (UNSUBSCRIBE_SECRET is set),
 *   3. the do-not-email list is available and the address is NOT on it.
 * Every message carries the postal address and the unsubscribe link in its body, List-Unsubscribe
 * headers for one-click, and an honest sender (FROM_ADDRESS) and subject. Throws EmailBlockedError
 * (or SuppressionUnavailableError) when a rule fails; nothing is sent.
 *
 * `deps` exists so tests can run the checks without a database or a network.
 */
export async function sendMarketingEmail(
  payload: { to: string; subject: string; text: string },
  deps: {
    mailingAddress?: string;
    isSuppressed?: (email: string) => Promise<boolean>;
    unsubscribeUrl?: (email: string) => string;
  } = {},
): Promise<void> {
  const makeUrl = deps.unsubscribeUrl ?? ((e: string) => unsubscribeUrl(e));
  let url: string | null = null;
  try {
    url = makeUrl(payload.to);
  } catch {
    url = null; // no UNSUBSCRIBE_SECRET: assertEmailAllowed below refuses
  }
  assertEmailAllowed('marketing', { mailingAddress: deps.mailingAddress, unsubscribeUrl: url });

  const suppressed = await (deps.isSuppressed ?? isSuppressed)(payload.to);
  if (suppressed) throw new EmailBlockedError('this address has unsubscribed');

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  const address = (deps.mailingAddress ?? BUSINESS_MAILING_ADDRESS).trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [payload.to],
      subject: payload.subject,
      text: [
        payload.text,
        '',
        '—',
        `${emailIdentityText()} · ${address}`,
        `Unsubscribe: ${url}`,
      ].join('\n'),
      headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text().catch(() => '')}`);
}

/** Until the do-not-email table exists, an unsubscribe is handled by hand: tell the operator. Throws on failure. */
export async function notifyOperatorUnsubscribe(email: string): Promise<void> {
  const operator = process.env.OPERATOR_EMAIL;
  if (!operator) throw new Error('OPERATOR_EMAIL is not set');
  await sendResendEmail({
    to: operator,
    subject: 'UNSUBSCRIBE — add to the do-not-email list',
    text: `${email} used the unsubscribe link. Add this address to the do-not-email list now (the table is not set up yet, so this email is the record). Never send marketing or outreach email to it again.`,
  });
}
