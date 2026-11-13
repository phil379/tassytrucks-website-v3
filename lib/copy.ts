/**
 * Decided facts that more than one page states. They live here and nowhere else.
 *
 * WHY (Muse re-test, 2026-11-13): most of the wording failures were one fact typed on several
 * pages and later corrected on only some of them - invoicing terms, the service area, the Winnie
 * lead time, how Treatment Day works. A page that states one of these renders the constant, so
 * the next change is one edit. scripts/banned-claims/ blocks the old wordings from coming back.
 */

/** Facility accounts (Phil, Oct 2026): never monthly, never on 30-day terms. */
export const FACILITY_INVOICING = 'weekly on 7-day terms';

/** Where we drive. No town lists: the launch zones are inside the county (Phil, Oct 2026). */
export const SERVICE_AREA = 'Charlotte and Mecklenburg County';

/** Winnie Ride routine rides (Phil, Nov 13 2026). */
export const WINNIE_LEAD_HOURS = 4;
/** "four", for sentences. Keep beside the number so they cannot drift. */
export const WINNIE_LEAD_WORD = 'four';

/** Treatment Day (Phil, Nov 13 2026): what the $11 over two Care rides buys. */
export const TREATMENT_DAY_DRIVER = 'held for your return';
