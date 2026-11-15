import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { sendRichEmail } from '@/lib/notifications';
import { createRefund, withStripeMode } from '@/lib/stripe';
import { stripeModeForTrip } from '@/lib/stripe-mode';
import {
  AUDIT_LOG_TABLE,
  PAYMENT_RECORDED_ACTION,
  parsePaymentNote,
} from '@/lib/double-payment';
import {
  cancellationHtml,
  cancellationSubject,
  cancellationText,
  type CancelledTrip,
} from '@/lib/cancellation-email';

/**
 * Refund a cancelled trip. The one place a paid booking gets its money back.
 *
 * WHY THIS EXISTS
 * Cancelling a paid booking in TassyOps set the trip to "cancelled" and texted
 * the rider, but issued no refund and sent no email: the $104 charge stayed
 * "Succeeded" in Stripe, the trip still read "paid", and the rider heard
 * nothing (verified Nov 14, 2026, booking T-20261114-0015). The cancel step
 * owns the trip status; this is the money step that runs right after it, from
 * the dispatch board and the Winnie manager page, through the signed bridge
 * (app/api/ops/refund). The website backend owns it because it is the only
 * place that holds a Stripe key.
 *
 * ORDER MATTERS. The refund is issued first and the row is stamped only after
 * Stripe says it is done, so a failure leaves the trip exactly as it was
 * (cancelled, paid) and the dispatcher can retry or refund by hand. The
 * cancellation email goes last and is best effort: a failed email must never
 * undo a refund, and the caller is told (emailSent: false) so dispatch can
 * contact the rider. The rider is never told they were refunded before the
 * money is back.
 *
 * SAFETY
 *   • Only a trip whose status is already "cancelled" is refunded. A live
 *     trip is never refunded by this path — the dispatcher cancels first.
 *   • Test money refunds with the test key, live money with the live key
 *     (stripeModeForTrip, the same rule as the pay link and the webhook). A
 *     test trip with no test key configured is refused, not refunded live.
 *   • Idempotent twice over: a trip already marked "refunded" returns the
 *     recorded refund instead of refunding again, and Stripe gets an
 *     idempotency key of `refund:<tripId>`, so a retried cancel refunds once.
 *   • Full refund, every time. The policy (lib/refund-policy.ts, PROPOSED)
 *     says "Tassy cancels or has no driver = full refund", and a dispatcher
 *     cancel is Tassy cancelling. The rider-initiated late-cancel 50% fee is
 *     NOT applied here: the cancel flow does not record who asked for it or
 *     apply a time-based fee, and the policy is still a proposal. That is an
 *     open question for Phil (see the PR description).
 */

export const REFUND_ISSUED_ACTION = 'stripe.refund_issued';

export type RefundFailure =
  | 'not_found'
  | 'not_cancelled'
  | 'not_paid'
  | 'no_payment_reference'
  | 'test_key_missing'
  | 'refund_failed';

export type RefundResult =
  | {
      ok: true;
      refundId: string | null;
      amountCents: number;
      paymentIntentId: string;
      emailSent: boolean;
      /** The trip was already refunded on an earlier run; no new refund was issued. */
      alreadyRefunded: boolean;
    }
  | { ok: false; code: RefundFailure };

type Db = ReturnType<typeof supabaseAdmin>;

/** The Stripe payment intent that paid this trip, from the audit log. */
async function paymentIntentForTrip(db: Db, tripId: string): Promise<string | null> {
  // The trip row records THAT it was paid, not by which Stripe payment. The
  // webhook writes the payment intent id to the audit log the moment a payment
  // is recorded (lib/double-payment.ts, `stripe.payment_recorded`).
  const { data, error } = await db
    .from(AUDIT_LOG_TABLE)
    .select('notes')
    .eq('entity_type', 'trip_request')
    .eq('entity_id', tripId)
    .eq('action', PAYMENT_RECORDED_ACTION)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) {
    console.error('[ops] could not read the payment record for a refund:', error.message);
    return null;
  }
  const parsed = parsePaymentNote((data?.[0] as { notes?: string | null } | undefined)?.notes);
  return parsed?.paymentIntentId ?? null;
}

/** The refund already recorded for this trip, if one exists. */
async function readRefundRecord(
  db: Db,
  tripId: string,
): Promise<{ refundId: string | null; amountCents: number | null; paymentIntentId: string | null } | null> {
  const { data, error } = await db
    .from(AUDIT_LOG_TABLE)
    .select('notes')
    .eq('entity_type', 'trip_request')
    .eq('entity_id', tripId)
    .eq('action', REFUND_ISSUED_ACTION)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data?.[0]) return null;
  const note = String((data[0] as { notes?: unknown }).notes ?? '');
  const grab = (key: string): string | null => {
    const m = new RegExp(`${key}=([^\\s]+)`).exec(note);
    return m && m[1] !== '-' ? m[1] : null;
  };
  const amount = grab('amount');
  return {
    refundId: grab('refund'),
    amountCents: amount && /^\d+$/.test(amount) ? Number(amount) : null,
    paymentIntentId: grab('pi'),
  };
}

/** What this trip was paid, for the already-refunded answer. */
function paidAmountCents(row: Record<string, unknown>): number {
  const agreed = row.agreed_cents;
  const quoted = row.quoted_cents;
  if (typeof agreed === 'number' && agreed > 0) return agreed;
  if (typeof quoted === 'number' && quoted > 0) return quoted;
  return 0;
}

export async function refundTrip(args: { id: string }): Promise<RefundResult> {
  const db = supabaseAdmin();
  const { data: row, error: readError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('*')
    .eq('id', args.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) return { ok: false, code: 'not_found' };

  // Only a cancelled trip is refunded. A live trip is never refunded by this
  // path — the dispatcher cancels first, then this runs.
  if (row.status !== 'cancelled') return { ok: false, code: 'not_cancelled' };

  // Idempotent: a trip already refunded returns the recorded refund instead
  // of refunding again, so a retried cancel reports the same refund.
  if (row.payment_status === 'refunded') {
    const prior = await readRefundRecord(db, args.id);
    return {
      ok: true,
      refundId: prior?.refundId ?? null,
      amountCents: prior?.amountCents ?? paidAmountCents(row as Record<string, unknown>),
      paymentIntentId: prior?.paymentIntentId ?? '',
      emailSent: true,
      alreadyRefunded: true,
    };
  }
  if (row.payment_status !== 'paid') return { ok: false, code: 'not_paid' };

  const paymentIntentId = await paymentIntentForTrip(db, args.id);
  if (!paymentIntentId) return { ok: false, code: 'no_payment_reference' };

  // Test money refunds with the test key, live money with the live key. A
  // test trip with no test key configured cannot be refunded — refusing is
  // safer than letting the live key near a test payment intent.
  const mode = stripeModeForTrip(row as { is_test_data?: unknown });
  if (row.is_test_data === true && mode !== 'test') {
    return { ok: false, code: 'test_key_missing' };
  }

  let refund: Awaited<ReturnType<typeof createRefund>>;
  try {
    refund = await withStripeMode(mode, () =>
      createRefund({ paymentIntentId, idempotencyKey: `refund:${args.id}` }),
    );
  } catch (e) {
    console.error('[ops] refund failed (trip stays cancelled, still paid):', e);
    return { ok: false, code: 'refund_failed' };
  }

  // The money is back. Only now is the row stamped, so a failure above leaves
  // the trip exactly as it was (cancelled, paid) and the dispatcher can retry.
  // `refunded` is already a payment status the codebase knows: lib/confirm-plan.ts
  // never changes a `paid`, `refunded` or `on_account` trip, and the trip page
  // renders payment_status as-is, so this reads "refunded" there, not "paid".
  const { error: writeError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .update({ payment_status: 'refunded' })
    .eq('id', args.id);
  if (writeError) throw new Error(writeError.message);

  // Audit trail: which Stripe refund settled this trip, so a second cancel or
  // a second refund call finds it instead of refunding again.
  const { error: auditError } = await db.from(AUDIT_LOG_TABLE).insert({
    action: REFUND_ISSUED_ACTION,
    entity_type: 'trip_request',
    entity_id: args.id,
    notes: `refund=${refund.id} pi=${paymentIntentId} amount=${refund.amount}`,
  });
  if (auditError) console.error('[ops] could not record the refund:', auditError.message);

  // Timeline: the dispatcher reading the trip sees the refund, not just the cancel.
  const { error: eventError } = await db.from('trip_events').insert({
    trip_id: args.id,
    event: 'note',
    actor: 'system:refund',
    notes: `Refund issued: $${(refund.amount / 100).toFixed(2)} (Stripe refund ${refund.id}) — booking cancelled.`,
  });
  if (eventError) console.error('[ops] could not write the refund timeline row:', eventError.message);

  // The rider's cancellation email, with the refund in it. Best effort AFTER
  // the money and the row are saved: a failed email must never undo a refund,
  // and the caller is told (emailSent: false) so dispatch can contact the rider.
  let emailSent = false;
  const contactEmail = (row as { contact_email?: string | null }).contact_email ?? null;
  if (contactEmail) {
    const cancelled: CancelledTrip = {
      confirmationCode: (row as { confirmation_code?: string | null }).confirmation_code ?? '',
      tripNumber: (row as { trip_number?: string | null }).trip_number ?? null,
      refundCents: refund.amount,
      refundId: refund.id,
    };
    // The shape the email template reads. Built from the stored row rather
    // than a form, so what the customer is sent is what the database holds.
    const trip = {
      serviceLine: row.service_line,
      contactFirstName:
        (row as { contact_first_name?: string | null }).contact_first_name ??
        (String((row as { contact_name?: string | null }).contact_name ?? '').split(' ')[0] ?? ''),
      contactLastName: (row as { contact_last_name?: string | null }).contact_last_name ?? '',
      contactPhone: row.contact_phone,
      contactEmail,
      pickupAddress: row.pickup_address,
      dropoffAddress: row.dropoff_address,
      requestedAt: row.requested_at,
      returnTrip: Boolean(row.return_trip),
      returnAt: row.return_at,
      passengers: (row as { passengers?: number | null }).passengers ?? 1,
      mobility: row.mobility,
    } as Parameters<typeof cancellationHtml>[1];
    const subject = `${mode === 'test' ? '[TEST] ' : ''}${cancellationSubject(cancelled, trip)}`;
    try {
      await sendRichEmail({
        to: contactEmail,
        subject,
        html: cancellationHtml(cancelled, trip),
        text: cancellationText(cancelled, trip),
      });
      emailSent = true;
    } catch (e) {
      console.error('[ops] cancellation email failed (refund still issued):', e);
    }
  } else {
    console.warn('[ops] cancellation email skipped: no contact email on trip', args.id);
  }

  return {
    ok: true,
    refundId: refund.id,
    amountCents: refund.amount,
    paymentIntentId,
    emailSent,
    alreadyRefunded: false,
  };
}
