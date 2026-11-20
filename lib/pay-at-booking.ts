/**
 * Pay at booking (Phil, decided 2026-11-20).
 *
 * A rider booking with a FIRM price pays that price when they book — at the
 * moment of booking, on Stripe's page, for exactly the number the form showed
 * them. The booking is confirmed by the same confirmTrip path a dispatcher
 * uses (lib/ops-confirm.ts), so there is one confirmation code, one payment
 * link and one confirmation email per trip, never a second money path.
 *
 * WHY (Phil's words, at Marianne's pickup): on an unpaid booking, nothing
 * guarantees the driver's pay if the rider cancels when the driver arrives.
 * The late-cancel and no-show fees only collect when there is a payment to
 * collect from.
 *
 * THE EXCEPTIONS — review-first bookings keep dispatcher-quote-then-pay-link,
 * exactly the list Phil approved keeping, no wider and no narrower:
 *   - wheelchair rides: they run on partner-network vehicles and a dispatcher
 *     reviews them first (any line, Care WAV included — the WAV card is a
 *     firm published price, but the ride is still review-first by decision);
 *   - trips with no firm price at form time: a price range, a ZIP estimate,
 *     or a trip past the last band that a dispatcher quotes ("call us" work).
 * Facility bookings are on account or passenger-pay through the facility
 * flow and never come through here; Scholar is plan-billed and untouched.
 *
 * Winnie Ride is IN the line list on purpose: it sits behind its join-list
 * lock today (no live bookings), and when it opens its bookings should pay
 * at booking like the other firm-price lines, not grow a second flow.
 */

export const PAY_AT_BOOKING_LINES: readonly string[] = ['care', 'recovery', 'concierge', 'winnie'];

/**
 * Is this line + passenger a pay-at-booking combination at all? Price and
 * channel are separate questions — see payAtBookingEligible. The form uses
 * this to choose its payment wording; the server uses the full predicate to
 * decide whether money moves.
 */
export function payAtBookingLine(
  serviceLine: string | null | undefined,
  mobility?: string | null,
): boolean {
  if (!serviceLine || !PAY_AT_BOOKING_LINES.includes(serviceLine)) return false;
  // Wheelchair = partner-network vehicle = dispatcher review first, on any line.
  if (mobility === 'wheelchair') return false;
  return true;
}

/**
 * May THIS booking be confirmed and charged at booking time? All four must hold:
 * a pay-at-booking line, a retail booking (not a facility one), and a firm
 * price — one number, measured from picked addresses, that the rider was
 * actually shown as "Your price" (lib/price-fallback.ts: a range and a ZIP
 * estimate are estimates, not promises, and are never charged at booking).
 */
export function payAtBookingEligible(input: {
  serviceLine: string | null | undefined;
  mobility?: string | null;
  facility: boolean;
  price: { exact: boolean; lowCents: number; highCents: number } | null;
}): boolean {
  if (input.facility) return false;
  if (!payAtBookingLine(input.serviceLine, input.mobility)) return false;
  const p = input.price;
  return Boolean(p && p.exact && p.lowCents === p.highCents && p.lowCents > 0);
}
