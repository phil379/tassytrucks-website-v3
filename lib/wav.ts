/**
 * Tassy Care WAV (wheelchair rides): who runs them, and the switch for the new "book and pay" wording.
 *
 * Tassy owns no wheelchair van. These rides are run in ramp-equipped vehicles that belong to
 * partners in our partner network, so nothing on the site may say or imply otherwise: no
 * ownership wording about the vehicles, and no licensing, insurance or ADA claim for these rides
 * until the code and a bound policy back it. scripts/test-wav-copy.ts fails on those phrases.
 *
 * THE SWITCH changes NO price, band or booking behaviour: the Care WAV card prices and bookings
 * work exactly the same ON or OFF (lib/quote.ts). NEXT_PUBLIC_WAV_LIVE=true only turns on the
 * "book and pay at the card price" wording on the booking form and the wheelchair price tables.
 * Anything else (unset, "false", "0") is OFF. Phil flips it in the Vercel environment settings
 * once the partner paperwork is in, then redeploys (read at build time). A PR never changes it.
 *
 * Read at call time, not at import, so a test can flip it. No imports: lib/quote.ts depends on it.
 */
export function wavLive(): boolean {
  return process.env.NEXT_PUBLIC_WAV_LIVE === 'true';
}

/** The one description of how a wheelchair ride is run. Reuse it; do not paraphrase it. */
export const WAV_PARTNER_LINE =
  'Wheelchair rides are run in ramp-equipped vehicles from our partner network.';

/**
 * EVERY SENTENCE THAT DESCRIBES WHEELCHAIR AS PRICED OR BOOKABLE LIVES HERE, and is rendered only
 * through the helpers below, which return nothing while the switch is OFF. scripts/test-wav-copy.ts
 * fails if any of these phrases appears in a page, component or library file other than this one.
 * Do not turn the switch ON until Phil confirms the partner paperwork (see the PR's "Needs Phil").
 */
export const WAV_BOOK_AND_PAY_NOTE =
  'Book at this price. When a dispatcher confirms your ride, we send a payment link.';
export const WAV_PRICE_ON_PAGE_CLAUSE = 'and the price is on our pricing page';
export const WAV_STANDARD_BOOKING_CLAUSE =
  'wheelchair rides in partner-network vehicles are a standard booking, not a special request';

/** The "Book at this price" note, or '' while the switch is OFF. */
export function wavBookAndPayNote(): string {
  return wavLive() ? WAV_BOOK_AND_PAY_NOTE : '';
}

/** /accessibility: OFF is the neutral sentence; ON adds the pricing-page clause. */
export function wavAccessibilitySentence(): string {
  return wavLive()
    ? `You stay in your chair for the whole trip, ${WAV_PRICE_ON_PAGE_CLAUSE}.`
    : 'You stay in your chair for the whole trip.';
}

/** /partners: OFF is neutral partner-network wording; ON may call it a standard booking. */
export function wavPartnersClause(): string {
  return wavLive()
    ? WAV_STANDARD_BOOKING_CLAUSE
    : 'wheelchair rides are run in ramp-equipped vehicles from our partner network';
}
