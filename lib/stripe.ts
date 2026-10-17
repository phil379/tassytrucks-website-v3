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

async function post<T>(
  path: string,
  fields: Record<string, FormValue>,
  extraHeaders?: Record<string, string>,
): Promise<T> {
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
        ...extraHeaders,
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

async function get<T>(path: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set on this deployment');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (json.error as { message?: string } | undefined)?.message ?? `HTTP ${response.status}`;
      throw new Error(`Stripe: ${message}`);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The seeded catalog (scripts/seed-stripe-catalog.ts) creates one Product per
 * service line, tagged `business=tassy-transport`. Connecting each trip's charge
 * to its Product means Stripe reports revenue by line instead of as hundreds of
 * one-off products, and keeps the three businesses on this one account cleanly
 * separated by the `business` tag.
 */
const STRIPE_BUSINESS = 'tassy-transport';
const CATALOG_KEY_META = 'tassy_catalog_key';

/** A trip's `service_line` value → the seeded catalog key. */
function catalogKeyForLine(serviceLine: string | null | undefined): string | null {
  switch (serviceLine) {
    case 'care':
      return 'care';
    case 'recovery':
      return 'recovery';
    case 'concierge':
      return 'concierge';
    case 'winnie':
    case 'pet':
      return 'winnie';
    case 'scholar':
      return 'scholar';
    // care_wav is chosen by passenger mobility upstream, not by service_line, so
    // it falls through to the inline-product fallback. Unknown lines too.
    default:
      return null;
  }
}

/**
 * Resolve the seeded Product id for a catalog key, cached for the lambda's life.
 * Stripe cannot filter a product list by metadata, so this lists once and matches
 * client-side. Returns null when the catalog has not been seeded yet — the caller
 * then falls back to an inline product, so payments never block on the seed.
 */
const productIdCache = new Map<string, string | null>();
async function seededProductId(catalogKey: string): Promise<string | null> {
  const cached = productIdCache.get(catalogKey);
  if (cached !== undefined) return cached;
  const list = await get<{ data: Array<{ id: string; metadata?: Record<string, string> }> }>(
    '/products?limit=100&active=true',
  );
  let found: string | null = null;
  for (const p of list.data) {
    if (p.metadata?.business === STRIPE_BUSINESS && p.metadata?.[CATALOG_KEY_META] === catalogKey) {
      found = p.id;
      break;
    }
  }
  productIdCache.set(catalogKey, found);
  return found;
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
  /** The trip's service_line, used to connect the charge to the seeded Product. */
  serviceLine?: string | null;
  /**
   * The private receipt page (https://…/r/<token>). When given, Stripe sends the customer there the
   * moment they pay instead of showing its own generic thank-you.
   */
  receiptUrl?: string | null;
}): Promise<PaymentLink> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50) {
    throw new Error('A payment link needs a whole amount of at least $0.50');
  }

  // Connect the charge to the seeded service-line Product when the catalog has
  // been seeded; otherwise fall back to a one-off inline product so a payment is
  // never blocked on the seed having run.
  const catalogKey = catalogKeyForLine(input.serviceLine);
  const productId = catalogKey ? await seededProductId(catalogKey).catch(() => null) : null;

  const priceFields: Record<string, FormValue> = {
    currency: 'usd',
    unit_amount: input.amountCents,
    'metadata[business]': STRIPE_BUSINESS,
  };
  if (productId) {
    priceFields.product = productId;
    // Keeps the confirmation code on the price even though the Product name is
    // now the customer-facing line label.
    priceFields.nickname = `${input.serviceName} · ${input.confirmationCode}`;
  } else {
    priceFields['product_data[name]'] = `${input.serviceName} · ${input.confirmationCode}`;
    priceFields['product_data[metadata][business]'] = STRIPE_BUSINESS;
  }
  const price = await post<{ id: string }>('/prices', priceFields);

  // After payment: straight to the private receipt page when we have one (it waits for the webhook if
  // Stripe's redirect beats it), otherwise Stripe's own thank-you page as before.
  const afterPayment: Record<string, FormValue> = input.receiptUrl
    ? {
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': input.receiptUrl,
      }
    : {
        'after_completion[type]': 'hosted_confirmation',
        'after_completion[hosted_confirmation][custom_message]':
          `Thank you — your trip is paid. Keep ${input.confirmationCode} handy; ` +
          'quote it to dispatch on (704) 941-8508 and we will have your trip on screen.',
      };

  return post<PaymentLink>('/payment_links', {
    'line_items[0][price]': price.id,
    'line_items[0][quantity]': 1,
    'metadata[business]': STRIPE_BUSINESS,
    // Read back by the webhook. Stripe copies a payment link's metadata onto
    // the Checkout Session it creates, and the link id is matched as a fallback
    // in case that ever stops being true.
    'metadata[trip_request_id]': input.tripRequestId,
    'metadata[confirmation_code]': input.confirmationCode,
    ...afterPayment,
  });
}

const CARD_BRANDS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

/** "Visa •••• 4242". Brand and last four only — nothing else about the card is ever kept. */
export function cardLabel(brand: string | null | undefined, last4: string | null | undefined): string | null {
  if (!last4 || !/^\d{4}$/.test(last4)) return null;
  const b = (brand ?? '').toLowerCase();
  const name = CARD_BRANDS[b] ?? (b ? b.charAt(0).toUpperCase() + b.slice(1) : 'Card');
  return `${name} •••• ${last4}`;
}

/**
 * What the customer paid with, for the receipt. Best effort: any failure returns null and the receipt
 * simply leaves the line out.
 */
export async function getPaymentMethodLabel(checkoutSessionId: string): Promise<string | null> {
  try {
    const s = await get<{
      payment_intent?: { payment_method?: { card?: { brand?: string; last4?: string } } | string | null } | string | null;
    }>(`/checkout/sessions/${encodeURIComponent(checkoutSessionId)}?expand%5B%5D=payment_intent.payment_method`);
    const pi = s.payment_intent;
    if (!pi || typeof pi === 'string') return null;
    const pm = pi.payment_method;
    if (!pm || typeof pm === 'string') return null;
    return cardLabel(pm.card?.brand, pm.card?.last4);
  } catch (e) {
    console.error('[stripe] could not read the card for the receipt:', (e as Error).message);
    return null;
  }
}

/**
 * The branded pay page: a fresh Stripe Checkout Session that carries the Tassy logo.
 *
 * A Payment Link takes its logo from the ACCOUNT's branding, and this one Stripe account also serves
 * T-Gigs and Jackie Party, so putting a Tassy logo on the account would put it on their pages too. A
 * Checkout Session can carry its own branding_settings, so only Tassy trip payments show the logo.
 *
 * Sessions expire (24 hours), so the address the customer is given is /pay/<token> on our own site:
 * it makes a session at the moment of the click and sends the customer on. The link in the email
 * therefore never goes stale. The Payment Link made at confirmation stays as the record the webhook's
 * amount check reads (its id travels in the session metadata) and as the fallback if this fails.
 *
 * Tries three times, best first, because a payment must never be blocked by a logo:
 *   1. a pinned recent API version, with branding
 *   2. the account's default API version, with branding
 *   3. the account's default API version, without branding
 */
export async function createBrandedCheckout(input: {
  amountCents: number;
  serviceName: string;
  confirmationCode: string;
  tripRequestId: string;
  serviceLine?: string | null;
  /** The Payment Link recorded for this trip; read back by the webhook's amount check. */
  paymentLinkId?: string | null;
  successUrl: string;
  cancelUrl: string;
  logoUrl: string;
}): Promise<{ id: string; url: string; branded: boolean }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50) {
    throw new Error('A checkout needs a whole amount of at least $0.50');
  }
  const catalogKey = catalogKeyForLine(input.serviceLine);
  const productId = catalogKey ? await seededProductId(catalogKey).catch(() => null) : null;
  const label = `${input.serviceName} · ${input.confirmationCode}`;

  const fields: Record<string, FormValue> = {
    mode: 'payment',
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': input.amountCents,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    'metadata[business]': STRIPE_BUSINESS,
    'metadata[trip_request_id]': input.tripRequestId,
    'metadata[confirmation_code]': input.confirmationCode,
    'metadata[payment_link_id]': input.paymentLinkId ?? undefined,
    'payment_intent_data[description]': label,
    'payment_intent_data[metadata][business]': STRIPE_BUSINESS,
    'payment_intent_data[metadata][trip_request_id]': input.tripRequestId,
    'payment_intent_data[metadata][confirmation_code]': input.confirmationCode,
  };
  if (productId) {
    fields['line_items[0][price_data][product]'] = productId;
  } else {
    fields['line_items[0][price_data][product_data][name]'] = label;
    fields['line_items[0][price_data][product_data][metadata][business]'] = STRIPE_BUSINESS;
  }

  const branding: Record<string, FormValue> = {
    'branding_settings[display_name]': 'Tassy Transportation',
    'branding_settings[logo][type]': 'url',
    'branding_settings[logo][url]': input.logoUrl,
    'branding_settings[icon][type]': 'url',
    'branding_settings[icon][url]': input.logoUrl,
  };

  const attempts: Array<{ withBranding: boolean; headers?: Record<string, string> }> = [
    { withBranding: true, headers: { 'Stripe-Version': '2025-09-30.clover' } },
    { withBranding: true },
    { withBranding: false },
  ];
  let lastError: unknown = null;
  for (const a of attempts) {
    try {
      const session = await post<{ id: string; url?: string | null }>(
        '/checkout/sessions',
        a.withBranding ? { ...fields, ...branding } : fields,
        a.headers,
      );
      if (!session.url) throw new Error('Stripe returned no checkout url');
      return { id: session.id, url: session.url, branded: a.withBranding };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Stripe: could not create checkout');
}

/** The hosted URL of an existing Payment Link (the fallback when a branded checkout cannot be made). */
export async function paymentLinkUrl(linkId: string): Promise<string | null> {
  try {
    const link = await get<{ url?: string; active?: boolean }>(`/payment_links/${encodeURIComponent(linkId)}`);
    return link.active === false ? null : (link.url ?? null);
  } catch {
    return null;
  }
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
