/**
 * Cancellation, no-show and refund numbers, in ONE place. The /refunds page, the
 * request form and the confirmation email read from here.
 *
 * STATUS: PROPOSED. These are drafts for Phil's approval and for counsel's review.
 * Nothing here is legal advice. Merging the PR that contains this file is Phil's
 * approval; change a number here and every page that quotes it changes with it.
 *
 * ── Where the numbers come from ────────────────────────────────────────────────
 * Phil (2026-10-24) proposed: Care / Concierge / Recovery / Winnie free to cancel
 * until 2 hours before pickup; Treatment Day free until 24 hours before; Scholar
 * free until 24 hours before. Late cancel = 50% of the trip (50% of the fare for
 * Treatment Day); no-show = 100%. Tassy cancels or has no driver = full refund.
 *
 * CONFLICT WITH THE CODE, so the code's number is kept (Phil's instruction):
 *   lib/confirmation-email.ts has told every customer with a confirmed trip, in
 *   writing, "No fee if you let us know at least 4 hours ahead." That is the number
 *   already promised, so it is used for Care, Concierge, Recovery, Winnie AND
 *   Treatment Day (24 hours would be stricter than what customers were told).
 *   Phil's 2-hour and 24-hour figures are kept below as PHIL_PROPOSED so he can
 *   decide to change the email and these numbers together.
 *   lib/school-billing.ts (Phil, 2026-10-17): a Scholar monthly plan stops at the end
 *   of the paid month, with no prorated refund, and refunds are decided one at a
 *   time. That is used for Scholar's monthly plan; Phil's 24-hour / one-ride rule
 *   applies to the per-ride Scholar plans (Weekly and After-School).
 * No code in the pricing path charges a cancellation fee or issues a refund today:
 * fees and refunds are handled by hand by Phil (Stripe / TassyOps).
 */

export const REFUND_POLICY_STATUS: 'PROPOSED' | 'APPROVED' = 'PROPOSED';
export const REFUND_POLICY_UPDATED = 'October 24, 2026';

export const CANCELLATION = {
  /** Care, Concierge, Recovery and Winnie Ride. */
  trip: {
    freeUntilHoursBefore: 4,
    lateCancelFeePercent: 50,
    noShowFeePercent: 100,
  },
  /** Treatment Day round trips. The fee is a share of the flat round-trip fare. */
  treatmentDay: {
    freeUntilHoursBefore: 4,
    lateCancelFeePercent: 50,
    noShowFeePercent: 100,
  },
  /** Scholar plans billed per ride (Weekly Pattern, After-School Activities). */
  scholarPerRide: {
    freeUntilHoursBefore: 24,
    /** A late cancel or no-show is charged as this many rides. */
    lateCancelOrNoShowRides: 1,
  },
  /** Scholar Full School Year (monthly). Matches lib/school-billing.ts. */
  scholarMonthly: {
    endsAtEndOfPaidMonth: true,
    prorated: false,
  },
  /** If Tassy cancels, or no driver is available: full refund. */
  tassyCancelsRefundPercent: 100,
  /** How soon after a refund is approved we start it. PROPOSED. */
  refundStartBusinessDays: 3,
  /** Tassy may waive a fee case by case. */
  mayWaiveCaseByCase: true,
} as const;

/** What Phil proposed on 2026-10-24, kept so a change is a one-line decision. */
export const PHIL_PROPOSED = {
  tripFreeUntilHoursBefore: 2,
  treatmentDayFreeUntilHoursBefore: 24,
} as const;

export const REFUNDS_PATH = '/refunds';
export const REFUNDS_URL = 'https://www.tassytrucks.com/refunds';

/** The one sentence that goes into the booking email and next to the request button. */
export function freeCancellationSentence(): string {
  return `No fee if you let us know at least ${CANCELLATION.trip.freeUntilHoursBefore} hours ahead of pickup.`;
}
