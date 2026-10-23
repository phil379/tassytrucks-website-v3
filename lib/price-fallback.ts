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

import type { QuoteResult } from './quote';

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

/** Same marker, other cause: the trip is longer than the last price band, so a person quotes it. */
export function beyondBandsNote(miles: number | null): string {
  const about = miles != null ? ` (about ${miles} miles)` : '';
  return (
    `${NEEDS_PRICE_MARKER} No price was computed: the trip is longer than the published rates cover${about}. ` +
    'Quote the trip and confirm the price with the customer before anything is charged.'
  );
}

/**
 * Does this estimate result leave the row with no price a dispatcher must supply, and if so what
 * goes in internal_notes? Two cases, one marker:
 *   null                      an end could not be placed (typed address, no ZIP)
 *   quote-only, beyond-bands  past the last price band
 * Scholar and other quoted lines are NOT here: they are priced by plan, not missing a price.
 */
export function unpricedFor(
  quoted: QuoteResult | null,
  ends: UnpricedEnds,
): { priceUnavailable: boolean; note: string | null } {
  if (quoted === null) return { priceUnavailable: true, note: needsPriceNote(ends) };
  if (quoted.kind === 'quote-only' && quoted.reason === 'beyond-bands') {
    return { priceUnavailable: true, note: beyondBandsNote(quoted.miles) };
  }
  return { priceUnavailable: false, note: null };
}

export function isNeedsPrice(note: string | null | undefined): boolean {
  return typeof note === 'string' && note.startsWith(NEEDS_PRICE_MARKER);
}

// ─────────────────────────────────────────────────────────────────────────────
// How a quoted price is LABELLED, in one place, for the panel, the confirmation
// screen and the auto-reply email.
//
//   firm   one number, both addresses picked   "Your price"
//   range  low and high differ                 "Estimated price" - NEVER "Your price"
//   zip    one number from ZIP centroids       "Estimated price"
//
// A range is not a price the customer was promised, so it must never be called "Your price"
// or "the price you saw when you booked" (it used to be, whenever both addresses were picked
// but the drive distance could not be measured).
// ─────────────────────────────────────────────────────────────────────────────

/** Shown in the price panel, in place of a price, while address suggestions are working. */
export const PICK_TO_SEE_PRICE = 'Pick your address to see your price';

/** Follows any price range, on screen and in the email. */
export const PRICE_RANGE_NOTE = 'A dispatcher will confirm the exact price before you’re charged.';

export type PriceKind = 'firm' | 'range' | 'zip';

/** "$89–$99" (or an old-style "$89 – $99"): two dollar amounts joined by a dash. */
const RANGE_TEXT = /\$\d[\d,]*\s*[–-]\s*\$\d/;

export function priceKind(p: { exact: boolean; range?: boolean; text?: string }): PriceKind {
  // The flag is the contract; the text is a backstop, so a range can never be labelled "Your
  // price" because some caller forgot to set the flag.
  if (p.range || (p.text !== undefined && RANGE_TEXT.test(p.text))) return 'range';
  return p.exact ? 'firm' : 'zip';
}

export const priceLabel = (kind: PriceKind): 'Your price' | 'Estimated price' =>
  kind === 'firm' ? 'Your price' : 'Estimated price';
