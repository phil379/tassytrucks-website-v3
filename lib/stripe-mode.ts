/**
 * Live money or test money? Decided here, in one place, by rules that can be unit tested.
 *
 * WHY (2026-11-14): the pay links the site sends are Stripe LIVE mode, so a tester could not pay a
 * test booking: Stripe's test card is declined in live mode, and a real card would move real
 * money. Test bookings now get a Stripe TEST-mode link, paid with 4242 4242 4242 4242, so the
 * whole loop (pay, receipt email, receipt page, driver pay) can be proven with no money moving.
 *
 * THE RULES
 *   1. Test mode is used only for a trip stored with is_test_data = true. That flag is set by the
 *      server when the booking is made (lib/test-data.ts: a plus-tagged test address or a reserved
 *      test domain). It is never read from the request, and nothing here guesses.
 *   2. Test mode needs its own key, STRIPE_TEST_SECRET_KEY, and that key must be a test key
 *      (sk_test_ / rk_test_). A live key pasted into the test slot is refused, so a test booking
 *      can never charge a card by misconfiguration. With no test key, nothing changes: the trip
 *      gets the same live link it gets today.
 *   3. A test-mode payment can mark ONLY a test trip paid. A real trip can never be settled with
 *      the test card, whatever the event says.
 *   4. The live key and the live webhook secret are not read, changed or reused by this path.
 */

export type StripeMode = 'live' | 'test';

type Env = Record<string, string | undefined>;

/** The test key, only if it really is a test key. */
export function stripeTestKey(env: Env = process.env): string | null {
  const key = (env.STRIPE_TEST_SECRET_KEY ?? '').trim();
  return /^(sk|rk)_test_/.test(key) ? key : null;
}

/** Whether test-mode pay links can be made on this deployment. */
export function stripeTestModeReady(env: Env = process.env): boolean {
  return stripeTestKey(env) !== null;
}

/** Which Stripe a trip's pay link belongs to. `true` exactly, never truthy. */
export function stripeModeForTrip(trip: { is_test_data?: unknown } | null | undefined, env: Env = process.env): StripeMode {
  return trip?.is_test_data === true && stripeTestModeReady(env) ? 'test' : 'live';
}

/**
 * May a payment that arrived in this mode mark this trip paid?
 * Live money always may (unchanged behaviour). Test money only for a test trip.
 */
export function paymentMayMarkPaid(mode: StripeMode, trip: { is_test_data?: unknown } | null | undefined): boolean {
  return mode === 'live' || trip?.is_test_data === true;
}

/** Shown on the Stripe page, the receipt and anywhere else a test payment could be mistaken for money. */
export const TEST_PAYMENT_LABEL = 'TEST';
export const TEST_PAYMENT_NOTE = 'TEST BOOKING. No real charge: this page is in Stripe test mode.';
