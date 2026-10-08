/**
 * Seed the Stripe catalog for Tassy Transportation — the service-line Products
 * and the Tassy Scholar subscription Prices. Idempotent; run it as often as you
 * like.
 *
 *   bun run scripts/seed-stripe-catalog.ts          # create / reconcile (test mode)
 *   bun run scripts/seed-stripe-catalog.ts --dry    # report, change nothing
 *   bun run scripts/seed-stripe-catalog.ts --live   # required to touch LIVE keys
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE STRIPE ACCOUNT, THREE BUSINESSES
 * ─────────────────────────────────────────────────────────────────────────────
 * Tassy Trucks LLC runs one Stripe account for three DBAs — T-Gigs (weekly
 * subscriptions, already live), Tassy Transportation (this script), and Jackie
 * Party (a fixed rental catalog, seeded by its own script). There are no Connect
 * sub-accounts; the businesses are kept apart by a `business` metadata tag on
 * every Product and Price. This script only ever creates and reconciles objects
 * tagged `business=tassy-transport`, so it can be run without any risk to the
 * T-Gigs subscriptions or anything Jackie Party adds later.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS CREATES — AND WHAT IT DELIBERATELY DOES NOT
 * ─────────────────────────────────────────────────────────────────────────────
 * CREATES:
 *   • One Stripe PRODUCT per service line (Care, Care WAV, Recovery, Concierge,
 *     Winnie, Scholar). A Product is a container Stripe groups revenue under;
 *     the per-trip AMOUNT is still computed by lib/quote.ts and charged through
 *     an ad-hoc Price on the Payment Link (lib/stripe.ts). Seeding the Products
 *     lets a future Payment Link reference `product=<id>` so the dashboard
 *     aggregates by line instead of showing hundreds of one-off products.
 *   • The Tassy Scholar PRICES — the one part of the catalog that is genuinely
 *     fixed:
 *       scholar_full_year_monthly       $839/mo  recurring (a real subscription)
 *       scholar_weekly_per_ride         $24      one-time unit, billed monthly ×N
 *       scholar_after_school_per_ride   $26      one-time unit, billed monthly ×N
 *
 * DOES NOT:
 *   • Does NOT price trips. lib/quote.ts is the single source of truth for fares
 *     — distance bands, surcharges, escort, return-trip rules — and it is more
 *     capable than a flat rate table. This script does not duplicate a cent of
 *     it. The service-line Products carry NO fixed Price for that reason.
 *   • Does NOT create subscriptions or invoices. Weekly / After-School bill a
 *     variable number of rides each month, so they are unit Prices a monthly
 *     invoice multiplies — not a fixed recurring charge. Wiring the actual
 *     monthly billing is app work and a separate decision.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFETY
 * ─────────────────────────────────────────────────────────────────────────────
 * The secret key is read from the environment, never logged, never printed.
 * The script refuses to touch a LIVE key (sk_live_…) unless --live is passed —
 * seed test mode, prove it, then promote. Idempotency is by metadata key on
 * Products and by lookup_key on Prices, so a re-run reconciles rather than
 * duplicating.
 */

const API = 'https://api.stripe.com/v1';
const KEY = process.env.STRIPE_SECRET_KEY;
const DRY = process.argv.includes('--dry');
const ALLOW_LIVE = process.argv.includes('--live');

if (!DRY && !KEY) {
  console.error('STRIPE_SECRET_KEY must be set in the environment (not needed for --dry).');
  process.exit(1);
}

const MODE = KEY?.startsWith('sk_live_') ? 'LIVE' : 'test';
if (!DRY && MODE === 'LIVE' && !ALLOW_LIVE) {
  console.error(
    'Refusing to touch LIVE Stripe without --live. Seed and verify in test mode first,\n' +
      'then re-run with STRIPE_SECRET_KEY set to the live key and the --live flag.',
  );
  process.exit(1);
}

/** The business tag that keeps this catalog separate on the shared account. */
const BUSINESS = 'tassy-transport';

/** Metadata key that marks a Product as owned by this seeder — the idempotency anchor. */
const CATALOG_KEY = 'tassy_catalog_key';

type StripeObject = { id: string; [k: string]: unknown };
type StripeList<T> = { data: T[]; has_more: boolean };

function headers() {
  return {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

function encode(fields: Record<string, string | number>): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) body.set(k, String(v));
  return body.toString();
}

async function sPost<T>(path: string, fields: Record<string, string | number>): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: headers(), body: encode(fields) });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message = (json.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new Error(`Stripe POST ${path}: ${message}`);
  }
  return json as T;
}

async function sGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: 'GET', headers: headers() });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message = (json.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new Error(`Stripe GET ${path}: ${message}`);
  }
  return json as T;
}

/** Service lines that get a container Product. Labels mirror lib/quote.ts. */
const PRODUCTS: ReadonlyArray<{ key: string; name: string; description: string }> = [
  { key: 'care', name: 'Tassy Care', description: 'One-way ambulatory medical transport.' },
  { key: 'care_wav', name: 'Tassy Care WAV', description: 'Wheelchair-accessible medical transport.' },
  { key: 'recovery', name: 'Tassy Recovery', description: 'Round-trip post-procedure transport with wait included.' },
  { key: 'concierge', name: 'Tassy Concierge', description: 'Premium non-medical transport — airport, events.' },
  { key: 'winnie', name: 'Winnie Ride', description: 'Dedicated pet transport, owner not travelling.' },
  { key: 'scholar', name: 'Tassy Scholar', description: 'School-year student transport, billed monthly.' },
];

/** The fixed Scholar prices, attached to the `scholar` Product. */
const SCHOLAR_PRICES: ReadonlyArray<{
  lookup_key: string;
  unit_amount: number;
  nickname: string;
  recurring_interval?: 'month';
}> = [
  { lookup_key: 'scholar_full_year_monthly', unit_amount: 83900, nickname: 'Scholar Full Year — $839/mo', recurring_interval: 'month' },
  { lookup_key: 'scholar_weekly_per_ride', unit_amount: 2400, nickname: 'Scholar Weekly — $24 per ride' },
  { lookup_key: 'scholar_after_school_per_ride', unit_amount: 2600, nickname: 'Scholar After-School — $26 per ride' },
];

/** All Products this seeder owns, keyed by CATALOG_KEY, newest page first. */
async function existingProducts(): Promise<Map<string, StripeObject>> {
  const found = new Map<string, StripeObject>();
  let url = `/products?limit=100&active=true`;
  // One page covers a catalog this size; the loop is here so it never silently
  // misses a Product that paged off the end as the account grows.
  for (;;) {
    const page = await sGet<StripeList<StripeObject>>(url);
    for (const p of page.data) {
      const meta = (p.metadata as Record<string, string> | undefined) ?? {};
      // Only our own business's Products — never reconcile against a Product the
      // T-Gigs or Jackie Party agent created, even if a key ever collided.
      if (meta[CATALOG_KEY] && meta.business === BUSINESS) found.set(meta[CATALOG_KEY], p);
    }
    if (!page.has_more || page.data.length === 0) break;
    url = `/products?limit=100&active=true&starting_after=${page.data[page.data.length - 1].id}`;
  }
  return found;
}

async function priceByLookupKey(lookupKey: string): Promise<StripeObject | null> {
  const page = await sGet<StripeList<StripeObject>>(`/prices?lookup_keys[]=${encodeURIComponent(lookupKey)}&limit=1&active=true`);
  return page.data[0] ?? null;
}

async function main() {
  console.log(`Stripe catalog seed — ${MODE} mode${DRY ? ' (DRY RUN, no writes)' : ''}\n`);

  const haveProducts = DRY ? new Map<string, StripeObject>() : await existingProducts();
  const productIds = new Map<string, string>();

  for (const p of PRODUCTS) {
    const existing = haveProducts.get(p.key);
    if (existing) {
      productIds.set(p.key, existing.id);
      console.log(`  product  ${p.key.padEnd(10)} exists   ${existing.id}`);
      continue;
    }
    if (DRY) {
      console.log(`  product  ${p.key.padEnd(10)} CREATE   "${p.name}"`);
      continue;
    }
    const created = await sPost<StripeObject>('/products', {
      name: p.name,
      description: p.description,
      'metadata[business]': BUSINESS,
      [`metadata[${CATALOG_KEY}]`]: p.key,
    });
    productIds.set(p.key, created.id);
    console.log(`  product  ${p.key.padEnd(10)} created  ${created.id}`);
  }

  const scholarId = productIds.get('scholar');

  for (const price of SCHOLAR_PRICES) {
    const existing = DRY ? null : await priceByLookupKey(price.lookup_key);
    if (existing) {
      console.log(`  price    ${price.lookup_key.padEnd(30)} exists   ${existing.id}`);
      continue;
    }
    if (DRY || !scholarId) {
      console.log(`  price    ${price.lookup_key.padEnd(30)} ${DRY ? 'CREATE' : 'SKIP (no scholar product)'}  ${price.nickname}`);
      continue;
    }
    const fields: Record<string, string | number> = {
      currency: 'usd',
      unit_amount: price.unit_amount,
      product: scholarId,
      nickname: price.nickname,
      lookup_key: price.lookup_key,
      'metadata[business]': BUSINESS,
      // Move the lookup_key onto this new price if an older one still holds it,
      // so a re-run after a price edit reconciles instead of erroring.
      transfer_lookup_key: 'true',
    };
    if (price.recurring_interval) fields['recurring[interval]'] = price.recurring_interval;
    const created = await sPost<StripeObject>('/prices', fields);
    console.log(`  price    ${price.lookup_key.padEnd(30)} created  ${created.id}`);
  }

  console.log(`\nDone${DRY ? ' (dry run — nothing was written)' : ''}.`);
}

main().catch((err) => {
  console.error(`\nFailed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
