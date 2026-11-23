import { applyDiscount } from '@/lib/discounts';

/**
 * Black Friday 2026 (Phil, 2026-11-23): 10% off, one week, for commercial launch week.
 *
 * PURE and shared: the booking form (display), the trip-request route (the charge and the
 * stored record) and the site banner all read this one definition, so the price on screen,
 * the amount charged and the receipt can never disagree about what the offer is.
 *
 * Terms, as decided:
 *   - Keyed on BOOKING time, not pickup time: a ride booked inside the window gets the
 *     discount whatever day it runs; a ride booked before the window does not.
 *   - Window: Mon Nov 23, 2026 12:00 a.m. ET through Sun Nov 29, 2026 11:59:59 p.m. ET
 *     (the end constant is exclusive: midnight at the start of Mon Nov 30 ET).
 *   - 10% off the whole firm price the customer sees — bands, surcharges, stop fees and
 *     extras included, because the discount is taken on the estimate total.
 *   - Only a FIRM online price can carry it (exact, single figure). Ranges, ZIP estimates
 *     and quote-only lines have no online price to discount; dispatch quotes those by hand.
 *   - Hotel flat prices are excluded: they already carry their own introductory pricing
 *     and their own price guard. Facility bookings are excluded: facilities have their
 *     own private volume ladder.
 *   - The discount is stored on the trip row (discount_label / discount_cents) with the
 *     DISCOUNTED estimate, so the confirmation email and the receipt itemise it as
 *     "Discount — Black Friday" and foot exactly (lib/receipt-email.ts).
 *   - Driver pay is on the LIST fare, as with every program discount (lib/discounts.ts):
 *     the 10% comes out of Tassy's share, never the driver's.
 */

export const BLACK_FRIDAY = {
  code: 'black-friday-2026',
  /** What the receipt and the stored row call it. */
  label: 'Black Friday',
  pct: 10,
  startsAt: '2026-11-23T00:00:00-05:00',
  /** Exclusive: the first moment the offer is over. */
  endsAt: '2026-11-30T00:00:00-05:00',
} as const;

/** True when `at` falls inside the Black Friday window (Eastern wall clock via offsets). */
export function blackFridayActive(at: Date): boolean {
  const t = at.getTime();
  if (Number.isNaN(t)) return false;
  return t >= Date.parse(BLACK_FRIDAY.startsAt) && t < Date.parse(BLACK_FRIDAY.endsAt);
}

/** 10% off a firm price, in cents — the one rounding rule (lib/discounts.ts applyDiscount). */
export function blackFridayDiscount(listCents: number): { discountCents: number; agreedCents: number } {
  return applyDiscount(listCents, BLACK_FRIDAY.pct);
}
