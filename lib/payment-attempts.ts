import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * payment_attempts: one row per Stripe Payment Link minted for a trip. The database allows at most
 * one ACTIVE row per trip, and the webhook compares what Stripe collected with the row for the link
 * that was paid. Every helper here is best effort and never throws: a bookkeeping failure must not
 * undo a link that exists or a payment that was taken.
 */
export const PAYMENT_ATTEMPTS_TABLE = 'payment_attempts';

export type PaymentAttempt = {
  id: string;
  trip_id: string;
  stripe_payment_link_id: string;
  amount_cents: number;
  currency: string;
  status: 'active' | 'superseded' | 'paid' | 'void_failed' | 'amount_mismatch' | 'paid_on_superseded';
};

export async function recordPaymentAttempt(
  db: SupabaseClient,
  input: { tripId: string; linkId: string; amountCents: number; currency?: string },
): Promise<void> {
  try {
    const { error } = await db.from(PAYMENT_ATTEMPTS_TABLE).insert({
      trip_id: input.tripId,
      stripe_payment_link_id: input.linkId,
      amount_cents: input.amountCents,
      currency: input.currency ?? 'usd',
      status: 'active',
    });
    if (error) console.error('[payments] could not record payment attempt:', error.message);
  } catch (e) {
    console.error('[payments] could not record payment attempt:', e);
  }
}

/** The attempt for a payment link, or null when there is none (legacy link) or the lookup failed. */
export async function findPaymentAttempt(db: SupabaseClient, linkId: string): Promise<PaymentAttempt | null> {
  try {
    const { data, error } = await db
      .from(PAYMENT_ATTEMPTS_TABLE)
      .select('id,trip_id,stripe_payment_link_id,amount_cents,currency,status')
      .eq('stripe_payment_link_id', linkId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      console.error('[payments] attempt lookup failed (treating as legacy link):', error.message);
      return null;
    }
    return (data?.[0] as PaymentAttempt | undefined) ?? null;
  } catch (e) {
    console.error('[payments] attempt lookup failed (treating as legacy link):', e);
    return null;
  }
}

export async function closePaymentAttempt(
  db: SupabaseClient,
  id: string,
  status: PaymentAttempt['status'],
  note?: string,
): Promise<void> {
  try {
    const { error } = await db
      .from(PAYMENT_ATTEMPTS_TABLE)
      .update({ status, note: note ?? null, closed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.error('[payments] could not update payment attempt:', error.message);
  } catch (e) {
    console.error('[payments] could not update payment attempt:', e);
  }
}
