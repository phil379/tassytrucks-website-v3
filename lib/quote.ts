import type { ServiceLine } from '@/lib/trip-request';
import { OPERATING_TIME_ZONE, parseLocalDateTime } from '@/lib/time';
import { resolvePoint, zipPlace } from '@/lib/zip-centroids';

/**
 * Instant fare estimator — APPROVED CARD, 2026-09-24.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DISTANCE BANDS, NOT A METER
 * ─────────────────────────────────────────────────────────────────────────────
 * A band is a promise: "anywhere inside 12 miles is $74." It is legible on a
 * phone, it survives being read aloud down a phone line, and it cannot be
 * argued with afterwards. A meter is what these customers are trying to escape.
 *
 * Bands also tell the truth about precision. Straight-line distance is not road
 * distance, so the old formula produced fake-precise ranges like "$83 - $97".
 * Here the optimistic and the pessimistic road distance are priced separately:
 * land in the same band and the customer sees ONE number; straddle an edge and
 * they see a range. The uncertainty shows up where it actually is.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SIX LINES
 * ─────────────────────────────────────────────────────────────────────────────
 *   Tassy Care        one way, ambulatory medical              from $49
 *   Tassy Care WAV    wheelchair — QUOTED, not published        see below
 *   Tassy Recovery    round trip + wait, after a procedure     from $129
 *   Tassy Concierge   one way, premium, nothing medical        from $69
 *   Winnie Ride       pet transport, owner not travelling      from $49
 *   Tassy Scholar     by the route, billed monthly            quoted
 *
 * Every published price clears 35-50% gross margin against a real driver wage.
 * The model is docs/PRICING_RESEARCH.md and the workbook that produced it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE DECISIONS THAT LOOK ARBITRARY AND ARE NOT
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. RECOVERY AND CONCIERGE ARE DIFFERENT PRODUCTS, NOT TIERS. Recovery is
 *     bought because a surgery center will not discharge a sedated patient
 *     without a responsible adult — inelastic, sold to the discharge planner.
 *     Concierge is bought because someone wants a good car to the airport —
 *     elastic, sold to the rider. Putting a trained medical operator in a golf
 *     trip is pure cost against a customer who will not pay for it.
 *
 *  2. CARE WAV IS NOT PRICED HERE. Tassy owns no wheelchair-accessible vehicle;
 *     the floor is whatever a WAV subcontractor quotes, and that quote does not
 *     exist yet. Printing six numbers we cannot hold to is worse than saying
 *     "quoted on the call", which is what this engine returns.
 *
 *  3. THE ENTRY BAND IS 3 MILES, NOT 5. Widening it was tested so the headline
 *     could read "under five miles, $49". It costs 7 points of margin and $10
 *     per driver hour, because a 5-mile door-to-door medical trip is about 42
 *     paid driver minutes against 35. The narrow band stands.
 */

/**
 * ON. Prices show the moment both ends resolve — from Google Places when the
 * Maps key is present, otherwise from the typed ZIP (lib/zip-centroids.ts).
 */
export const SHOW_ESTIMATES = true;

/**
 * Straight line under-reads real driving distance. Charlotte is a hub-and-spoke
 * city cut by I-77, I-85 and a rail corridor, so a crow-flies mile is closer to
 * 1.3 road miles here than the 1.2 typical of a grid city.
 */
const ROAD_FACTOR_LOW = 1.25;
const ROAD_FACTOR_HIGH = 1.45;

export type LatLng = { lat: number; lng: number };

/** One rung of a card. `upToMiles` is inclusive; `cents` is the whole fare. */
export type Band = { upToMiles: number; cents: number };

export type Card = {
  /** What the customer is being sold, in their words. */
  label: string;
  /** Ascending by `upToMiles`. Past the last rung, the engine stops guessing. */
  bands: Band[];
  /** On-site wait included in the band price, in minutes. */
  waitIncludedMin: number;
  /** Charged per 30 minutes beyond the included wait, in cents. */
  waitOverage: number;
  /** Each passenger or pet beyond the first, in cents. */
  perExtra: number;
  /**
   * What a return trip multiplies the band by.
   *   2.0  — two separate dispatches, full price each.
   *   1.8  — the driver waits and returns, so the second leg is discounted 10%.
   *   1.0  — the card is ALREADY a round trip (Recovery).
   */
  returnFactor: number;
  /** Never quote a return trip below this, in cents. */
  returnFloor: number;
};

/**
 * Tassy Care — one-way ambulatory medical transport.
 * Dialysis, infusion, physical therapy, specialists. Averages 43% margin.
 */
export const CARE: Card = {
  label: 'Tassy Care',
  bands: [
    { upToMiles: 3, cents: 4900 },
    { upToMiles: 7, cents: 5900 },
    { upToMiles: 12, cents: 7400 },
    { upToMiles: 17, cents: 8900 },
    { upToMiles: 22, cents: 10900 },
    { upToMiles: 30, cents: 12900 },
  ],
  waitIncludedMin: 15,
  waitOverage: 2000,
  perExtra: 1000,
  returnFactor: 2,
  returnFloor: 0,
};

/**
 * Tassy Recovery — the ride home after a procedure.
 *
 * THE BAND PRICE IS ALREADY THE ROUND TRIP. That is what makes this a product
 * rather than a fare: a discharge is not a ride, it is an afternoon. Ticking
 * "return trip" changes nothing, and `returnFactor: 1` is how the engine says
 * so instead of silently charging twice.
 *
 * 20 minutes of wait, set by Phil on 2026-09-24 (down from 30). Worth knowing
 * what that traded: it is about $5.37 of driver cost per trip, roughly four
 * points of margin, against the risk that a discharge routinely overruns and
 * the overage gets charged on most trips — which would turn the one-price
 * promise into a surprise bill, the exact thing the price sheet says never
 * happens. The operating fix is to dispatch on the facility's call rather than
 * the scheduled time, so the 20 minutes is a buffer that is rarely spent.
 */
export const RECOVERY: Card = {
  label: 'Tassy Recovery',
  bands: [
    { upToMiles: 3, cents: 12900 },
    { upToMiles: 7, cents: 14900 },
    { upToMiles: 12, cents: 16900 },
    { upToMiles: 17, cents: 19500 },
    { upToMiles: 22, cents: 22500 },
    { upToMiles: 30, cents: 25900 },
  ],
  waitIncludedMin: 20,
  waitOverage: 3500,
  perExtra: 1500,
  returnFactor: 1,
  returnFloor: 0,
};

/**
 * Tassy Concierge — premium, one way, nothing medical.
 * Airport, golf, dinner, events, collecting a client from their hotel.
 *
 * Entry lowered from $79 to $69 (Phil, 2026-09-24) and the ladder re-spaced so
 * the steps stay even — a $69 entry against an unchanged $99 second rung would
 * have been a 43% jump off the floor. Still the highest-contribution per-ride
 * line in the business at 41-50% margin and $40-57 per driver hour, and the
 * cheaper entry buys volume in the evenings and weekends where the demand
 * demonstrably is.
 *
 * Round trip is TWO reserved legs at full price — the driver is released in
 * between. A customer who needs the driver to wait is buying Recovery.
 */
export const CONCIERGE: Card = {
  label: 'Tassy Concierge',
  bands: [
    { upToMiles: 3, cents: 6900 },
    { upToMiles: 7, cents: 8900 },
    { upToMiles: 12, cents: 10900 },
    { upToMiles: 17, cents: 12900 },
    { upToMiles: 22, cents: 15500 },
    { upToMiles: 30, cents: 18500 },
  ],
  waitIncludedMin: 0,
  waitOverage: 3500,
  perExtra: 1500,
  returnFactor: 2,
  returnFloor: 0,
};

/**
 * Winnie Ride — dedicated pet transport, owner NOT in the car.
 *
 * Uber Pet is not the competitor: that is a $3-5 surcharge for bringing your
 * dog along WITH you. This is the trip you cannot take — the vet appointment on
 * a workday, the groomer, the boarding drop-off.
 *
 * ⚠️ MARGIN NOTE: at 35% and about $24 per driver hour this is the thinnest
 * line in the business, which is why a partner operates it and why it should be
 * the LAST service to receive a scarce driver hour. Settle the partner split as
 * a FLAT per-trip platform fee ($8-10), never a percentage: an 80/20 split
 * leaves the operator at roughly 18% on a short trip and will not hold.
 */
export const WINNIE: Card = {
  label: 'Winnie Ride',
  bands: [
    { upToMiles: 5, cents: 4900 },
    { upToMiles: 10, cents: 5900 },
    { upToMiles: 15, cents: 6900 },
    { upToMiles: 20, cents: 7900 },
    { upToMiles: 25, cents: 8900 },
  ],
  waitIncludedMin: 15,
  waitOverage: 2500,
  // The driver waits with the animal and brings it back, so the second leg is
  // discounted 10%. 1.8 x $49 = $88.20, which rounds to the $89 on the card.
  returnFactor: 1.8,
  returnFloor: 8900,
  perExtra: 1500,
};

/** Which card prices which service line. Absence here means "a person quotes it". */
const CARD_FOR_LINE: Partial<Record<ServiceLine, Card>> = {
  care: CARE,
  recovery: RECOVERY,
  concierge: CONCIERGE,
  pet: WINNIE,
};

/**
 * Lines a person quotes, with the reason the customer is told.
 *
 * `scholar` is a semester commitment priced on the route — how many children,
 * how many STOPS, how far. Stop count is what drives the cost, so a per-ride
 * price would misrepresent the product and undercut the only deal worth
 * signing. `wellness` and `guardian` are retired but still resolve so old rows
 * in the ops queue keep rendering.
 */
const QUOTE_ONLY_MESSAGE: Partial<Record<ServiceLine, string>> = {
  scholar:
    'Tassy Scholar is priced per route for the school year, not per ride — how many children, how many stops, how far. Send the request and we will quote yours, including the sibling rate if you have more than one child at the same address.',
  wellness:
    'Send the request and a dispatcher will call you back with a price.',
  guardian:
    'Tassy Guardian is quoted individually. Send the request and a dispatcher will call you back with a price.',
};

/** The message shown when Tassy Care is requested for a wheelchair passenger. */
const WAV_MESSAGE =
  'Tassy Care WAV uses a ramp-equipped vehicle and an operator trained in securement, booked through our partner network. We quote your route on the call rather than print a rate we cannot hold to — send the request or call and you will have a price in minutes.';

/**
 * The card a request should be priced on, or null when a person quotes it.
 *
 * Wheelchair is the one place the passenger, not the service line, decides.
 * Someone who chooses Tassy Care and then Wheelchair needs a WAV, and quoting
 * them the ambulatory price is a promise the operation cannot keep.
 */
export function cardFor(serviceLine: ServiceLine, mobility?: string | null): Card | null {
  if (serviceLine === 'care' && mobility === 'wheelchair') return null;
  return CARD_FOR_LINE[serviceLine] ?? null;
}

/** True when this request is quoted by a person rather than by the table. */
export function isQuoteOnly(serviceLine: ServiceLine, mobility?: string | null): boolean {
  return cardFor(serviceLine, mobility) === null;
}

function quoteOnlyMessage(serviceLine: ServiceLine, mobility?: string | null): string {
  if (serviceLine === 'care' && mobility === 'wheelchair') return WAV_MESSAGE;
  return (
    QUOTE_ONLY_MESSAGE[serviceLine] ??
    'Send the request and a dispatcher will call you back with a price.'
  );
}

/**
 * Surcharges, in cents. Benchmarked against a Charlotte NEMT operator publishing
 * $120 weekday / $150 weekend / +$45 after hours — both of these sit under it.
 */
export const SURCHARGES = {
  afterHours: 2500,
  weekend: 2000,
} as const;

/** Before this hour, or at/after the evening one, counts as after hours. */
const DAY_STARTS_HOUR = 6;
const DAY_ENDS_HOUR = 20;

/**
 * Standing Ride Plan — the recurring product. Data only; not wired into the
 * estimator until the booking flow can take a recurring schedule.
 *
 * 15% off every leg, minimum 8 legs a month, billed monthly, same driver at the
 * same time. It sells the ROUTE, not a discount: it gives Tassy a predictable
 * midday slot and gives the customer the thing a national competitor charges
 * $10-20 a trip extra for — the same driver every time.
 */
export const STANDING_RIDE_PLAN = {
  discount: 0.15,
  minLegsPerMonth: 8,
  lines: ['care', 'recovery'] as const,
} as const;

/** Prepaid ride pack, and the Winnie recurring plans. Data only. */
export const CARE_PACK_10 = { rides: 10, discount: 0.1, validMonths: 12 } as const;
export const WINNIE_PLANS = [
  { legs: 4, discount: 0.1, label: '4 rides a month' },
  { legs: 8, discount: 0.15, label: '8 rides a month' },
] as const;
/** Facility account — tiered so the discount follows the volume, not the promise. */
export const FACILITY_TIERS = [
  { minTripsPerMonth: 10, discount: 0.05 },
  { minTripsPerMonth: 25, discount: 0.1 },
] as const;

export type Surcharge = { label: string; cents: number };

export type Quote = {
  kind: 'estimate';
  lowCents: number;
  highCents: number;
  miles: number;
  surcharges: Surcharge[];
  /** True when the trip landed in the cheapest rung — drives "from" copy. */
  entryBand: boolean;
  waitIncludedMin: number;
  /** Card label, so the panel can name which card it used. */
  cardLabel: string;
  /** True when the price already covers both legs (Recovery, or a return). */
  roundTrip: boolean;
  /**
   * FALSE when the distance came from ZIP centroids rather than picked
   * addresses. The panel must say so — a ZIP-derived price is a good estimate
   * and a bad promise, and the difference belongs on screen.
   */
  exact: boolean;
  /** "Charlotte, NC to Matthews, NC" when measured from ZIPs, else null. */
  measuredFrom: string | null;
};

export type QuoteOnly = {
  kind: 'quote-only';
  reason: 'beyond-bands' | 'quoted-line' | 'wheelchair';
  miles: number | null;
  message: string;
};

export type QuoteResult = Quote | QuoteOnly;

/** Great-circle miles between two points. */
export function haversineMiles(a: LatLng, b: LatLng): number {
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

/** The rung a distance falls in, or null when it is past the end of the card. */
export function bandFor(card: Card, miles: number): Band | null {
  return card.bands.find((b) => miles <= b.upToMiles) ?? null;
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
  /** Coordinates from a PICKED Google place, when there are any. */
  pickup?: { lat?: number | null; lng?: number | null } | null;
  dropoff?: { lat?: number | null; lng?: number | null } | null;
  /** The raw text in the two address fields. Used for the ZIP fallback. */
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  requestedAt?: string | null;
  passengers?: number | null;
  returnTrip?: boolean | null;
  /** Switches Tassy Care to a WAV quote when it is `wheelchair`. */
  mobility?: string | null;
};

/**
 * The estimate, a "we will quote this" answer, or null when there is nothing to
 * measure at all.
 *
 * Three distinct outcomes, and keeping them distinct is the whole point:
 *   null          — neither a picked place nor a ZIP we serve. Ask for a ZIP.
 *   'quote-only'  — measurable, but this line or this distance is a phone call.
 *   'estimate'    — a price the business will stand behind.
 *
 * DISTANCE COMES FROM WHICHEVER SOURCE IS BETTER. A picked Google place gives
 * exact coordinates. Failing that — no Maps key, an address typed rather than
 * picked, Places down — the ZIP in the typed address gives a centroid, and the
 * result is flagged `exact: false` so the panel can label it honestly. A good
 * estimate beats a blank panel; an unlabelled one does not.
 */
export function estimateTrip(input: QuoteInput): QuoteResult | null {
  // The line-level answer comes first: a parent picking Scholar should learn how
  // it is priced immediately, not after filling in two addresses.
  if (isQuoteOnly(input.serviceLine, input.mobility)) {
    return {
      kind: 'quote-only',
      reason: input.serviceLine === 'care' ? 'wheelchair' : 'quoted-line',
      miles: null,
      message: quoteOnlyMessage(input.serviceLine, input.mobility),
    };
  }

  const from = resolvePoint(input.pickup, input.pickupAddress);
  const to = resolvePoint(input.dropoff, input.dropoffAddress);
  if (!from || !to) return null;

  const card = cardFor(input.serviceLine, input.mobility);
  if (!card) return null;

  const straight = haversineMiles(from.point, to.point);
  if (!Number.isFinite(straight)) return null;

  const milesLow = straight * ROAD_FACTOR_LOW;
  const milesHigh = straight * ROAD_FACTOR_HIGH;

  const lowBand = bandFor(card, milesLow);
  const highBand = bandFor(card, milesHigh);

  // Past the last rung. Do NOT extrapolate: the reason the card ends is that
  // beyond it the trip stops being a lookup and starts being a conversation
  // about tolls, driver hours and whether the vehicle comes back empty.
  if (!lowBand || !highBand) {
    return {
      kind: 'quote-only',
      reason: 'beyond-bands',
      miles: Math.round(milesLow * 10) / 10,
      message: `That is a longer trip than our published ${card.label} rates cover. Send the request and a dispatcher will quote it — usually within 2 hours.`,
    };
  }

  const surcharges = surchargesFor(input.requestedAt);
  const surchargeTotal = surcharges.reduce((sum, s) => sum + s.cents, 0);
  const extras = Math.max(0, (input.passengers ?? 1) - 1) * card.perExtra;

  // Recovery is already a round trip, so ticking the box must not double it.
  const bothLegs = card.returnFactor === 1 || Boolean(input.returnTrip);
  const factor = input.returnTrip ? card.returnFactor : 1;

  const price = (band: Band) => {
    // Multiply the LEG, then add what is charged once. Surcharges and extra
    // passengers do not double on a return trip — the driver is dispatched
    // once, at one hour of the day, carrying one extra passenger.
    const legs = Math.round(band.cents * factor);
    return (
      roundTo(Math.max(legs, input.returnTrip ? card.returnFloor : 0), 100) +
      surchargeTotal +
      extras
    );
  };

  // A round trip on Winnie carries a longer wait than a one-way: the driver
  // stays with the animal rather than leaving and coming back for it.
  const waitIncludedMin =
    card === WINNIE && input.returnTrip ? 20 : card.waitIncludedMin;

  const exact = from.exact && to.exact;
  const fromPlace = zipPlace(from.zip);
  const toPlace = zipPlace(to.zip);

  return {
    kind: 'estimate',
    lowCents: price(lowBand),
    highCents: price(highBand),
    miles: Math.round(milesLow * 10) / 10,
    surcharges,
    entryBand: lowBand === card.bands[0] && highBand === card.bands[0],
    waitIncludedMin,
    cardLabel: card.label,
    roundTrip: bothLegs,
    exact,
    measuredFrom: exact || !fromPlace || !toPlace ? null : `${fromPlace} to ${toPlace}`,
  };
}

/** Round to the nearest `step` cents, so a 1.8x leg reads $89 rather than $88.20. */
function roundTo(cents: number, step: number): number {
  return Math.round(cents / step) * step;
}

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** "$74 – $89", or "$74" when both road estimates landed in the same band. */
export function formatRange(quote: Quote): string {
  return quote.lowCents === quote.highCents
    ? formatUsd(quote.lowCents)
    : `${formatUsd(quote.lowCents)} – ${formatUsd(quote.highCents)}`;
}
