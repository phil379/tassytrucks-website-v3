import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Stripe, over the raw HTTP API.
 *
 * No SDK on purpose. Two endpoints are used and one signature is verified;
 * a dependency that ships a hundred resources to do that is weight in every
 * serverless cold start, and a package that reads process.env.STRIPE_SECRET_KEY
 * on import is a thing to keep out of a marketing site's bundle graph.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY A PAYMENT LINK RATHER THAN A CHECKOUT SESSION
 *
 * A Checkout Session expires — 24 hours at the outside. A ride booked on
 * Tuesday for the following Monday would hand the customer a dead link, and
 * the first they would know of it is standing in a hospital corridor. A
 * Payment Link does not expire, survives being forwarded to the daughter who
 * is actually paying, and can be resent from the ops queue unchanged.
 *
 * WHY NOT AT REQUEST TIME. The /request page says the figure is an estimate
 * and a dispatcher confirms the price. Charging before that contradicts it in
 * writing, and every correction becomes a refund.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The secret key is read from the environment and never logged, never returned
 * and never sent to the browser. Everything in this file runs server-side.
 */

const API = 'https://api.stripe.com/v1';
const TIMEOUT_MS = 10_000;

/** Reject a replayed webhook older than this. Stripe's own recommendation. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

type FormValue = string | number | undefined | null;

/** Stripe's API is form-encoded, including its bracketed nested keys. */
function encode(fields: Record<string, FormValue>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    body.set(key, String(value));
  }
  return body.toString();
}

async function post<T>(path: string, fields: Record<string, FormValue>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set on this deployment');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: encode(fields),
    });

    const json = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      // Stripe's message is safe to surface to an operator; the key is not in
      // it. Do NOT include the request body — it carries the customer's name.
      const message =
        (json.error as { message?: string } | undefined)?.message ?? `HTTP ${response.status}`;
      throw new Error(`Stripe: ${message}`);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

export type PaymentLink = { id: string; url: string };

/**
 * A payment link for one confirmed trip.
 *
 * The description is what the customer sees on the Stripe page and on their
 * card statement line, so it names the service and the confirmation code —
 * "Tassy Recovery · TT-4K7M2Q" — and nothing else. No address, no passenger
 * name, no mention of a procedure or a facility. A card statement is read by
 * whoever opens the mail.
 */
export async function createTripPaymentLink(input: {
  amountCents: number;
  serviceName: string;
  confirmationCode: string;
  tripRequestId: string;
}): Promise<PaymentLink> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50) {
    throw new Error('A payment link needs a whole amount of at least $0.50');
  }

  const price = await post<{ id: string }>('/prices', {
    currency: 'usd',
    unit_amount: input.amountCents,
    'product_data[name]': `${input.serviceName} · ${input.confirmationCode}`,
  });

  return post<PaymentLink>('/payment_links', {
    'line_items[0][price]': price.id,
    'line_items[0][quantity]': 1,
    // Read back by the webhook. Stripe copies a payment link's metadata onto
    // the Checkout Session it creates, and the link id is matched as a fallback
    // in case that ever stops being true.
    'metadata[trip_request_id]': input.tripRequestId,
    'metadata[confirmation_code]': input.confirmationCode,
    'after_completion[type]': 'hosted_confirmation',
    'after_completion[hosted_confirmation][custom_message]':
      `Thank you — your trip is paid. Keep ${input.confirmationCode} handy; ` +
      'quote it to dispatch on (704) 941-8508 and we will have your trip on screen.',
  });
}

/**
 * Verify a Stripe webhook signature by hand.
 *
 * Three checks, and skipping any one of them makes the endpoint a way for a
 * stranger to mark trips paid:
 *   1. the signature is a real HMAC-SHA256 of `${timestamp}.${rawBody}` under
 *      the endpoint's signing secret;
 *   2. the comparison is timing-safe;
 *   3. the timestamp is recent, so a captured request cannot be replayed.
 *
 * The RAW body must be passed, byte for byte. Parse it to JSON only after this
 * returns true — re-serializing changes the bytes and the signature will not
 * match.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !signatureHeader) return false;

  let timestamp = '';
  const candidates: string[] = [];
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.trim().split('=');
    if (k === 't' && v) timestamp = v;
    if (k === 'v1' && v) candidates.push(v);
  }
  if (!timestamp || candidates.length === 0) return false;

  const age = nowSeconds - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  return candidates.some((candidate) => {
    const candidateBuf = Buffer.from(candidate, 'utf8');
    if (candidateBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(candidateBuf, expectedBuf);
  });
}
