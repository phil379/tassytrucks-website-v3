/**
 * What happens when a trip cannot be priced.
 *
 * estimateTrip() returns null when it cannot place both ends: an address typed instead
 * of picked has no coordinates, and the text may carry no ZIP either. The booking is
 * still captured (a booking form must never refuse a customer), but three things now
 * have to be true so that nobody is left guessing:
 *
 *   1. the customer is TOLD a dispatcher will confirm the price, on the confirmation
 *      screen and in the auto-reply email, rather than seeing nothing where a price was
 *      promised;
 *   2. the row is MARKED, so a dispatcher finds it in the queue as a trip that needs a
 *      price and not as one somebody forgot;
 *   3. the operator alert says so too.
 *
 * Wording lives here, once, so the screen, the email and the tests cannot drift apart.
 */

/** Inline error under an address field that holds typed text instead of a picked place. */
export const PICK_ADDRESS_MESSAGE = 'Pick your address from the list so we can show your price';

/** Shown to the customer, in the confirmation screen and in the auto-reply email. */
export const PRICE_PENDING_MESSAGE = 'A dispatcher will confirm your price before anything is charged.';

/**
 * Written to trip_requests.internal_notes, which the /ops queue already shows. A fixed
 * prefix, not free text, so a queue filter can find every row that needs a price.
 */
export const NEEDS_PRICE_MARKER = '[NEEDS PRICE]';

export type UnpricedEnds = { pickup: boolean; dropoff: boolean };

export function needsPriceNote(ends: UnpricedEnds): string {
  const which =
    ends.pickup && ends.dropoff
      ? 'neither address was picked from the suggestions'
      : ends.pickup
        ? 'the pickup address was typed, not picked from the suggestions'
        : ends.dropoff
          ? 'the destination was typed, not picked from the suggestions'
          : 'the distance could not be worked out';
  return (
    `${NEEDS_PRICE_MARKER} No price was computed: ${which}, and the typed text has no ZIP to ` +
    'measure from. Quote the trip and confirm the price with the customer before anything is charged.'
  );
}

export function isNeedsPrice(note: string | null | undefined): boolean {
  return typeof note === 'string' && note.startsWith(NEEDS_PRICE_MARKER);
}
