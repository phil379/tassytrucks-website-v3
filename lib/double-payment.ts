import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Double-payment detection for the Stripe webhook.
 *
 * The trip row only records THAT it was paid, not by which Stripe session, so when a second checkout
 * completes for an already-paid trip there is nothing on the row to compare. To close that gap without
 * a schema change, the webhook now writes one `audit_log` row (action `stripe.payment_recorded`) the
 * moment it records a payment, holding the Stripe checkout session id and payment intent id. When a
 * later `checkout.session.completed` finds the trip already paid, this module compares ids:
 *   - same session or same payment intent  -> a Stripe retry of the same event: silent no-op;
 *   - different ids                        -> the customer was charged twice: alert the owner;
 *   - first payment's ids unknown (a trip paid before this existed) -> alert, flagged "unverified",
 *     because a second charge is far worse to miss than a rare false alarm.
 * It NEVER refunds anything. A person looks in Stripe and decides.
 */

export const AUDIT_LOG_TABLE = 'audit_log';
export const PAYMENT_RECORDED_ACTION = 'stripe.payment_recorded';
export const DOUBLE_PAYMENT_ACTION = 'stripe.possible_double_payment';
const TRIP_ENTITY = 'trip_request';

export type PaidIds = { sessionId: string | null; paymentIntentId: string | null };

export type AlreadyPaidVerdict = 'repeat' | 'possible_double' | 'possible_double_unverified';

/** `session=cs_x pi=pi_y amount=1234` - the audit_log note format. A missing id is written as `-`. */
export function paymentNote(ids: PaidIds, amountCents?: number | null): string {
  return `session=${ids.sessionId ?? '-'} pi=${ids.paymentIntentId ?? '-'} amount=${amountCents ?? '-'}`;
}

export function parsePaymentNote(note: string | null | undefined): (PaidIds & { amountCents: number | null }) | null {
  if (!note) return null;
  const grab = (key: string): string | null => {
    const m = new RegExp(`${key}=(\\S+)`).exec(note);
    return m && m[1] !== '-' ? m[1] : null;
  };
  const sessionId = grab('session');
  const paymentIntentId = grab('pi');
  const amount = grab('amount');
  if (!sessionId && !paymentIntentId) return null;
  return { sessionId, paymentIntentId, amountCents: amount && /^\d+$/.test(amount) ? Number(amount) : null };
}

/** Pure: is this a repeat of the payment already on file, or a second one? */
export function classifyAlreadyPaid(current: PaidIds, first: PaidIds | null): AlreadyPaidVerdict {
  if (!first) return 'possible_double_unverified';
  const pairs: Array<[string | null, string | null]> = [
    [current.sessionId, first.sessionId],
    [current.paymentIntentId, first.paymentIntentId],
  ];
  const comparable = pairs.filter(([a, b]) => a && b);
  if (comparable.some(([a, b]) => a === b)) return 'repeat';
  return comparable.length > 0 ? 'possible_double' : 'possible_double_unverified';
}

/** Remember which Stripe session paid a trip. Best effort: never throws, never blocks the payment. */
export async function recordFirstPayment(
  db: SupabaseClient,
  tripId: string,
  ids: PaidIds,
  amountCents: number | null | undefined,
): Promise<void> {
  try {
    const { error } = await db.from(AUDIT_LOG_TABLE).insert({
      action: PAYMENT_RECORDED_ACTION,
      entity_type: TRIP_ENTITY,
      entity_id: tripId,
      notes: paymentNote(ids, amountCents),
    });
    if (error) console.error('[stripe] could not record the paying session id:', error.message);
  } catch (e) {
    console.error('[stripe] could not record the paying session id:', e);
  }
}

export type DoublePaymentAlert = {
  tripId: string;
  tripNumber: string | null;
  /** What the trip was priced at (agreed, else quoted), in cents. */
  tripAmountCents: number | null;
  first: (PaidIds & { amountCents: number | null }) | null;
  second: PaidIds & { amountCents: number | null; currency: string | null };
  verified: boolean;
};

export type AlreadyPaidOutcome = 'repeat' | 'already_alerted' | 'alerted' | 'retry';

/**
 * The webhook found the trip already paid. Decide between "Stripe is repeating itself" and "the
 * customer paid twice", and alert the owner (once per second session) in the second case.
 * `retry` means the audit log could not be read: the webhook answers 500 so Stripe sends it again.
 */
export async function handleAlreadyPaid(
  db: SupabaseClient,
  input: {
    trip: { id: string; trip_number?: string | null; agreed_cents?: number | null; quoted_cents?: number | null };
    current: PaidIds;
    amountTotal?: number | null;
    currency?: string | null;
  },
  notify: (alert: DoublePaymentAlert) => Promise<void>,
): Promise<AlreadyPaidOutcome> {
  const { trip, current } = input;

  const { data, error } = await db
    .from(AUDIT_LOG_TABLE)
    .select('action, notes')
    .eq('entity_type', TRIP_ENTITY)
    .eq('entity_id', trip.id)
    .in('action', [PAYMENT_RECORDED_ACTION, DOUBLE_PAYMENT_ACTION])
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[stripe] could not read the audit log for an already-paid trip:', error.message);
    return 'retry';
  }
  const rows = (data ?? []) as Array<{ action: string; notes: string | null }>;

  const first = parsePaymentNote(rows.find((r) => r.action === PAYMENT_RECORDED_ACTION)?.notes);
  const verdict = classifyAlreadyPaid(current, first);
  if (verdict === 'repeat') return 'repeat';

  // The same second payment delivered twice must not alert twice.
  const alertedBefore = rows.some((r) => {
    if (r.action !== DOUBLE_PAYMENT_ACTION) return false;
    const prior = parsePaymentNote(r.notes);
    return Boolean(
      prior &&
        ((current.sessionId && prior.sessionId === current.sessionId) ||
          (current.paymentIntentId && prior.paymentIntentId === current.paymentIntentId)),
    );
  });
  if (alertedBefore) return 'already_alerted';

  const alert: DoublePaymentAlert = {
    tripId: trip.id,
    tripNumber: trip.trip_number ?? null,
    tripAmountCents: trip.agreed_cents ?? trip.quoted_cents ?? null,
    first,
    second: { ...current, amountCents: input.amountTotal ?? null, currency: input.currency ?? null },
    verified: verdict === 'possible_double',
  };

  // Record first (so a retry does not alert again), then tell the owner. Neither may throw.
  try {
    const { error: insertError } = await db.from(AUDIT_LOG_TABLE).insert({
      action: DOUBLE_PAYMENT_ACTION,
      entity_type: TRIP_ENTITY,
      entity_id: trip.id,
      notes: paymentNote(current, input.amountTotal),
    });
    if (insertError) console.error('[stripe] could not log a possible double payment:', insertError.message);
  } catch (e) {
    console.error('[stripe] could not log a possible double payment:', e);
  }
  try {
    await notify(alert);
  } catch (e) {
    console.error('[stripe] double-payment alert failed:', e);
  }
  return 'alerted';
}
