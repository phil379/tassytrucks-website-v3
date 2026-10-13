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

const DEFAULT_API = 'https://api.stripe.com/v1';
/** Overridable so the test suite can point at a local fake. Never set in production. */
const apiBase = () => process.env.STRIPE_API_BASE || DEFAULT_API;
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
    const response = await fetch(`${apiBase()}${path}`, {
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

async function get<T>(path: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set on this deployment');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${apiBase()}${path}`, {
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


/* ───────────────────────────────────────────────────────── Tassy Scholar: card on file */

/**
 * A Stripe Customer for one Scholar parent, so a saved card has an owner.
 * Metadata carries the standing order so the card can always be traced back from
 * the Stripe dashboard even if a database write is missed.
 */
export async function createStripeCustomer(input: {
  email: string;
  name: string;
  phone?: string;
  metadata: Record<string, string>;
}): Promise<{ id: string }> {
  const fields: Record<string, FormValue> = {
    email: input.email,
    name: input.name,
    phone: input.phone,
    'metadata[business]': STRIPE_BUSINESS,
  };
  for (const [k, v] of Object.entries(input.metadata)) fields[`metadata[${k}]`] = v;
  return post<{ id: string }>('/customers', fields);
}

/**
 * Stripe-hosted page that SAVES a card and charges nothing (mode=setup).
 *
 * The success URL carries Stripe's {CHECKOUT_SESSION_ID} placeholder; Stripe fills it
 * in after decoding the form body. Sessions expire, which is fine here: a parent who
 * walks away is sent a fresh one from /api/school-card.
 */
export async function createCardSetupSession(input: {
  customerId: string;
  standingOrderId: string;
  studentId: string;
  planKey: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const session = await post<{ id: string; url?: string }>('/checkout/sessions', {
    mode: 'setup',
    customer: input.customerId,
    'payment_method_types[0]': 'card',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    'custom_text[submit][message]':
      'Your card is saved, not charged. Tassy confirms your price and driver before your first ride.',
    'metadata[business]': STRIPE_BUSINESS,
    'metadata[purpose]': 'scholar_card_on_file',
    'metadata[standing_order_id]': input.standingOrderId,
    'metadata[student_id]': input.studentId,
    'metadata[plan]': input.planKey,
    'setup_intent_data[metadata][business]': STRIPE_BUSINESS,
    'setup_intent_data[metadata][standing_order_id]': input.standingOrderId,
  });
  if (!session.url) throw new Error('Stripe: checkout session came back without a URL');
  return { id: session.id, url: session.url };
}

export type CheckoutSessionSummary = {
  id: string;
  mode?: string;
  status?: string;
  customer?: string | null;
  metadata?: Record<string, string> | null;
  setup_intent?: { id: string; status?: string; payment_method?: string | null } | string | null;
};

/** Read one Checkout Session back, with its SetupIntent expanded. */
export function getCheckoutSession(sessionId: string): Promise<CheckoutSessionSummary> {
  return get<CheckoutSessionSummary>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=setup_intent`,
  );
}

export function getPaymentMethod(
  paymentMethodId: string,
): Promise<{ id: string; card?: { brand?: string; last4?: string } }> {
  return get(`/payment_methods/${encodeURIComponent(paymentMethodId)}`);
}
