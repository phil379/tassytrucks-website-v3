/**
 * A price typed into the /ops page, in dollars, to whole cents, or null when it is not a sensible price.
 *
 * The cap is the same $50,000 the TassyOps one-tap confirm already enforces (app/api/ops/confirm,
 * ops-bridge). Without it a slipped key on the /ops page ("4900" for "49.00") went straight to Stripe
 * as a $4,900 payment link and an email to the customer, which cannot be taken back.
 */
export const MAX_PRICE_DOLLARS = 50_000;

export function priceInputToCents(raw: string, opts: { allowZero?: boolean } = {}): number | null {
  const text = raw.trim();
  if (text === '') return null;
  const dollars = Number(text);
  if (!Number.isFinite(dollars)) return null;
  if (dollars < 0 || (dollars === 0 && !opts.allowZero)) return null;
  if (dollars > MAX_PRICE_DOLLARS) return null;
  return Math.round(dollars * 100);
}
