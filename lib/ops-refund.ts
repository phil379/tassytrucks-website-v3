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
import { CANCELLATION } from '@/lib/refund-policy';

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
 *   • Full refund at cancel time, every time. The policy
 *     (lib/refund-policy.ts, PROPOSED) says "Tassy cancels or has no driver
 *     = full refund", and a dispatcher cancel is Tassy cancelling. The
 *     rider-initiated late-cancel fee is NOT applied here: at cancel
 *     time the refund is either issued in full or HELD (below). The one
 *     partial refund in the system is a held payment being decided later:
 *     the ops held-payments queue (Block B1) passes `amountCents` — the
 *     remainder after the fee the held email already named — and this
 *     function refunds exactly that. The idempotency key does not vary
 *     with the amount, so a trip can only ever be refunded once.
 *   • Since 2026-11-21 there is a second partial refund: a Concierge
 *     late cancel keeps only the $35 flat fee (Phil — the late cancel
 *     costs the no-show amount), so ops passes the remainder as
 *     `amountCents` at cancel time. When the amount refunded is less
 *     than the fare charged, the cancellation email below states the
 *     amount actually kept (feeKeptCents = charged fare − refund),
 *     never a generic percent.
 *
 * THE HELD PATH (notifyRefundHeld, below): the ops cancel flow now DOES
 * record who asked (PR #163), and when the rider asked inside the free-
 * cancel window it HOLDS this refund — a human decides it afterwards,
 * from the ops held-payments queue (Block B1) or by hand in Stripe. But
 * the rider's only cancellation email lived inside
 * refundTrip, so a held cancel emailed the rider nothing at all (verified
 * live Nov 15, 2026, trip T-20261115-0001: money held correctly, silence
 * for the rider). notifyRefundHeld is the no-money companion: same signed
 * bridge (the route passes outcome: "held"), same email template in its
 * held variant, and it never touches Stripe and never marks the trip
 * refunded — the trip stays "paid" until a human refunds the rest.
 *
 * THE FEE-KEPT PATH (notifyFeeKept, below): since Phil's 2026-11-19
 * decision the late-cancel fee is the FULL fare, so a rider cancel inside
 * the window keeps the fare outright — no refund, no remainder, nothing
 * for the held-payments queue to decide. Ops records the kept fare
 * (recordFeeKept) and calls this companion through the same bridge
 * (outcome: "fee_kept") so the rider still gets the cancellation email:
 * the same template's held variant with a $0 remainder, which since
 * PR #126 reads "the full fare is kept as the fee, so no refund is due."
 * It never touches Stripe and never marks the trip refunded — the trip
 * stays "paid" because the fare was earned, not held.
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

/**
 * The shape the cancellation email template reads. Built from the stored
 * row rather than a form, so what the customer is sent is what the
 * database holds. Shared by the refund email and the held-refund email.
 */
function emailTripShape(row: any, contactEmail: string) {
  return {
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
}

export async function refundTrip(args: { id: string; amountCents?: number }): Promise<RefundResult> {
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
      createRefund({ paymentIntentId, amountCents: args.amountCents, idempotencyKey: `refund:${args.id}` }),
    );
  } catch (e) {
    console.error('[ops] refund failed (trip stays cancelled, still paid):', e);
    return { ok: false, code: 'refund_failed' };
  }

  // A partial refund means a fee was kept (Phil, 2026-11-21: a Concierge
  // late cancel keeps $35 and refunds the rest). The kept amount is the
  // fare the rider actually paid minus what just went back — computed
  // here, from the payment record, so the cancellation email states the
  // amount actually kept rather than any policy percent.
  const fareCents =
    args.amountCents !== undefined ? await chargedFareCents(db, args.id, row as Record<string, unknown>) : 0;
  const keptCents = fareCents > refund.amount ? fareCents - refund.amount : 0;

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
    notes:
      keptCents > 0
        ? `Refund issued: $${(refund.amount / 100).toFixed(2)} (Stripe refund ${refund.id}) — booking cancelled. Late-cancellation fee kept: $${(keptCents / 100).toFixed(2)}.`
        : `Refund issued: $${(refund.amount / 100).toFixed(2)} (Stripe refund ${refund.id}) — booking cancelled.`,
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
      // A partial refund: the email names the fee actually kept (above).
      ...(keptCents > 0 ? { feeKeptCents: keptCents, fareCents } : {}),
    };
    const trip = emailTripShape(row, contactEmail);
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

export const REFUND_HELD_ACTION = 'cancel.refund_held_emailed';

export const REFUND_FEE_KEPT_ACTION = 'cancel.fee_kept_emailed';

export type HeldNotifyResult =
  | {
      ok: true;
      /** The held-refund email reached the rider (or had already gone out). */
      emailSent: boolean;
      /** The email was already sent by an earlier call; nothing was re-sent. */
      alreadyNotified: boolean;
    }
  | { ok: false; code: RefundFailure | 'already_refunded' };

/** Has the held-refund email (or its fee-kept sibling) already gone out for this trip? */
async function heldNoticeRecorded(
  db: Db,
  tripId: string,
  action: string = REFUND_HELD_ACTION,
): Promise<boolean> {
  const { data, error } = await db
    .from(AUDIT_LOG_TABLE)
    .select('id')
    .eq('entity_type', 'trip_request')
    .eq('entity_id', tripId)
    .eq('action', action)
    .limit(1);
  if (error) {
    console.error('[ops] could not check the held-refund record:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * What this trip was actually charged: the payment record the webhook
 * left (stripe.payment_recorded carries the charged amount), falling
 * back to the agreed/quoted fare on the row.
 */
async function chargedFareCents(db: Db, tripId: string, row: Record<string, unknown>): Promise<number> {
  const { data, error } = await db
    .from(AUDIT_LOG_TABLE)
    .select('notes')
    .eq('entity_type', 'trip_request')
    .eq('entity_id', tripId)
    .eq('action', PAYMENT_RECORDED_ACTION)
    .order('created_at', { ascending: true })
    .limit(1);
  if (!error) {
    const parsed = parsePaymentNote((data?.[0] as { notes?: string | null } | undefined)?.notes);
    if (parsed?.amountCents && parsed.amountCents > 0) return parsed.amountCents;
  }
  return paidAmountCents(row);
}

/**
 * Email the rider about a HELD refund. The companion to refundTrip for
 * the one cancel outcome that moves no money: rider-initiated, inside
 * the free-cancel window, policy keeps the late-cancellation fee and a
 * human refunds the rest afterwards (PR #163; the ops held-payments
 * queue, Block B1, is
 * where that decision now happens). Ops calls this through the same
 * bridge (outcome: "held") right after recording the cancel.
 *
 * It never touches Stripe and never changes the trip: the row stays
 * cancelled + paid until a human refunds the remainder. The email is
 * the template's held variant — the fee is named, the remainder is
 * promised by hand, no refund is claimed and no reference is quoted.
 * A successful send is recorded in the audit log (REFUND_HELD_ACTION)
 * and on the trip timeline, and a repeat call answers alreadyNotified
 * instead of emailing the rider twice.
 */
export async function notifyRefundHeld(args: { id: string }): Promise<HeldNotifyResult> {
  const db = supabaseAdmin();
  const { data: row, error: readError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('*')
    .eq('id', args.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) return { ok: false, code: 'not_found' };

  // Same fences as the refund: only a cancelled trip is ever emailed
  // about its money, and never one whose money already moved.
  if (row.status !== 'cancelled') return { ok: false, code: 'not_cancelled' };
  if (row.payment_status === 'refunded') return { ok: false, code: 'already_refunded' };
  if (row.payment_status !== 'paid') return { ok: false, code: 'not_paid' };

  // One held email per trip: the cancel is recorded once, but a retried
  // bridge call must not email the rider twice.
  if (await heldNoticeRecorded(db, args.id)) {
    return { ok: true, emailSent: true, alreadyNotified: true };
  }

  const fareCents = await chargedFareCents(db, args.id, row as Record<string, unknown>);
  // The fee is the policy's late-cancel percentage of the fare, read from
  // lib/refund-policy.ts — never a typed split. It was half the fare until
  // Phil's 2026-11-19 decision made it 100%, so the remainder is now $0
  // and the held email tells the rider no refund is due.
  const feeCents = Math.round((fareCents * CANCELLATION.trip.lateCancelFeePercent) / 100);
  const remainderCents = fareCents - feeCents;

  // The [TEST] prefix follows the same mode rule as the refund email;
  // no Stripe call is made here, the mode only picks the prefix.
  const mode = stripeModeForTrip(row as { is_test_data?: unknown });

  let emailSent = false;
  const contactEmail = (row as { contact_email?: string | null }).contact_email ?? null;
  if (contactEmail) {
    const cancelled: CancelledTrip = {
      confirmationCode: (row as { confirmation_code?: string | null }).confirmation_code ?? '',
      tripNumber: (row as { trip_number?: string | null }).trip_number ?? null,
      refundCents: remainderCents,
      refundId: null,
      refundHeld: true,
      fareCents,
    };
    const trip = emailTripShape(row, contactEmail);
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
      console.error('[ops] held-refund email failed:', e);
    }
  } else {
    console.warn('[ops] held-refund email skipped: no contact email on trip', args.id);
  }

  if (emailSent) {
    // The record that makes a repeat call answer alreadyNotified, and
    // the timeline line the refund path writes for its own email — a
    // held cancel must be just as visible on the trip.
    const { error: auditError } = await db.from(AUDIT_LOG_TABLE).insert({
      action: REFUND_HELD_ACTION,
      entity_type: 'trip_request',
      entity_id: args.id,
      notes: `fare=${fareCents} fee=${feeCents} remainder=${remainderCents}`,
    });
    if (auditError) console.error('[ops] could not record the held-refund email:', auditError.message);

    const { error: eventError } = await db.from('trip_events').insert({
      trip_id: args.id,
      event: 'note',
      actor: 'system:refund-held',
      notes: `Cancellation email sent: refund held — ${CANCELLATION.trip.lateCancelFeePercent}% late-cancellation fee applies; $${(remainderCents / 100).toFixed(2)} to be refunded by hand in Stripe.`,
    });
    if (eventError) console.error('[ops] could not write the held-refund timeline row:', eventError.message);
  }

  return { ok: true, emailSent, alreadyNotified: false };
}

/**
 * Email the rider about a KEPT fare. The second no-money companion, for
 * Phil's 2026-11-19 rule: a rider cancel inside the free-cancel window
 * keeps the FULL fare as the late-cancellation fee (ops cancel-outcome
 * "full_fee"), so there is no refund and no remainder — and nothing for
 * the held-payments queue, which is why this is a separate mode from
 * "held" and not a reuse of it. Ops calls it through the same bridge
 * (outcome: "fee_kept") from recordFeeKept, right after recording the
 * cancel.
 *
 * The email is the template's held variant with a $0 remainder: since
 * PR #126 the copy derives from the numbers, and at a $0 remainder it
 * says the full fare is kept as the fee and no refund is due — it never
 * promises money by hand, because none will move. The fee here is the
 * full fare BY THE CALLER'S DECISION (ops has already decided the fare
 * is kept), not a percentage read from policy: this function documents
 * that decision, so its wording can never drift into a held-style
 * remainder promise. Like notifyRefundHeld it never touches Stripe and
 * never changes the trip — the row stays cancelled + paid, because the
 * fare was earned. A successful send is recorded in the audit log
 * (REFUND_FEE_KEPT_ACTION) and on the trip timeline, and a repeat call
 * answers alreadyNotified instead of emailing the rider twice.
 */
export async function notifyFeeKept(args: { id: string }): Promise<HeldNotifyResult> {
  const db = supabaseAdmin();
  const { data: row, error: readError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('*')
    .eq('id', args.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) return { ok: false, code: 'not_found' };

  // Same fences as the refund and the held email: only a cancelled trip
  // is ever emailed about its money, and never one whose money moved.
  if (row.status !== 'cancelled') return { ok: false, code: 'not_cancelled' };
  if (row.payment_status === 'refunded') return { ok: false, code: 'already_refunded' };
  if (row.payment_status !== 'paid') return { ok: false, code: 'not_paid' };

  // One fee-kept email per trip: the cancel is recorded once, but a
  // retried bridge call must not email the rider twice.
  if (await heldNoticeRecorded(db, args.id, REFUND_FEE_KEPT_ACTION)) {
    return { ok: true, emailSent: true, alreadyNotified: true };
  }

  const fareCents = await chargedFareCents(db, args.id, row as Record<string, unknown>);
  // The fee is the whole fare and the remainder is $0 — the decision ops
  // made when it kept the fare. (Contrast notifyRefundHeld, which splits
  // the fare by the policy percentage because a human still owes the
  // remainder there.)
  const feeCents = fareCents;
  const remainderCents = 0;

  // The [TEST] prefix follows the same mode rule as the refund email;
  // no Stripe call is made here, the mode only picks the prefix.
  const mode = stripeModeForTrip(row as { is_test_data?: unknown });

  let emailSent = false;
  const contactEmail = (row as { contact_email?: string | null }).contact_email ?? null;
  if (contactEmail) {
    const cancelled: CancelledTrip = {
      confirmationCode: (row as { confirmation_code?: string | null }).confirmation_code ?? '',
      tripNumber: (row as { trip_number?: string | null }).trip_number ?? null,
      refundCents: remainderCents,
      refundId: null,
      refundHeld: true,
      fareCents,
    };
    const trip = emailTripShape(row, contactEmail);
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
      console.error('[ops] fee-kept email failed:', e);
    }
  } else {
    console.warn('[ops] fee-kept email skipped: no contact email on trip', args.id);
  }

  if (emailSent) {
    // The record that makes a repeat call answer alreadyNotified, and
    // the timeline line the refund path writes for its own email — a
    // fee-kept cancel must be just as visible on the trip.
    const { error: auditError } = await db.from(AUDIT_LOG_TABLE).insert({
      action: REFUND_FEE_KEPT_ACTION,
      entity_type: 'trip_request',
      entity_id: args.id,
      notes: `fare=${fareCents} fee=${feeCents} remainder=${remainderCents}`,
    });
    if (auditError) console.error('[ops] could not record the fee-kept email:', auditError.message);

    const { error: eventError } = await db.from('trip_events').insert({
      trip_id: args.id,
      event: 'note',
      actor: 'system:fee-kept',
      notes: `Cancellation email sent: the full fare of $${(fareCents / 100).toFixed(2)} was kept as the late-cancellation fee — no refund is due.`,
    });
    if (eventError) console.error('[ops] could not write the fee-kept timeline row:', eventError.message);
  }

  return { ok: true, emailSent, alreadyNotified: false };
}
