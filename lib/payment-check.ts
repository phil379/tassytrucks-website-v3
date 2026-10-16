/**
 * Does the money Stripe collected match what we asked for?
 *
 * Pure so it can be tested. The webhook uses it against the `payment_attempts` row for the payment
 * link that was paid: a stale link, a tampered amount or a wrong currency must NOT mark a trip paid.
 */
export type PaidAmountCheck = 'match' | 'amount_mismatch' | 'currency_mismatch' | 'unknown';

export function checkPaidAmount(input: {
  amountTotal: number | null | undefined;
  currency: string | null | undefined;
  expectedCents: number;
  expectedCurrency?: string;
}): PaidAmountCheck {
  const { amountTotal, currency, expectedCents } = input;
  if (typeof amountTotal !== 'number' || !Number.isFinite(amountTotal)) return 'unknown';
  if (currency && currency.toLowerCase() !== (input.expectedCurrency ?? 'usd').toLowerCase()) return 'currency_mismatch';
  return amountTotal === expectedCents ? 'match' : 'amount_mismatch';
}
