import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createCardSetupSession,
  createStripeCustomer,
  getCheckoutSession,
  getPaymentMethod,
  stripeConfigured,
} from '@/lib/stripe';
import type { PlanKey } from '@/lib/school-plans';

/**
 * Tassy Scholar — saving a parent's card.
 *
 * THE RULE THIS FILE EXISTS TO KEEP: signing up never charges anyone.
 *
 * A parent finishes the setup wizard, is sent to Stripe's hosted page, and adds a
 * card in SETUP mode. Stripe verifies the card and hands back a reusable payment
 * method; no money moves. Phil then confirms the price and the driver in TassyOps
 * and ONLY THEN is the monthly subscription created from the saved card. That
 * keeps the promise on the confirm screen ("set by school location before your
 * first ride") and means a ride Tassy cannot staff never has to be refunded.
 *
 * Only Full Year has a card step today. Weekly and After-School keep the
 * "we confirm pricing" flow until their monthly invoicing is designed and the
 * per-ride prices are tested against driver pay.
 *
 * DATABASE. The columns written here come from the PROPOSED migration
 * supabase/migrations/20261013T2300_scholar_card_on_file.sql. Every write to them is
 * best-effort and logged, never fatal: the booking is stored by the route before this
 * file runs, and the card lives in Stripe with the standing order's id in its metadata,
 * so a missing column can be repaired from Stripe. A booking must never fail because of
 * a billing column.
 */

export const STANDING_ORDERS_TABLE = 'standing_orders';

/** Stripe Checkout metadata that marks a session as ours. Read back by the webhook. */
export const CARD_SETUP_PURPOSE = 'scholar_card_on_file';
export const STRIPE_BUSINESS = 'tassy-transport';

export const BILLING_STATUS = {
  /** The plan has no online card step (Weekly, After-School). */
  notRequired: 'not_required',
  /** Setup finished, card not added yet. */
  cardPending: 'card_pending',
  /** A verified card is on file. Nothing has been charged. */
  cardSaved: 'card_saved',
  /** Phil approved; the subscription exists. Set only by TassyOps. */
  active: 'active',
  /** A monthly payment failed. Stripe keeps retrying; Phil is alerted; clears itself when a payment lands. */
  pastDue: 'past_due',
  /** The subscription ended (family cancelled at the end of the paid month, or Stripe gave up). */
  canceled: 'canceled',
} as const;

export function planNeedsCard(plan: PlanKey): boolean {
  return plan === 'full_year';
}

const SESSION_ID = /^cs_[A-Za-z0-9_]{8,200}$/;
export function looksLikeSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID.test(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function looksLikeUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export type CardSetup = { url: string; sessionId: string };

/**
 * Create the Stripe customer and the card-setup page for one standing order.
 * Returns null when Stripe is not configured or anything fails; the caller then
 * tells the parent the truth (their booking is saved, we will follow up about the
 * card) instead of pretending a card step happened.
 */
export async function startCardSetup(
  db: SupabaseClient,
  input: {
    standingOrderId: string;
    studentId: string;
    plan: PlanKey;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
    origin: string;
    existingCustomerId?: string | null;
  },
): Promise<CardSetup | null> {
  if (!stripeConfigured()) return null;
  try {
    const customerId =
      input.existingCustomerId ||
      (
        await createStripeCustomer({
          email: input.parentEmail,
          name: input.parentName,
          phone: input.parentPhone,
          metadata: {
            standing_order_id: input.standingOrderId,
            student_id: input.studentId,
            plan: input.plan,
          },
        })
      ).id;

    const session = await createCardSetupSession({
      customerId,
      standingOrderId: input.standingOrderId,
      studentId: input.studentId,
      planKey: input.plan,
      successUrl: `${input.origin}/school/book/card-saved?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${input.origin}/school/book/card-cancelled?o=${input.standingOrderId}`,
    });

    const { error } = await db
      .from(STANDING_ORDERS_TABLE)
      .update({ billing_status: BILLING_STATUS.cardPending, stripe_customer_id: customerId })
      .eq('id', input.standingOrderId)
      .neq('billing_status', BILLING_STATUS.active);
    if (error) console.error('[school-billing] could not mark card_pending:', error.message);

    return { url: session.url, sessionId: session.id };
  } catch (e) {
    console.error('[school-billing] card setup failed:', (e as Error).message);
    return null;
  }
}

export type RecordResult =
  | { ok: true; standingOrderId: string; brand: string | null; last4: string | null }
  | {
      ok: false;
      reason:
        | 'stripe_not_configured'
        | 'not_ours'
        | 'not_complete'
        | 'no_payment_method'
        | 'stripe_error'
        | 'db_error';
      /** True when trying again later could succeed (a webhook should answer 500). */
      retry: boolean;
    };

/**
 * Turn a finished Stripe setup session into "a card is on file".
 *
 * Called from the return page AND the webhook, so it has to be safe to run twice
 * and in either order. It never downgrades a standing order that Phil has already
 * activated, and it verifies the session really is one of ours before trusting it.
 */
export async function recordCardFromSession(
  db: SupabaseClient,
  sessionId: string,
): Promise<RecordResult> {
  if (!stripeConfigured()) return { ok: false, reason: 'stripe_not_configured', retry: false };

  let session;
  try {
    session = await getCheckoutSession(sessionId);
  } catch (e) {
    console.error('[school-billing] could not read setup session:', (e as Error).message);
    return { ok: false, reason: 'stripe_error', retry: true };
  }

  const meta = session.metadata ?? {};
  if (
    session.mode !== 'setup' ||
    meta.business !== STRIPE_BUSINESS ||
    meta.purpose !== CARD_SETUP_PURPOSE ||
    !looksLikeUuid(meta.standing_order_id)
  ) {
    return { ok: false, reason: 'not_ours', retry: false };
  }
  if (session.status !== 'complete') return { ok: false, reason: 'not_complete', retry: false };

  const intent = typeof session.setup_intent === 'object' ? session.setup_intent : null;
  const paymentMethodId = intent?.payment_method;
  if (!intent || intent.status !== 'succeeded' || typeof paymentMethodId !== 'string') {
    return { ok: false, reason: 'no_payment_method', retry: false };
  }

  let brand: string | null = null;
  let last4: string | null = null;
  try {
    const pm = await getPaymentMethod(paymentMethodId);
    brand = pm.card?.brand ?? null;
    last4 = pm.card?.last4 ?? null;
  } catch (e) {
    // Display only. The card is saved whether or not we can label it.
    console.error('[school-billing] could not read payment method:', (e as Error).message);
  }

  const standingOrderId = meta.standing_order_id;
  const { data, error } = await db
    .from(STANDING_ORDERS_TABLE)
    .update({
      billing_status: BILLING_STATUS.cardSaved,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      stripe_payment_method_id: paymentMethodId,
      card_brand: brand,
      card_last4: last4,
      card_saved_at: new Date().toISOString(),
    })
    .eq('id', standingOrderId)
    // A retry or a late webhook must never knock an activated plan back to "saved".
    .neq('billing_status', BILLING_STATUS.active)
    .select('id');

  if (error) {
    console.error('[school-billing] could not record card:', error.message);
    return { ok: false, reason: 'db_error', retry: true };
  }

  // Zero rows is fine: either already active, or recorded by the other path first.
  void data;
  return { ok: true, standingOrderId, brand, last4 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly billing events (after Phil approves a family)
//
// RULES (Phil, 2026-10-17):
//   * Failed payment: Stripe retries on its own schedule, the plan is marked past_due, Phil gets one
//     alert. Rides pause after 7 days unpaid: TassyOps shows the day count and the "pause rides" flag;
//     nothing is cancelled automatically. A later successful payment puts the plan back to active.
//   * Cancel: stops at the end of the paid month (set in TassyOps; Stripe sends subscription.deleted
//     when the month ends). No prorated refund.
//   * Refunds: decided by Phil, one at a time, in Stripe. Nothing here refunds anything.
// ─────────────────────────────────────────────────────────────────────────────

export const SCHOLAR_BILLING_EVENTS = new Set([
  'invoice.payment_failed',
  'invoice.paid',
  'customer.subscription.deleted',
]);

/** After this many days unpaid, rides are paused (shown in TassyOps; a person acts on it). */
export const PAST_DUE_PAUSE_DAYS = 7;

type BillingObject = {
  id?: string;
  subscription?: string | { id?: string } | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
};

/** The subscription an event is about. Newer API versions nest it under parent.subscription_details. */
export function subscriptionIdOf(type: string, obj: BillingObject | undefined): string | null {
  if (!obj) return null;
  if (type === 'customer.subscription.deleted') return typeof obj.id === 'string' ? obj.id : null;
  const direct = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id ?? null;
  return direct ?? obj.parent?.subscription_details?.subscription ?? null;
}

export type SubscriptionEventResult = {
  handled: 'past_due' | 'recovered' | 'canceled' | 'not_ours' | 'noop';
  /** True when trying again later could succeed (the webhook should answer 500). */
  retry: boolean;
  standingOrderId?: string;
};

export async function applySubscriptionEvent(
  db: SupabaseClient,
  type: string,
  obj: BillingObject | undefined,
  now: Date = new Date(),
): Promise<SubscriptionEventResult> {
  const subId = subscriptionIdOf(type, obj);
  if (!subId) return { handled: 'not_ours', retry: false };

  const { data: row, error } = await db
    .from(STANDING_ORDERS_TABLE)
    .select('id, billing_status, billing_past_due_at')
    .eq('stripe_subscription_id', subId)
    .maybeSingle();
  if (error) {
    console.error('[school-billing] subscription lookup failed:', error.message);
    return { handled: 'noop', retry: true };
  }
  // Facility invoices and anything else on the account are not ours.
  if (!row) return { handled: 'not_ours', retry: false };

  const id = row.id as string;
  const status = row.billing_status as string;
  const stamp = now.toISOString();

  const write = async (patch: Record<string, unknown>) => {
    const { error: writeError } = await db.from(STANDING_ORDERS_TABLE).update(patch).eq('id', id);
    if (writeError) {
      console.error('[school-billing] could not record billing event:', writeError.message);
      return false;
    }
    return true;
  };

  if (type === 'customer.subscription.deleted') {
    if (status === BILLING_STATUS.canceled) return { handled: 'noop', retry: false, standingOrderId: id };
    if (!(await write({ billing_status: BILLING_STATUS.canceled, billing_canceled_at: stamp }))) {
      return { handled: 'noop', retry: true };
    }
    return { handled: 'canceled', retry: false, standingOrderId: id };
  }

  if (type === 'invoice.payment_failed') {
    if (status === BILLING_STATUS.canceled || status === BILLING_STATUS.pastDue) {
      return { handled: 'noop', retry: false, standingOrderId: id };
    }
    if (!(await write({ billing_status: BILLING_STATUS.pastDue, billing_past_due_at: row.billing_past_due_at ?? stamp }))) {
      return { handled: 'noop', retry: true };
    }
    return { handled: 'past_due', retry: false, standingOrderId: id };
  }

  if (type === 'invoice.paid') {
    if (status !== BILLING_STATUS.pastDue) return { handled: 'noop', retry: false, standingOrderId: id };
    if (!(await write({ billing_status: BILLING_STATUS.active, billing_past_due_at: null }))) {
      return { handled: 'noop', retry: true };
    }
    return { handled: 'recovered', retry: false, standingOrderId: id };
  }

  return { handled: 'noop', retry: false };
}
