import { serviceLabel, type TripRequestInput } from './trip-request';

/**
 * Three alerts fire after a request is stored. Each is independent and each
 * swallows its own failure.
 *
 * The row is the system of record. An alert is an alert — a dead Zapier hook or
 * a Resend outage must never turn a captured request into a lost one. Every
 * failure is logged with the request id so nothing disappears silently.
 */

const DISPATCH_PHONE = '(704) 941-8508';
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Tassy Transportation <dispatch@tassytrucks.com>';

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

async function sendResendEmail(payload: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

/** 1 — compact JSON to Zapier, which owns the SMS leg. */
async function notifyOperatorSms(id: string, data: TripRequestInput): Promise<void> {
  const url = process.env.ZAPIER_SMS_WEBHOOK_URL;
  if (!url) throw new Error('ZAPIER_SMS_WEBHOOK_URL is not set');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      service: data.serviceLine,
      name: data.contactName,
      phone: data.contactPhone,
      pickup: data.pickupAddress,
      dropoff: data.dropoffAddress,
      when: data.requestedAt,
      return: data.returnTrip ? 'y' : 'n',
    }),
  });

  if (!res.ok) throw new Error(`Zapier responded ${res.status}`);
}

/** 2 — full detail to the operator, plain text. */
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
    `Request ID:        ${id}`,
    `Service:           ${serviceLabel(data.serviceLine)}`,
    '',
    `Name:              ${data.contactName}`,
    `Phone:             ${data.contactPhone}`,
    `Email:             ${data.contactEmail || '—'}`,
    `Preferred contact: ${data.preferredContact}`,
    '',
    `Pickup:            ${data.pickupAddress}`,
    `Destination:       ${data.dropoffAddress}`,
    `Requested:         ${formatWhen(data.requestedAt)}`,
    `Return trip:       ${data.returnTrip ? `yes — ${formatWhen(data.returnAt ?? '')}` : 'no'}`,
    `Passengers:        ${data.passengers ?? 1}`,
    `Mobility:          ${data.mobility || '—'}`,
    '',
    `Vehicle notes:     ${data.vehicleNotes || '—'}`,
    '',
    '— Open the ops queue at /ops to quote and confirm.',
  ];

  await sendResendEmail({
    to,
    subject: `NEW REQUEST — ${data.serviceLine} — ${datePart} ${timePart} — ${data.contactName}`,
    text: lines.join('\n'),
  });
}

/**
 * 3 — auto-reply to the requester. Under 80 words, no medical language, and
 * none of "instant", "guaranteed", "tracked", or "24/7" — we do not promise
 * what the business cannot keep.
 */
async function notifyRequester(id: string, data: TripRequestInput): Promise<void> {
  if (!data.contactEmail) return; // email is optional; nothing to reply to

  const text = [
    `Hi ${data.contactName.split(' ')[0]},`,
    '',
    "We have your ride request and a dispatcher is reviewing it now.",
    '',
    'Someone will reach out by phone or text within 2 hours during business hours to',
    'confirm the details. Pricing is quoted before your trip is confirmed — you will',
    'not be charged until you agree to the quote.',
    '',
    `Need us sooner? Call ${DISPATCH_PHONE}.`,
    '',
    '— Tassy Transportation',
    `Reference: ${id}`,
  ].join('\n');

  await sendResendEmail({
    to: data.contactEmail,
    subject: 'We received your ride request',
    text,
  });
}

/**
 * Speed-to-lead escalation: a SECOND operator SMS for a request that is still
 * untouched well past the window the auto-reply promised.
 *
 * Deliberately operator-only. The customer already got one auto-reply saying
 * someone would be in touch within 2 hours; a second message telling them we
 * have not managed it yet would make the silence worse, not better. This pages
 * the operator and nobody else.
 *
 * Throws on failure so the caller can leave `escalated_at` NULL and retry on
 * the next run — an SMS that never sent must not be recorded as sent.
 */
export async function notifyOperatorUrgent(row: {
  id: string;
  service_line: string;
  contact_name: string;
  contact_phone: string;
  pickup_address: string;
  dropoff_address: string;
  requested_at: string;
  return_trip: boolean;
  created_at: string;
}): Promise<void> {
  const url = process.env.ZAPIER_SMS_WEBHOOK_URL;
  if (!url) throw new Error('ZAPIER_SMS_WEBHOOK_URL is not set');

  const waitingMinutes = Math.floor((Date.now() - Date.parse(row.created_at)) / 60000);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: row.id,
      urgent: true,
      reason: 'still_new',
      waiting_minutes: waitingMinutes,
      service: row.service_line,
      name: row.contact_name,
      phone: row.contact_phone,
      pickup: row.pickup_address,
      dropoff: row.dropoff_address,
      when: row.requested_at,
      return: row.return_trip ? 'y' : 'n',
    }),
  });

  if (!res.ok) throw new Error(`Zapier responded ${res.status}`);
}

export type NotificationOutcome = {
  operatorSms: 'sent' | 'failed' | 'skipped';
  operatorEmail: 'sent' | 'failed' | 'skipped';
  requesterEmail: 'sent' | 'failed' | 'skipped';
};

/**
 * Fires all three concurrently. Always resolves — never throws, never rejects.
 * The caller returns 200 regardless of what happened here.
 */
export async function fireNotifications(id: string, data: TripRequestInput): Promise<NotificationOutcome> {
  const run = async (
    label: string,
    fn: () => Promise<void>,
  ): Promise<'sent' | 'failed'> => {
    try {
      await fn();
      return 'sent';
    } catch (err) {
      // Logged, never rethrown. The request is already stored.
      console.error(
        `[trip-request ${id}] notification "${label}" failed:`,
        err instanceof Error ? err.message : err,
      );
      return 'failed';
    }
  };

  const [operatorSms, operatorEmail, requesterEmail] = await Promise.all([
    run('operator-sms', () => notifyOperatorSms(id, data)),
    run('operator-email', () => notifyOperatorEmail(id, data)),
    data.contactEmail
      ? run('requester-autoreply', () => notifyRequester(id, data))
      : Promise.resolve<'skipped'>('skipped'),
  ]);

  return { operatorSms, operatorEmail, requesterEmail };
}
