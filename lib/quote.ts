import type { ServiceLine } from '@/lib/trip-request';
import { OPERATING_TIME_ZONE, parseLocalDateTime } from '@/lib/time';

/**
 * Instant fare estimator — APPROVED CARD, 2026-09-24.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS NO LONGER A FORMULA
 * ─────────────────────────────────────────────────────────────────────────────
 * The previous version was `base + perMile × miles`, floored at a minimum. That
 * is how a meter works, and a meter is exactly what the customers of this
 * business are trying to get away from. A caregiver booking a dialysis run three
 * times a week wants to know the number before they commit, and a formula makes
 * every quote feel like it could move.
 *
 * So the card is now DISTANCE BANDS. A band is a promise: "anywhere inside 12
 * miles is $70." It is legible on a phone, it survives being read aloud, and it
 * cannot be argued with after the fact.
 *
 * It also fixes a real bug in the old engine: straight-line distance is not road
 * distance, so the formula produced a fake-precise range like "$83 – $97". Bands
 * turn that uncertainty into an honest answer — if the low and high road-mile
 * estimates land in the same band, the customer gets ONE number, not a range.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHERE THE NUMBERS COME FROM
 * ─────────────────────────────────────────────────────────────────────────────
 * Phil set the entry price on every line (2026-09-24), against live competitor
 * screenshots — Uber Black $49.98 and Blacklane $134–150 on his own route:
 *
 *   Tassy Care        from $40   "like Uber X"
 *   Tassy Care WAV    from $50   "like Uber XXL"
 *   Tassy Concierge   from $100  wait-and-return, pickup from a medical facility
 *   Winnie Ride       $49 / $59 / $69 / $79 / $89, round trip from $89
 *
 * Every band above the entry price is then set so the trip clears its own cost.
 * The cost model is in docs/PRICING_RESEARCH.md; the short version is driver
 * hours (paid, loaded, including the deadhead to and from position), vehicle
 * cost per mile, per-trip insurance amortisation, and card processing.
 *
 * TWO PLACES THE ENTRY PRICE HAD TO BE PROTECTED, AND HOW:
 *
 *  1. Tassy Care at $40. A door-through-door medical trip has a ~40-minute floor
 *     no matter how short it is, and 40 paid minutes plus insurance plus
 *     processing is roughly $35. $40 would have been a 13% margin — one long
 *     appointment from losing money. Fixed by narrowing the entry band to 3
 *     miles, where the real trip is ~25 minutes and $40 clears 38%. Phil's "$40"
 *     headline stays true; it just means what it can afford to mean.
 *
 *  2. Winnie Ride round trip at $89. Phil's $89 is right for a SHORT round trip
 *     and badly wrong for a long one — a 15-mile round trip with a 30-minute
 *     wait is ~110 minutes of driver time and costs about $70. So $89 is the
 *     FLOOR, and the round trip is priced at 1.8× the one-way band (the second
 *     leg discounted 10%, because the driver is already there). 1.8 × $49 =
 *     $88.20, which rounds to exactly the $89 Phil wanted.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE RULES THIS ENGINE STILL KEEPS
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. IT NEVER QUOTES WHAT IT CANNOT MEASURE. No coordinates (the visitor typed
 *     an address instead of picking one) means no estimate — not a guess, not a
 *     city average. `null` is a correct answer here.
 *  2. PAST THE LAST BAND IT SAYS SO. A 60-mile trip is a dispatcher's
 *     conversation, not a table lookup, and the engine returns `quote-only`
 *     rather than extrapolating.
 *  3. THE ESTIMATE IS STORED WITH THE ROW, so a dispute six weeks later is
 *     settled by a record rather than by memory.
 */

/**
 * ON. Phil: "once customer request a ride they should be able to know how much
 * it will cost. I want it to be instantaneous."
 *
 * Safe to leave on before GOOGLE_MAPS_API_KEY exists: with no coordinates the
 * engine returns null and the panel says "pick both addresses", which is true.
 * The day the key is added, prices appear with no further deploy.
 */
export const SHOW_ESTIMATES = true;

/**
 * Straight line under-reads real driving distance. Charlotte is a hub-and-spoke
 * city cut by I-77, I-85 and a rail corridor, so a crow-flies mile is closer to
 * 1.3 road miles here than the 1.2 typical of a grid city. The pair is used to
 * price the optimistic and pessimistic route; when both land in the same band
 * the customer sees a single number.
 */
const ROAD_FACTOR_LOW = 1.25;
const ROAD_FACTOR_HIGH = 1.45;

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
   *   1.0  — the card is ALREADY a round trip (Concierge).
   */
  returnFactor: number;
  /** Never quote a return trip below this, in cents. */
  returnFloor: number;
};

/**
 * Tassy Care — ambulatory medical transport.
 *
 * The entry band is 3 miles on purpose. See the note at the top of this file:
 * $40 is honest for a short curb-to-curb run and loses money on a 10-mile
 * door-through-door one, so the band is drawn where the price is true.
 */
export const CARE: Card = {
  label: 'Tassy Care',
  bands: [
    { upToMiles: 3, cents: 4000 },
    { upToMiles: 7, cents: 5500 },
    { upToMiles: 12, cents: 7000 },
    { upToMiles: 17, cents: 8500 },
    { upToMiles: 22, cents: 10500 },
    { upToMiles: 30, cents: 12500 },
  ],
  waitIncludedMin: 15,
  waitOverage: 2000,
  perExtra: 1000,
  returnFactor: 2,
  returnFloor: 0,
};

/**
 * Tassy Care WAV — wheelchair-accessible.
 *
 * A separate card, not a surcharge on Care. Different vehicle, a ramp or lift,
 * securement time on both ends, and a higher insurance line. The market prices
 * it separately too (NC wheelchair NEMT base $65–110 against ambulatory $30–60),
 * and collapsing the two was the mistake in the first version of this card.
 *
 * Selected automatically when the passenger's mobility is `wheelchair` — the
 * form already collects that and the old engine ignored it, which meant the
 * wheelchair-transport landing page quoted an ambulatory price.
 */
export const CARE_WAV: Card = {
  label: 'Tassy Care WAV',
  bands: [
    { upToMiles: 3, cents: 5000 },
    { upToMiles: 7, cents: 6500 },
    { upToMiles: 12, cents: 8500 },
    { upToMiles: 17, cents: 10500 },
    { upToMiles: 22, cents: 12500 },
    { upToMiles: 30, cents: 15000 },
  ],
  waitIncludedMin: 20,
  waitOverage: 2500,
  perExtra: 1000,
  returnFactor: 2,
  returnFloor: 0,
};

/**
 * Tassy Concierge — pickup from a hospital or medical facility, driver waits,
 * driver brings you home.
 *
 * THE BAND PRICE IS ALREADY THE ROUND TRIP. That is what makes this a product
 * rather than a fare: a discharge is not a ride, it is an afternoon. Ticking
 * "return trip" on this line changes nothing, and `returnFactor: 1` is how the
 * engine says so instead of silently charging twice.
 *
 * 30 minutes of wait, not 60. At $100 with a 60-minute allowance the trip is a
 * 25% margin and one slow discharge from being unprofitable; at 30 minutes it
 * clears 35%. Beyond that the customer buys more wait at $35 per half hour,
 * which is both fair and the single most profitable line on this card.
 *
 * The comparison is not Uber Black at $49.98. Uber will not wait an hour outside
 * an endoscopy suite at any price — booking it twice costs about $90 and
 * guarantees nothing about the second car showing up.
 */
export const CONCIERGE: Card = {
  label: 'Tassy Concierge',
  bands: [
    { upToMiles: 3, cents: 10000 },
    { upToMiles: 7, cents: 12500 },
    { upToMiles: 12, cents: 14500 },
    { upToMiles: 17, cents: 17000 },
    { upToMiles: 22, cents: 19500 },
    { upToMiles: 30, cents: 23500 },
  ],
  waitIncludedMin: 30,
  waitOverage: 3500,
  perExtra: 1500,
  returnFactor: 1,
  returnFloor: 0,
};

/**
 * Winnie Ride — dedicated pet transport, owner NOT in the car.
 *
 * Phil's numbers, unchanged. A partner operates this line, so the card is kept
 * deliberately simple: five rungs, one round-trip rule, no surcharge maze.
 *
 * Uber Pet is not the competitor. Uber Pet is a $3–5 surcharge for bringing your
 * dog along WITH you. This is the trip you cannot take — the vet appointment on
 * a workday, the groomer, the boarding drop-off.
 *
 * ⚠️ MARGIN NOTE, entry band: at $49 the 0–5 mile one-way clears about 34% on a
 * driver-cost basis. That is fine for an owner-operator and thin for a revenue
 * split — an 80/20 split leaves the partner at ~18%, which will not hold. The
 * fix is a FLAT per-trip platform fee ($8–10) rather than a percentage, so short
 * trips do not crush the operator and long trips do not overpay the platform.
 * Settle that before the partner agreement is signed.
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
  perExtra: 1500,
  // The driver waits with the animal and brings it back, so the second leg is
  // discounted 10%. 1.8 × $49 = $88.20 → the $89 Phil specified.
  returnFactor: 1.8,
  returnFloor: 8900,
};

/**
 * Which card prices which service line.
 *
 * `scholar` is deliberately absent. Tassy Scholar is a semester commitment
 * quoted per family and per route — a per-ride price on that line would
 * misrepresent the product and undercut the only deal worth signing. The engine
 * returns `quote-only` for it, which is the honest answer.
 *
 * `wellness` points at Concierge because it is the same shape (pickup, driver
 * waits, driver returns). Phil's final six-line architecture retires Wellness as
 * a separate line; pointing it here means nothing breaks on the day it goes.
 *
 * `guardian` is not bookable (no CNA-trained drivers yet) and is quoted.
 */
const CARD_FOR_LINE: Partial<Record<ServiceLine, Card>> = {
  care: CARE,
  recovery: CONCIERGE,
  wellness: CONCIERGE,
  pet: WINNIE,
};

/** Lines that are quoted by a person, not by this table. */
export const QUOTE_ONLY_LINES: readonly ServiceLine[] = ['scholar', 'guardian'];

const QUOTE_ONLY_MESSAGE: Partial<Record<ServiceLine, string>> = {
  scholar:
    'Tassy Scholar is priced per family for the school year, not per ride. Send the request and we will quote your route — including a multi-child rate if you have more than one.',
  guardian:
    'Tassy Guardian is quoted individually. Send the request and a dispatcher will call you back with a price.',
};

/**
 * The card a request should be priced on.
 *
 * Wheelchair is the one place the passenger, not the service line, picks the
 * card. Someone who chooses "Tassy Care" and then "Wheelchair" needs a WAV, and
 * quoting them the ambulatory price is a promise the operation cannot keep.
 */
export function cardFor(serviceLine: ServiceLine, mobility?: string | null): Card | null {
  if (serviceLine === 'care' && mobility === 'wheelchair') return CARE_WAV;
  return CARD_FOR_LINE[serviceLine] ?? null;
}

/**
 * Surcharges, in cents. Benchmarked against a Charlotte NEMT operator publishing
 * $120 weekday / $150 weekend / +$45 after hours — both of these sit under it.
 *
 * These are not padding. 74% of the Uber week started before 10 AM and the
 * weekend evening hourly booking was the single best-paid trip of the week;
 * unsociable hours are real work and the card should say so out loud.
 */
export const SURCHARGES = {
  afterHours: 2500,
  weekend: 2000,
} as const;

/** Before this hour, or at/after the evening one, counts as after hours. */
const DAY_STARTS_HOUR = 6;
const DAY_ENDS_HOUR = 20;

/**
 * Tassy Care Club — membership. NOT wired into the estimator yet; awaiting
 * Phil's sign-off on the legs cap.
 *
 * Half the band price on the first 8 legs a month, Care and Care WAV only.
 * Break-even is 3.0 trips a month against a $59 fee, which is below what a
 * dialysis household books in a single week. The alternative on the table — $29
 * for 10% off — breaks even at 4.3 trips and buys no loyalty, because 10% is
 * not a reason to stop calling whoever answers first.
 */
export const CARE_CLUB = {
  monthlyCents: 5900,
  discount: 0.5,
  legsPerMonth: 8,
  lines: ['care'] as const,
} as const;

/**
 * Winnie Ride recurring plans — monthly billing for predictable utilisation
 * (daycare runs, standing grooming appointments). Data only; not yet bookable.
 */
export const WINNIE_PLANS = [
  { legs: 8, discount: 0.1, label: '8 rides a month' },
  { legs: 16, discount: 0.15, label: '16 rides a month' },
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
  /** Card label, so the panel can say "Tassy Care WAV" when it switched. */
  cardLabel: string;
  /** True when the price already covers both legs (Concierge, or a return). */
  roundTrip: boolean;
};

export type QuoteOnly = {
  kind: 'quote-only';
  reason: 'beyond-bands' | 'quoted-line';
  miles: number | null;
  message: string;
};

export type QuoteResult = Quote | QuoteOnly;

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
  pickup?: { lat?: number | null; lng?: number | null } | null;
  dropoff?: { lat?: number | null; lng?: number | null } | null;
  requestedAt?: string | null;
  passengers?: number | null;
  returnTrip?: boolean | null;
  /** Switches Tassy Care onto the WAV card when it is `wheelchair`. */
  mobility?: string | null;
};

/**
 * The estimate, a "we will quote this" answer, or null when there is nothing to
 * measure.
 *
 * Three distinct outcomes, and keeping them distinct is the whole point:
 *   null          — addresses were typed, not picked. Say "pick both addresses".
 *   'quote-only'  — measurable, but this line or this distance is a phone call.
 *   'estimate'    — a price the business will stand behind.
 *
 * A booking page that invents a number for an address it could not resolve is
 * worse than one that says a dispatcher will confirm — which is what the page
 * already promises anyway.
 */
export function estimateTrip(input: QuoteInput): QuoteResult | null {
  if (QUOTE_ONLY_LINES.includes(input.serviceLine)) {
    return {
      kind: 'quote-only',
      reason: 'quoted-line',
      miles: null,
      message:
        QUOTE_ONLY_MESSAGE[input.serviceLine] ??
        'Send the request and a dispatcher will call you back with a price.',
    };
  }

  const { pickup, dropoff } = input;
  if (
    pickup?.lat == null ||
    pickup?.lng == null ||
    dropoff?.lat == null ||
    dropoff?.lng == null
  ) {
    return null;
  }

  const card = cardFor(input.serviceLine, input.mobility);
  if (!card) return null;

  const straight = haversineMiles(
    { lat: pickup.lat, lng: pickup.lng },
    { lat: dropoff.lat, lng: dropoff.lng },
  );
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

  // Concierge is already a round trip, so ticking the box must not double it.
  const bothLegs = card.returnFactor === 1 || Boolean(input.returnTrip);
  const factor = input.returnTrip ? card.returnFactor : 1;

  const price = (band: Band) => {
    // Multiply the LEG, then add what is charged once. Surcharges and extra
    // passengers do not double on a return trip — the driver is dispatched
    // once, at one hour of the day, carrying one extra passenger.
    const legs = Math.round(band.cents * factor);
    return roundTo(Math.max(legs, input.returnTrip ? card.returnFloor : 0), 100) +
      surchargeTotal +
      extras;
  };

  // A round trip on Winnie includes a 30-minute wait, not the 15 a one-way
  // gets: the driver stays with the animal rather than leaving and coming back.
  const waitIncludedMin =
    card === WINNIE && input.returnTrip ? 30 : card.waitIncludedMin;

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
  };
}

/** Round to the nearest `step` cents, so a 1.8× leg reads $89 rather than $88.20. */
function roundTo(cents: number, step: number): number {
  return Math.round(cents / step) * step;
}

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** "$70 – $85", or "$70" when both road estimates landed in the same band. */
export function formatRange(quote: Quote): string {
  return quote.lowCents === quote.highCents
    ? formatUsd(quote.lowCents)
    : `${formatUsd(quote.lowCents)} – ${formatUsd(quote.highCents)}`;
}
