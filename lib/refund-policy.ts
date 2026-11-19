import { CONCIERGE } from '@/lib/quote';

/**
 * Cancellation, no-show and refund numbers, in ONE place. The /refunds page, the
 * request form and the confirmation email read from here.
 *
 * STATUS: PROPOSED. These are drafts for Phil's approval and for counsel's review.
 * Nothing here is legal advice. Merging the PR that contains this file is Phil's
 * approval; change a number here and every page that quotes it changes with it.
 * One number is no longer a draft: the trip cancellation window was DECIDED by
 * Phil on 2026-11-18 (see below).
 *
 * ── Where the numbers come from ────────────────────────────────────────────────
 * Phil (2026-10-24) proposed: Care / Concierge / Recovery / Winnie free to cancel
 * until 2 hours before pickup; Treatment Day free until 24 hours before; Scholar
 * free until 24 hours before. Late cancel = 50% of the trip (50% of the fare for
 * Treatment Day); no-show = 100%. Tassy cancels or has no driver = full refund.
 *
 * From Oct 24 the code kept 4 hours for trips and Treatment Day, because
 *   lib/confirmation-email.ts had already told every customer with a confirmed
 *   trip, in writing, "No fee if you let us know at least 4 hours ahead" — the
 *   number already promised won over the number proposed.
 * DECIDED 2026-11-18 (Phil, on market grounds — "four hours, that's a lot"):
 *   the trip window is now 2 hours, for riders and facilities, everywhere.
 *   The confirmation email derives its sentence from this file, so bookings
 *   confirmed from this change on promise 2 hours. Bookings confirmed before
 *   it were promised 4 hours in writing — honour the promise those customers
 *   hold. Treatment Day was not part of the Nov 18 decision: it stays at
 *   4 hours, and Phil's 24-hour figure for it stays in PHIL_PROPOSED until
 *   he rules on it.
 *   lib/school-billing.ts (Phil, 2026-10-17): a Scholar monthly plan stops at the end
 *   of the paid month, with no prorated refund, and refunds are decided one at a
 *   time. That is used for Scholar's monthly plan; Phil's 24-hour / one-ride rule
 *   applies to the per-ride Scholar plans (Weekly and After-School).
 * No code in the pricing path charges a cancellation fee or issues a refund today:
 * fees and refunds are handled by hand by Phil (Stripe / TassyOps).
 *
 * -- CONCIERGE NO-SHOW (Phil, approved 2026-11-12) -- FOR COUNSEL REVIEW --
 * A Concierge no-show is a FLAT $35 fee. Long Concierge trips keep the Oct 24 rule:
 * 100% of the trip price. "Long" = over conciergeNoShow.longTripOverMiles, which is READ from
 * the Concierge price card's last band (lib/quote.ts, CONCIERGE), today 30 miles: any trip the
 * website does not price. Exactly 30 is still priced, so it is not long. Phil confirmed this
 * definition on 2026-11-12. Change the card and the no-show threshold moves with it. Waivable case by case
 * (mayWaiveCaseByCase). Every other line keeps the Oct 24 numbers above. Counsel should
 * review this wording before it is relied on. Still nothing charges it in code.
 */

/**
 * The furthest a Concierge trip can go and still get a website price: the last band of the
 * Concierge card. A trip OVER this is a "long trip" for the no-show rule (Phil, 2026-11-12).
 */
export const CONCIERGE_PRICED_MAX_MILES: number = CONCIERGE.bands[CONCIERGE.bands.length - 1]!.upToMiles;

export const REFUND_POLICY_STATUS: 'PROPOSED' | 'APPROVED' = 'PROPOSED';
export const REFUND_POLICY_UPDATED = 'November 18, 2026';

export const CANCELLATION = {
  /** Care, Concierge, Recovery and Winnie Ride. Window DECIDED 2026-11-18. */
  trip: {
    freeUntilHoursBefore: 2,
    lateCancelFeePercent: 50,
    noShowFeePercent: 100,
  },
  /**
   * Treatment Day round trips. The fee is a share of the flat round-trip fare.
   * Still 4 hours: the 2026-11-18 decision covered the trip window only.
   */
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
  /**
   * Tassy Concierge no-show (Phil, 2026-11-12; FOR COUNSEL REVIEW). A flat fee instead of 100%,
   * except long trips, which keep 100% of the trip price.
   */
  conciergeNoShow: {
    flatFeeCents: 3500,
    /** The last mileage the website prices for Concierge. Never typed: read from the card. */
    longTripOverMiles: CONCIERGE_PRICED_MAX_MILES,
    longTripNoShowFeePercent: 100,
    counselReview: true,
  },
} as const;

/** "$35", from the config, so the page never types the amount. */
export function conciergeNoShowFeeText(): string {
  return `$${(CANCELLATION.conciergeNoShow.flatFeeCents / 100).toFixed(0)}`;
}

/**
 * What Phil proposed on 2026-10-24 that is still only a proposal. The trip
 * figure (2 hours) was adopted on 2026-11-18 and now lives in
 * CANCELLATION.trip; the Treatment Day figure stays here until he rules.
 */
export const PHIL_PROPOSED = {
  treatmentDayFreeUntilHoursBefore: 24,
} as const;

export const REFUNDS_PATH = '/refunds';
export const REFUNDS_URL = 'https://www.tassytrucks.com/refunds';

/** The one sentence that goes into the booking email and next to the request button. */
export function freeCancellationSentence(): string {
  return `No fee if you let us know at least ${CANCELLATION.trip.freeUntilHoursBefore} hours ahead of pickup.`;
}
