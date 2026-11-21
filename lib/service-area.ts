/**
 * The Charlotte service area, and what happens to a booking whose PICKUP is outside it.
 *
 * WHY (breaker test, 2026-11-20): a scripted tester booked Tassy Care with a pickup at
 * 100 Fayetteville St, Raleigh — 140 miles away — and the form took it silently: a plain
 * "Request received" screen, no price, and a row in the queue that looked like any other
 * unpriced request. A real customer in Raleigh would have walked away believing they had
 * booked a ride, and the car would have had to drive hours empty before the trip started.
 *
 * Phil's decision (2026-11-20): NOT a refusal. The booking is still captured — a booking
 * form must never refuse a customer — but three things are now true, the same three the
 * unpriced flow (lib/price-fallback.ts) established:
 *
 *   1. the customer is TOLD, on the confirmation screen and in the booking-received
 *      email: this pickup is outside the Charlotte service area, this is NOT a
 *      confirmed booking, and Tassy will call with a quote;
 *   2. the row is MARKED in internal_notes with a fixed prefix, so dispatch finds it
 *      in the queue as an out-of-area quote and never mistakes it for a booking;
 *   3. the operator alert says so too.
 *
 * What this is NOT:
 *   - Not a price change. No band, fee or number moves; the quote a dispatcher gives
 *     on the call is the price, exactly as for every quote-first booking.
 *   - Not the long-distance flow. A Charlotte pickup with a far DROPOFF already lands
 *     as a beyond-bands quote request (lib/quote.ts) and is untouched: the trip itself
 *     is the long part there. Here the TRIP may be short — it is getting the car to
 *     the pickup that is out of area.
 *   - Not a facility rule. Facility bookings are never measured (their pickups are
 *     the facility's business); the route only calls this for retail bookings.
 *   - Not a pay-at-booking booking. Since pay-at-booking merged (PR #139), the
 *     route passes this flag into payAtBookingEligible (lib/pay-at-booking.ts),
 *     which refuses it: a flagged booking is never auto-confirmed or charged,
 *     however firm the price the form worked out for the trip itself. It lands
 *     as a plain quote request, exactly as this file's decision intends.
 *   - Not a block on unlocatable pickups. A typed address the system cannot place
 *     (no picked point, no ZIP it knows) has no coordinates to measure, so it is NOT
 *     flagged and keeps today's behaviour exactly — it lands unpriced with a
 *     [NEEDS PRICE] note when no price could be worked out.
 *
 * Wording lives here, once, so the screen, the email and the tests cannot drift apart.
 */

import { haversineMiles, type LatLng } from './quote';

/** Uptown Charlotte — Trade & Tryon. The anchor every pickup is measured from. */
export const SERVICE_AREA_CENTER: LatLng = { lat: 35.2271, lng: -80.8431 };

/** A pickup farther than this from Uptown is outside the service area (Phil, 2026-11-20). */
export const SERVICE_AREA_RADIUS_MILES = 40;

/** Shown to the customer, on the confirmation screen and in the booking-received email. */
export const OUT_OF_AREA_MESSAGE =
  'This pickup is outside our Charlotte service area, so this is not a confirmed booking. We will call you with a quote.';

/**
 * Written to trip_requests.internal_notes, which the /ops queue already shows. A fixed
 * prefix, not free text, so a queue filter can find every out-of-area row — the same
 * pattern as [NEEDS PRICE] in lib/price-fallback.ts.
 */
export const OUT_OF_AREA_MARKER = '[OUT OF AREA]';

/** Straight-line miles from Uptown Charlotte, or null when there is no point to measure. */
export function serviceAreaMiles(point: LatLng | null | undefined): number | null {
  if (!point) return null;
  return haversineMiles(SERVICE_AREA_CENTER, point);
}

/**
 * True only when the pickup HAS coordinates and they land beyond the ring. No
 * coordinates is not out of area — it is unmeasured, and the booking keeps today's
 * behaviour (see the header). Straight-line miles, deliberately: the ring is a
 * service boundary, not a price, and the road distance would only be longer.
 */
export function isOutOfAreaPickup(point: LatLng | null | undefined): boolean {
  const miles = serviceAreaMiles(point);
  return miles !== null && miles > SERVICE_AREA_RADIUS_MILES;
}

/** The internal_notes text for an out-of-area row. `miles` is the measured distance, when known. */
export function outOfAreaNote(miles: number | null): string {
  const where =
    miles != null
      ? `about ${Math.round(miles)} miles from Uptown Charlotte`
      : 'outside the Charlotte service area';
  return (
    `${OUT_OF_AREA_MARKER} The pickup is ${where} — beyond the ${SERVICE_AREA_RADIUS_MILES}-mile ` +
    'service area. Call the customer with a quote; this booking is not confirmed.'
  );
}

export function isOutOfAreaNote(note: string | null | undefined): boolean {
  return typeof note === 'string' && note.includes(OUT_OF_AREA_MARKER);
}
