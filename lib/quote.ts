import type { ServiceLine } from '@/lib/trip-request';
import { OPERATING_TIME_ZONE, parseLocalDateTime } from '@/lib/time';

/**
 * Instant trip estimator.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE CHANGING A NUMBER
 * ─────────────────────────────────────────────────────────────────────────────
 * Every figure in RATE_CARD is a PROPOSAL drawn from published competitor
 * pricing (sources in docs/PRICING_RESEARCH.md), not an approved price list.
 * Nothing here is shown to the public until SHOW_ESTIMATES is turned on.
 *
 * An estimate on a booking page is a promise a customer will hold you to, even
 * when it is labelled an estimate. So this engine is built to three rules:
 *
 *   1. IT RETURNS A RANGE, NEVER A SINGLE NUMBER. Straight-line distance is not
 *      road distance, traffic is not modelled, and the driver has not seen the
 *      building yet. A range tells the truth about that; a single number
 *      pretends to a precision nobody has.
 *
 *   2. IT NEVER QUOTES WHAT IT CANNOT MEASURE. No coordinates (the visitor
 *      typed an address instead of picking one) means no estimate — not a
 *      guess, not a city-average. `null` is a valid, correct answer here.
 *
 *   3. THE ESTIMATE IS STORED WITH THE ROW. Whatever number the customer was
 *      shown is written to the request, so a dispute six weeks later is settled
 *      by a record rather than by memory.
 */

/** Flip to true only once Phil has signed off on RATE_CARD. */
export const SHOW_ESTIMATES = false;

/**
 * Straight line under-reads real driving distance. Charlotte is a hub-and-spoke
 * city cut by I-77, I-85 and a rail corridor, so a crow-flies mile is closer to
 * 1.3 road miles here than the 1.2 typical of a grid city. Applied to the low
 * end; the high end assumes a worse detour.
 */
const ROAD_FACTOR_LOW = 1.25;
const ROAD_FACTOR_HIGH = 1.45;

export type Rate = {
  /** Flag-drop, in cents. */
  base: number;
  /** Per road mile, in cents. */
  perMile: number;
  /** Nothing quotes below this, in cents. */
  minimum: number;
  /** On-site wait included before the meter restarts, in minutes. */
  waitIncludedMin: number;
  /** Charged per 30 minutes beyond the included wait, in cents. */
  waitOverage: number;
  /** Each passenger or pet beyond the first, in cents. */
  perExtra: number;
};

/**
 * PROPOSED rates. Benchmarks that produced each one are in
 * docs/PRICING_RESEARCH.md — do not change a number without updating that file,
 * or the next person has no idea whether $45 was researched or invented.
 */
export const RATE_CARD: Record<ServiceLine, Rate> = {
  // NC ambulatory NEMT runs $30-60 base + $2.00-3.50/mi. A Charlotte operator
  // publishes a flat $120 anywhere in Mecklenburg County.
  care: { base: 4500, perMile: 300, minimum: 6500, waitIncludedMin: 30, waitOverage: 2000, perExtra: 1000 },

  // Post-procedure, driver waits on site. The real comp is not NEMT, it is
  // Charlotte black car: $95/hr SUV on a 2-hour minimum = $190 to start.
  recovery: { base: 12500, perMile: 350, minimum: 18500, waitIncludedMin: 60, waitOverage: 3000, perExtra: 1500 },

  // IV therapy and med-spa runs: same wait-on-site shape as recovery, shorter
  // trips, less acute.
  wellness: { base: 9500, perMile: 325, minimum: 14500, waitIncludedMin: 60, waitOverage: 2500, perExtra: 1500 },

  // Local pet taxi nationally lands $75-200 for anything under 100 miles. The
  // nearest Charlotte competitor publishes no price at all and asks you to call.
  pet: { base: 4500, perMile: 225, minimum: 5500, waitIncludedMin: 15, waitOverage: 1000, perExtra: 1500 },

  // Student transport. HopSkipDrive hides its number behind an app download.
  scholar: { base: 3500, perMile: 275, minimum: 4500, waitIncludedMin: 10, waitOverage: 1500, perExtra: 1000 },

  // Not bookable (no CNA-trained drivers yet), but a rate exists so the table
  // is total over ServiceLine and adding the line back does not crash a quote.
  guardian: { base: 12500, perMile: 400, minimum: 19500, waitIncludedMin: 60, waitOverage: 3000, perExtra: 1500 },
};

/**
 * Surcharges, in cents. Benchmarked against a Charlotte NEMT operator publishing
 * $120 weekday / $150 weekend / +$45 after hours / $175 holiday.
 */
export const SURCHARGES = {
  afterHours: 2500,
  weekend: 2000,
} as const;

/** Before this hour, or at/after the evening one, counts as after hours. */
const DAY_STARTS_HOUR = 6;
const DAY_ENDS_HOUR = 20;

export type Surcharge = { label: string; cents: number };

export type Quote = {
  lowCents: number;
  highCents: number;
  miles: number;
  surcharges: Surcharge[];
  /** True when the minimum fare, not distance, set the price. */
  atMinimum: boolean;
  waitIncludedMin: number;
};

/** Great-circle miles between two points. */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.7613; // mean Earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Which surcharges a Charlotte-local pickup time attracts. */
export function surchargesFor(requestedAt: string | null | undefined): Surcharge[] {
  const when = parseLocalDateTime(requestedAt);
  if (!when) return [];

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: OPERATING_TIME_ZONE,
    hour12: false,
    hour: '2-digit',
    weekday: 'short',
  }).formatToParts(when);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 12) % 24;
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';

  const out: Surcharge[] = [];
  if (hour < DAY_STARTS_HOUR || hour >= DAY_ENDS_HOUR) {
    out.push({ label: 'After hours', cents: SURCHARGES.afterHours });
  }
  if (weekday === 'Sat' || weekday === 'Sun') {
    out.push({ label: 'Weekend', cents: SURCHARGES.weekend });
  }
  return out;
}

export type QuoteInput = {
  serviceLine: ServiceLine;
  pickup?: { lat?: number | null; lng?: number | null } | null;
  dropoff?: { lat?: number | null; lng?: number | null } | null;
  requestedAt?: string | null;
  passengers?: number | null;
  returnTrip?: boolean | null;
};

/**
 * The estimate, or null when there is not enough to measure.
 *
 * Returning null is the point. A booking page that invents a number for an
 * address it could not resolve is worse than one that says "we will confirm
 * your price by phone" — which is what the page already promises anyway.
 */
export function estimateTrip(input: QuoteInput): Quote | null {
  const { pickup, dropoff } = input;
  if (
    pickup?.lat == null ||
    pickup?.lng == null ||
    dropoff?.lat == null ||
    dropoff?.lng == null
  ) {
    return null;
  }

  const rate = RATE_CARD[input.serviceLine];
  if (!rate) return null;

  const straight = haversineMiles(
    { lat: pickup.lat, lng: pickup.lng },
    { lat: dropoff.lat, lng: dropoff.lng },
  );

  // Same building, or two points Google resolved to the same rooftop.
  if (!Number.isFinite(straight)) return null;

  const milesLow = straight * ROAD_FACTOR_LOW;
  const milesHigh = straight * ROAD_FACTOR_HIGH;

  const surcharges = surchargesFor(input.requestedAt);
  const surchargeTotal = surcharges.reduce((sum, s) => sum + s.cents, 0);

  const extras = Math.max(0, (input.passengers ?? 1) - 1) * rate.perExtra;

  const fare = (miles: number) => rate.base + Math.round(miles * rate.perMile) + extras;

  let low = Math.max(rate.minimum, fare(milesLow));
  let high = Math.max(rate.minimum, fare(milesHigh));
  const atMinimum = fare(milesHigh) <= rate.minimum;

  low += surchargeTotal;
  high += surchargeTotal;

  // Round the single leg FIRST, then double. Rounding a doubled figure makes a
  // round trip stop being exactly twice the one-way price, and "$85 each way"
  // not adding up to "$170 round trip" is the kind of arithmetic a customer
  // checks and then distrusts.
  low = roundTo(low, 500);
  high = roundTo(high, 500);

  // Two legs, at full price each. A round-trip discount is a commercial
  // decision and this engine does not make commercial decisions.
  if (input.returnTrip) {
    low *= 2;
    high *= 2;
  }

  return {
    lowCents: low,
    highCents: high,
    miles: Math.round(milesLow * 10) / 10,
    surcharges,
    atMinimum,
    waitIncludedMin: rate.waitIncludedMin,
  };
}

/** Round to the nearest `step` cents, so estimates read $85 rather than $83.47. */
function roundTo(cents: number, step: number): number {
  return Math.round(cents / step) * step;
}

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** "$85 – $105", or "$85" when rounding collapsed the range. */
export function formatRange(quote: Quote): string {
  return quote.lowCents === quote.highCents
    ? formatUsd(quote.lowCents)
    : `${formatUsd(quote.lowCents)} – ${formatUsd(quote.highCents)}`;
}
