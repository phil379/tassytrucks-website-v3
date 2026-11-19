/**
 * Booking-time stops (Phil's decision, 2026-11-19).
 *
 * A rider scheduling on the website can add ONE stop per leg — pickup -> stop
 * -> destination on the way there, and destination -> stop -> pickup on the
 * way back of a round trip. Phil's case for the return leg: the ride to the
 * hospital is usually direct; the stop (the pharmacy) belongs on the way home.
 * Winnie's case is the same shape: vet -> pet store -> home, the driver
 * waiting WITH the pet.
 *
 * The settled policy, priced in lib/quote.ts:
 *   - each leg prices on its own route — the normal mileage band for that
 *     leg's total driving miles THROUGH its stop;
 *   - PLUS a flat stop fee per leg that has a stop, kept as its own price
 *     component (never blended into the band price — the same discipline as
 *     the assist add-ons);
 *   - the fee includes STOP_INCLUDED_WAIT_MINUTES of waiting at the stop;
 *     beyond that, waiting is STOP_WAIT_BLOCK_CENTS per started
 *     STOP_WAIT_BLOCK_MINUTES block, billed after the ride (collection
 *     machinery is a separate build — the terms are what is published here).
 *
 * Every number and every customer-facing sentence about stops derives from
 * this module, so the form, the quote engine, the stored record and the
 * /refunds page can never drift apart. TassyOps carries its own copy of the
 * included-wait minutes for display (src/lib/trip-stop.ts there), pinned by
 * its tests, the same cross-repo pattern as the published price cards.
 */

/** Flat fee for one stop on one leg, in cents. */
export const STOP_FEE_CENTS = 1000;
/** Waiting at the stop included in the stop fee, in minutes. */
export const STOP_INCLUDED_WAIT_MINUTES = 15;
/** Charge per started wait block beyond the included minutes, in cents. */
export const STOP_WAIT_BLOCK_CENTS = 1000;
/** Length of one wait block beyond the included minutes, in minutes. */
export const STOP_WAIT_BLOCK_MINUTES = 15;

/**
 * Lines a stop can be booked on. Winnie is included in the machinery even
 * though Winnie bookings are not open yet (join list only): the capability
 * is gated by exactly the same bookability as the rest of the Winnie form,
 * so it is live the day Winnie bookings open and changes nothing today.
 * Scholar rides are fixed school routes — no stops.
 */
export const STOP_SERVICE_LINES: readonly string[] = ['care', 'recovery', 'concierge', 'winnie'];

/** True when a stop may be added to a booking on this line ('pet' is the legacy Winnie alias). */
export function stopAvailable(serviceLine: string): boolean {
  return STOP_SERVICE_LINES.includes(serviceLine) || serviceLine === 'pet';
}

/** Which leg of a trip a stop control belongs to. */
export type StopLeg = 'single' | 'outbound' | 'return';

const usd = (cents: number): string => `$${Math.round(cents / 100)}`;

/** "$10" — the stop fee, from the constant. */
export const stopFeeText = (): string => usd(STOP_FEE_CENTS);

/** "$10" — one wait block, from the constant. */
export const stopWaitBlockText = (): string => usd(STOP_WAIT_BLOCK_CENTS);

/** Section heading over a stop control. */
export function stopHeading(leg: StopLeg): string {
  if (leg === 'outbound') return 'Stopping on the way there?';
  if (leg === 'return') return 'Stopping on the way back?';
  return 'Stopping on the way?';
}

/** The button that opens a stop control. */
export function stopButtonLabel(leg: StopLeg): string {
  if (leg === 'outbound') return 'Add a stop on the way there';
  if (leg === 'return') return 'Add a stop on the way back';
  return 'Add a stop';
}

/**
 * Phil's inviting line, in his framing, per line and leg. The passenger
 * lines carry his hospital/pharmacy framing; Winnie carries the same shape
 * for the vet and the pet store.
 */
export function stopIntro(serviceLine: string, leg: StopLeg): string {
  const pet = serviceLine === 'winnie' || serviceLine === 'pet';
  if (pet) {
    return leg === 'outbound'
      ? 'On the way there, you may want to stop at the pet store for food or supplies. Add a stop and we price the whole trip up front.'
      : 'After the vet, you may want to stop at the pet store for food or supplies before going home. Add a stop and we price the whole trip up front.';
  }
  return leg === 'outbound'
    ? 'On the way there, you may want to stop at your pharmacy or pick up what you need. Add a stop and we price the whole trip up front.'
    : 'After the hospital or an appointment, you may want to stop at your pharmacy or pick up what you need before going home. Add a stop and we price the whole trip up front.';
}

/** The wait terms in small print under a stop control — every number derived. */
export const STOP_TERMS_LINE = `${stopFeeText()} per stop, ${STOP_INCLUDED_WAIT_MINUTES} minutes of waiting included — after that, ${stopWaitBlockText()} per ${STOP_WAIT_BLOCK_MINUTES} minutes, billed after the ride.`;

/** The stop-fee line in the price box, e.g. "Stop fee (15 min waiting included) — $10". */
export function stopFeeLine(leg: StopLeg, feeCents: number): string {
  const label =
    leg === 'outbound'
      ? 'Stop fee on the way there'
      : leg === 'return'
        ? 'Stop fee on the way back'
        : 'Stop fee';
  return `${label} (${STOP_INCLUDED_WAIT_MINUTES} min waiting included) — ${usd(feeCents)}`;
}

/** One leg's stop, as the notification emails name it. */
export type TripStopSummary = {
  leg: 'outbound' | 'return';
  /** "Stop on the way" / "Stop on the way back" — the legs never merge. */
  label: string;
  /** "<address> ($10 stop fee, 15 minutes of waiting included)". */
  value: string;
};

/**
 * The stops on a trip, one summary per leg that has one — empty when the
 * trip has no stop, so a no-stop email renders exactly as it did before
 * stops existed. The fee and the included wait derive from the constants
 * above, never hand-typed, so an email cannot quote different stop terms
 * than the form and the /refunds page. Reads the same address fields the
 * form input and the stored row carry (stopAddress / returnStopAddress).
 */
export function tripStopSummaries(data: {
  stopAddress?: string | null;
  returnStopAddress?: string | null;
}): TripStopSummary[] {
  const summaries: TripStopSummary[] = [];
  const stop = data.stopAddress?.trim();
  if (stop) {
    summaries.push({
      leg: 'outbound',
      label: 'Stop on the way',
      value: `${stop} (${stopFeeText()} stop fee, ${STOP_INCLUDED_WAIT_MINUTES} minutes of waiting included)`,
    });
  }
  const back = data.returnStopAddress?.trim();
  if (back) {
    summaries.push({
      leg: 'return',
      label: 'Stop on the way back',
      value: `${back} (${stopFeeText()} stop fee, ${STOP_INCLUDED_WAIT_MINUTES} minutes of waiting included)`,
    });
  }
  return summaries;
}

/** "Stop on the way: <address> ($10 stop fee, 15 minutes of waiting included)". */
export function stopSummaryLine(summary: TripStopSummary): string {
  return `${summary.label}: ${summary.value}`;
}

/**
 * Address comparison for the "the stop is one of the trip's own ends" rule:
 * case, spacing and trailing punctuation do not make two addresses different.
 */
export function normalizeAddressForCompare(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/[.,]+$/g, '')
    .replace(/\s+/g, ' ');
}

export function addressesMatch(a: string, b: string): boolean {
  const na = normalizeAddressForCompare(a);
  return na.length > 0 && na === normalizeAddressForCompare(b);
}

/** Two coordinate pairs are the same place when they agree to ~50 metres. */
export function coordinatesMatch(
  a: { lat?: number | null; lng?: number | null },
  b: { lat?: number | null; lng?: number | null },
): boolean {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return false;
  return Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005;
}
