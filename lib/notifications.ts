import {
  fullName,
  mobilityLabel,
  serviceShortName,
  shortRef,
  type TripRequestInput,
} from './trip-request';
import { describeDetails, detailsFor } from './trip-details';

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
 * The form now takes requests around the clock, so "within 2 hours" stopped
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
export function callbackPromise(at: Date = new Date()): string {
  const hour = charlotteHour(at);
  const open = hour >= BUSINESS_OPEN_HOUR && hour < BUSINESS_CLOSE_HOUR;

  return open
    ? `Someone will call or text you within 2 hours to confirm the details and give you a price — if you need us sooner, call dispatch on ${DISPATCH_PHONE}.`
    : `Someone will call or text you by 9 AM to confirm the details and give you a price — if you need us sooner, call dispatch on ${DISPATCH_PHONE}.`;
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

async function sendResendEmail(payload: { to: string; subject: string; text: string }): Promise<void> {
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
}): Promise<void> {
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
async function notifyOperatorEmail(id: string, data: TripRequestInput): Promise<void> {
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
    '',
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
    subject: `NEW REQUEST — ${data.serviceLine} — ${datePart} ${timePart} — ${fullName(data)}`,
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
 * Auto-reply to the requester. ~70 words.
 *
 * It confirms what they asked for so they know a person read it, states the
 * callback window the /request page already commits to, gives the dispatch
 * number, and says pricing is quoted first. The callback promise is sized to
 * the clock (see callbackPromise). It asserts nothing about tracking, and it
 * carries no marketing language.
 */
async function notifyRequester(id: string, data: TripRequestInput): Promise<void> {
  if (!data.contactEmail) return; // email is optional; nothing to reply to

  // The form collects the given name directly now, so the greeting no longer
  // guesses by splitting a full name on whitespace - which pulled "Van" out of
  // "Van Nguyen" for anyone whose family name is written first.
  const firstName = data.contactFirstName.trim() || 'there';

  const text = [
    `Hi ${firstName},`,
    '',
    `We have your ${serviceShortName(data.serviceLine)} request for ${formatWhen(data.requestedAt)}.`,
    'A dispatcher is reviewing it now.',
    '',
    callbackPromise(),
    'Nothing is booked and nothing is charged until you agree to that price.',
    '',
    '— Tassy Transportation',
    `Reference: ${shortRef(id)}`,
  ].join('\n');

  await sendResendEmail({
    to: data.contactEmail,
    subject: `We have your request — ref ${shortRef(id)}`,
    text,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration
// ─────────────────────────────────────────────────────────────────────────────

export type LegOutcome = 'sent' | 'failed' | 'skipped';

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
export async function fireNotifications(id: string, data: TripRequestInput): Promise<NotificationOutcome> {
  const ref = shortRef(id);
  const message: PushMessage = {
    title: `New ${serviceShortName(data.serviceLine)} request`,
    body: `Ref ${ref} · pickup ${shortWhen(data.requestedAt)}`,
    tags: ['bell'],
  };

  const [push, pushFallback, operatorEmail, requesterEmail] = await Promise.all([
    runLeg(id, 'ntfy', () => pushToNtfy(message)),
    runLeg(id, 'zapier', () => pushToZapier(ref, message)),
    runLeg(id, 'operator-email', () => notifyOperatorEmail(id, data)),
    data.contactEmail
      ? runLeg(id, 'requester-autoreply', () => notifyRequester(id, data))
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
