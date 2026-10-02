import { isPetLine, type ServiceLine } from '@/lib/trip-request';
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
 * THE FALLBACK ONLY. When two real coordinates are available the engine uses
 * Google's actual driving distance (lib/road-distance.ts) and these are not
 * consulted at all. They exist for the case with nothing to measure: a ZIP
 * centroid, a typed address, no Maps key.
 *
 * Calibrated 2026-09-24 against 16 real Charlotte-metro pairs measured through
 * the Routes API:
 *
 *     min 1.12   p10 1.20   median 1.36   mean 1.39   p90 1.59   max 1.75
 *
 * The previous pair, 1.25/1.45, bracketed only the middle of that. The low end
 * mattered: a trip whose straight-line miles times 1.25 sat just under a band
 * cap was usually a band higher in reality, so the site quoted $59 for a ride
 * the card prices at $69. Every one of those is $10 off the top, and the error
 * only ever ran one way.
 *
 * These now sit at roughly p25 and p90 of the measured spread. The honest cost
 * is a wider printed range on ZIP-only estimates, which is the truth: without
 * the two addresses we do not know whether this is a 1.12 trip or a 1.75 one.
 */
const ROAD_FACTOR_LOW = 1.3;
const ROAD_FACTOR_MID = 1.36;
const ROAD_FACTOR_HIGH = 1.55;

/**
 * TASSY ESCORT — a trained driver walks the patient out, rather than waiting
 * at the curb. Flat, charged once, Tassy Recovery only.
 *
 * WHY THIS IS NOT A HIRED ROLE. The obvious build was to employ CNAs for this.
 * A CNA in Charlotte runs $17.88/hour on average and $22–27 loaded, and nobody
 * hires for ninety minutes — a practical call-out is two to four hours, so one
 * escort would cost $45–90 in labor against a $129 Recovery fare. Worse, a
 * licensed clinical operator in the vehicle implies clinical care the company
 * is not licensed to provide, which enlarges the insurance question rather than
 * answering it. Walking someone from a discharge desk to a car is an escort
 * task, not a clinical one.
 *
 * So the driver who was already dispatched arrives fifteen minutes early and
 * goes inside. The marginal cost is about twenty-five minutes of time that is
 * already on the road — roughly $10–15 — which is why this price holds up.
 *
 * WHY $45 RATHER THAN $35. This is the only thing that makes a booking possible
 * for a patient with nobody to sign them out; today that request is declined
 * outright. Demand for it is inelastic and the alternative is no trip at all,
 * so it sits at the top of the approved range.
 *
 * ⚠️ UNVERIFIED AND LOAD-BEARING: some surgery centers will not discharge a
 * sedated patient to a paid escort, only to a responsible adult who takes them
 * home. That rule varies by facility and has NOT been checked with any
 * Charlotte center yet. Until it has, sell this as "we walk them out", never as
 * "we can be your responsible adult".
 */
export const ESCORT_CENTS = 4500;

/** Lines that can carry an escort. Recovery only — see the note above. */
export const ESCORT_LINES: readonly ServiceLine[] = ['recovery'];

export function escortAvailable(service: string): boolean {
  return ESCORT_LINES.includes(service as ServiceLine);
}

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
/**
 * CONCIERGE short bands lifted 2026-09-30.
 *
 * CLT airport is the job, and Charlotte black car prices it at $80+ sedan, $95+
 * SUV one way. Tassy quoted $69 under 3 miles and $89 under 7 -- in a full-size
 * Expedition -- undercutting the market floor in a bigger vehicle. Lifted to
 * $89/$99 so the entry rungs meet the market. Everything past 7 miles was
 * already competitive and is untouched.
 *
 * "No surge, ever" is the differentiator. It is worth money; do not also discount.
 * The hourly product for airport standby is CONCIERGE_HOURLY below.
 */
export const CONCIERGE: Card = {
  label: 'Tassy Concierge',
  bands: [
    { upToMiles: 3, cents: 8900 },
    { upToMiles: 7, cents: 9900 },
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
/**
 * REPRICED 2026-09-30 — Winnie was half the market.
 *
 * The one direct Charlotte comparable, VIP Pet Transport, charges $95 FLAT for a
 * one-way direct pickup and drop-off. Winnie's LONGEST ride -- 25 miles -- was
 * $89. The card's own note called Winnie "the thinnest line, 39.5% left to
 * Tassy" and suggested handing it to a partner for $8-10 a trip. That was never
 * a margin problem. It was a price problem wearing a margin costume: same car,
 * same driver, same 45% split, $20 less on the ticket.
 *
 * At $49 Tassy netted $16.23 a trip. At $69 it nets $26.65 -- +64% on identical
 * work. The card now sits under the $95 comp on short hops, where the trip
 * genuinely is shorter, and above it past 15 miles where it genuinely is not.
 *
 * Launch plan (Phil): 5% off the first month, then the rate holds -- meet the
 * market, do not undercut it. See WINNIE_LAUNCH_DISCOUNT.
 */
export const WINNIE: Card = {
  label: 'Winnie Ride',
  bands: [
    // TAPERED 2026-09-30 (second pass). The first reprice put this rung at $69
    // on one Charlotte comparable. A fuller read found five published rate
    // sheets clustered far lower at short distance -- Tails On Time (NC) $20,
    // Furrari $25, Lex's $30, The Fetching Post $30, and a Charlotte market
    // average of $30 + $0.60/mi -- so $69 was roughly 2x the field on the band
    // a first-time caller prices you on.
    //
    // Those five are pet SITTERS with a car: no 45% driver split, no dispatch
    // line, no commercial livery. Their cost base is not reachable from here --
    // at $30 Tassy clears $6.33 against a $16.29 break-even. So the entry rung
    // comes down to meet them halfway, not down to match them, and the rungs
    // above hold where that cost structure actually competes.
    { upToMiles: 5, cents: 5900 },
    { upToMiles: 10, cents: 7900 },
    { upToMiles: 15, cents: 8900 },
    { upToMiles: 20, cents: 9900 },
    { upToMiles: 25, cents: 10900 },
  ],
  waitIncludedMin: 15,
  waitOverage: 2500,
  // The driver waits with the animal and brings it back, so the second leg is
  // discounted 10%. 1.8 x $59 = $106.20.
  returnFactor: 1.8,
  // The floor tracks the ENTRY band's round trip and has to move every time
  // that band does. Left at $124 after the entry rung came down to $59, a
  // five-mile round trip would have been charged $124 for a journey the card
  // prices at $106 -- the same class of error as a floor left too low, just
  // pointing the other way.
  returnFloor: 10600,
  perExtra: 1500,
};

/**
 * Launch offer, Phil 2026-09-30: 5% off a new customer's first month, then the
 * rate holds. Deliberately small -- a deep introductory discount teaches a pet
 * owner to wait for the next one, and it would undo the repricing above.
 */
export const WINNIE_LAUNCH_DISCOUNT = {
  pct: 0.05,
  months: 1,
  label: '5% off your first month',
} as const;

/** Which card prices which service line. Absence here means "a person quotes it". */
const CARD_FOR_LINE: Partial<Record<ServiceLine, Card>> = {
  care: CARE,
  recovery: RECOVERY,
  concierge: CONCIERGE,
  winnie: WINNIE,
  // Legacy alias — rows written before 2026-09-26 still price correctly.
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
 * TASSY CARE WAV — wheelchair-accessible, ramp-equipped, operator trained in
 * securement.
 *
 * STILL NOT LIVE, and deliberately so: Tassy owns no WAV. These are the numbers
 * to publish the day one is in the fleet, not before -- a printed rate Tassy
 * cannot hold to is worse than a quote on the call.
 *
 * Anchored to the North Carolina private-pay market: $65-110 base, $3.00-5.50
 * per mile, against a $88 national average base. The card below tracks the
 * middle of that range and mirrors Care's band structure so the two read as one
 * price list rather than two products.
 *
 * pay_rates already carries a `care_wav` row at 40% with $8 insurance, flagged
 * there as an estimate because there is no WAV to insure yet. Both this card and
 * that row need the real insurance quote before either is trusted -- a WAV
 * policy is the single biggest unknown in Tassy's cost base.
 *
 * The prize this unlocks is not private pay. VA non-emergent WHEELCHAIR
 * transport is a 100% SDVOSB set-aside under 38 U.S.C. 8127(d) -- competitors
 * without Phil's certification are barred from bidding. No WAV, no bid.
 */
export const CARE_WAV: Card = {
  label: 'Tassy Care WAV',
  // REPRICED 2026-10-02 by Phil, from 119/139/169/199/229/269 on 0-3/7/12/17/22/30.
  //
  // THE SEPT 30 RAISE COMPARED TWO DIFFERENT THINGS. It anchored this card to
  // Capitol Transportation's published NC schedule -- $120 for 0-5 mi, $140
  // (5-10), $160 (10-15), $180 (15-20) -- and concluded $119 for 0-3 mi sat
  // "at or just under Capitol". It did not. Capitol gives FIVE miles for $120;
  // the card gave THREE for $119 and then jumped to $139. At 4 miles, an
  // ordinary Charlotte medical run, Tassy was 16% OVER Capitol, not under it.
  //
  // Checked again 2026-10-02 against what Charlotte actually publishes:
  //   Medical Transportation of America (Charlotte, private pay)
  //       wheelchair $100 one way INCLUDING THE FIRST 3 MILES, $180 round trip,
  //       +$15 after 7pm, +$30 Sundays and holidays
  //   Capitol Transportation (NC)   $120 / $140 / $160 / $180, then $9/mi
  //   Published NC private-pay range  $65-110 base + $3.00-5.50/mi
  //       (national average base $88)
  // Against the nearest real comparison the card was 19% high one way AND 19%
  // high round trip, and above the top of the published NC band.
  //
  // THE OTHER HALF OF THE SEPT 30 ERROR, worth naming so it is not repeated:
  // it justified the raise with the VA set-aside -- non-emergent wheelchair
  // transport is 100% SDVOSB under 38 U.S.C. 8127(d), awarded firm-fixed-price.
  // True, and irrelevant here. A VA bid is a sealed number priced against a
  // government estimate. THE PUBLIC RETAIL CARD IS NOT THE VA BID. Pricing this
  // card to win facility and private-pay work costs nothing on that contract.
  // The wrong number was raised to protect the right one.
  //
  // Entry rung set at $95 rather than $99: Phil's call, a deliberate step under
  // MTA's $100, and it buys a FIVE mile band against their three. We still do
  // not surcharge nights, weekends or holidays, so on the trips that actually
  // happen the gap is wider than the headline.
  bands: [
    { upToMiles: 5, cents: 9500 },
    { upToMiles: 10, cents: 12500 },
    { upToMiles: 15, cents: 15500 },
    { upToMiles: 20, cents: 18500 },
    { upToMiles: 30, cents: 22500 },
  ],
  waitIncludedMin: 20,
  waitOverage: 3000,
  perExtra: 0,
  returnFactor: 1.8,
  // $180 at the entry rung, matching MTA's published round trip, where 1.8 x $95
  // alone would give $171. Every rung above clears the floor on the factor
  // ($125 -> $225, $155 -> $279, $185 -> $333, $225 -> $405), so this sets the
  // first row and nothing else. Moved WITH the card every time the entry band
  // moves -- a floor left at 21400 would now exceed the 11-15 mile round trip.
  returnFloor: 18000,
};

/**
 * The card a request should be priced on, or null when a person quotes it.
 *
 * WHEELCHAIR IS THE ONE PLACE THE PASSENGER, NOT THE SERVICE LINE, DECIDES.
 * Someone who picks Tassy Care or Tassy Recovery and then says wheelchair needs
 * a ramp-equipped vehicle and an operator trained in securement. Quoting them
 * the ambulatory price is a promise the operation cannot keep -- a sedan cannot
 * carry that passenger at any price.
 *
 * CHANGED 2026-09-30: this used to return null for care + wheelchair, sending
 * every such request to a phone call. It now prices on CARE_WAV, and it covers
 * RECOVERY too, which it never did -- a post-procedure wheelchair passenger was
 * being quoted the ambulatory Recovery rate, which is the exact error the
 * comment above warns about, on the line where the passenger is least able to
 * absorb it.
 *
 * Phil's model is partner-supplied wheelchair vehicles rather than a WAV Tassy
 * owns, so a published rate IS holdable once a WAV operator is under contract.
 * Until one is, the rate is a number the operation has to honour by subcontract.
 * See CARE_WAV for the market anchoring.
 */
export function cardFor(serviceLine: ServiceLine, mobility?: string | null): Card | null {
  // EVERY passenger line, not just Care. mobilityOptionsFor() offers Wheelchair
  // on Care, Recovery AND Concierge -- so a wheelchair user booking an airport
  // run was being quoted the ambulatory SUV rate, the same broken promise the
  // note above describes. Pet lines never reach here; isPetLine gets a different
  // option set, and a `mobility=wheelchair` pet request is already rejected
  // upstream rather than dispatched as a wheelchair job for a dog.
  if (mobility === 'wheelchair' && !isPetLine(serviceLine)) {
    return CARE_WAV;
  }
  return CARD_FOR_LINE[serviceLine] ?? null;
}

/** True when this request is quoted by a person rather than by the table. */
export function isQuoteOnly(serviceLine: ServiceLine, mobility?: string | null): boolean {
  return cardFor(serviceLine, mobility) === null;
}

function quoteOnlyMessage(serviceLine: ServiceLine, mobility?: string | null): string {
  // Retained for any wheelchair request that still falls through to a person --
  // a line without a WAV card, or a distance past the last rung.
  if (mobility === 'wheelchair') return WAV_MESSAGE;
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
/**
 * CONCIERGE HOURLY — airport standby, events, an evening held open.
 * Priced by Phil 2026-09-30, and he drives CLT himself, so this is operator
 * knowledge rather than a scrape.
 *
 * The market quotes $120/hr for a business sedan and $150/hr for a first-class
 * SUV, both on a THREE-hour minimum. Phil's read is that the three-hour minimum
 * is the part that loses the booking, because Uber Black holds a car on two --
 * so Tassy matches the sedan rate in a full-size SUV and undercuts on the
 * minimum, which is the term a customer actually feels.
 *
 * $120 x 2 = $240 floor. At the Concierge 35% split the driver takes $84 for two
 * hours, which beats what those hours pay on the distance card, and is why a
 * driver will hold the slot rather than chase pings.
 *
 * NOT wired into the quote engine. The engine prices distance; this is time, and
 * a half-built hourly path that silently returns a distance quote is the kind of
 * silent wrong answer that costs a customer. It is quoted by a person until the
 * hourly flow is built properly.
 */
export const CONCIERGE_HOURLY = {
  centsPerHour: 12000,
  minimumHours: 2,
  vehicle: 'Full-size SUV',
  note: 'Two-hour minimum, not three. No surge, ever.',
} as const;


export const WINNIE_PLANS = [
  { legs: 4, discount: 0.1, label: '4 rides a month' },
  { legs: 8, discount: 0.15, label: '8 rides a month' },
] as const;
/** Facility account — tiered so the discount follows the volume, not the promise. */
export const FACILITY_TIERS = [
  { minTripsPerMonth: 10, discount: 0.05 },
  { minTripsPerMonth: 25, discount: 0.1 },
] as const;

/**
 * ── PUBLISHED RATE TABLE HELPERS ─────────────────────────────────────────────
 *
 * /pricing used to carry its own hand-typed copies of every band. On
 * 2026-09-30 Winnie was repriced here and the page went on quoting $49 for a
 * ride the engine charged $69 at -- two sources of truth, and the customer-
 * facing one was the wrong one. These exist so the page can be DERIVED from the
 * cards. Never hand-type a fare into a page again.
 */

/** "Up to 5 miles" for the first rung, "6 – 10 miles" after that. */
export function bandLabel(bands: readonly Band[], i: number): string {
  if (i === 0) return `Up to ${bands[0].upToMiles} miles`;
  return `${bands[i - 1].upToMiles + 1} – ${bands[i].upToMiles} miles`;
}

/** "Over 30 miles" — the rung past the card, where a person quotes it. */
export function overBandLabel(bands: readonly Band[]): string {
  return `Over ${bands[bands.length - 1].upToMiles} miles`;
}

/**
 * What the return leg costs, by the card's own rule.
 * The floor matters: on Winnie 1.8 x $69 = $124.20 and the floor is $124, so
 * the two agree — but a floor left behind after a reprice is how a round trip
 * ends up cheaper than the one-way it contains.
 */
export function roundTripCents(card: Card, oneWayCents: number): number {
  return Math.max(Math.round(oneWayCents * card.returnFactor), card.returnFloor);
}

/** Whole dollars, the way every published table shows them. */
export function dollars(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

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
  /**
   * TRUE when `miles` is Google's real driving distance, FALSE when it is a
   * straight line stretched by a factor.
   *
   * The panel uses this to choose between "11.1 miles" and "about 10.6 miles".
   * That distinction is not pedantry: a customer who checks our number against
   * Google Maps and finds it short concludes the price is wrong too.
   */
  distanceMeasured: boolean;
  /** $45 when a Tassy Escort was asked for, 0 otherwise. Already in the total. */
  escortCents: number;
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
  /**
   * REAL driving miles from Google's Routes API, when we have them.
   *
   * Supplied by /api/distance in the browser and by the Routes call in
   * app/api/trip-request/route.ts on the server. When this is a finite
   * positive number it wins outright: it selects the band, it is the number
   * printed on screen, and the estimate collapses to a single price because
   * there is no longer anything to be uncertain about.
   *
   * Undefined and null are ordinary states — no key, Google slow, a ZIP-only
   * address. The straight-line fallback covers them.
   */
  roadMiles?: number | null;
  /**
   * Tassy Escort — the driver goes inside and walks them out. Recovery only;
   * silently ignored on every other line so a stale query string cannot add
   * $45 to a pet ride.
   */
  escort?: boolean | null;
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

  // A measured road distance ends the guessing. Both ends of the range become
  // the same number, so the panel prints one price instead of a spread, and the
  // mileage on screen is the mileage the customer's own phone will show.
  const measured =
    typeof input.roadMiles === 'number' && Number.isFinite(input.roadMiles) && input.roadMiles > 0
      ? input.roadMiles
      : null;

  const straight = haversineMiles(from.point, to.point);
  if (measured === null && !Number.isFinite(straight)) return null;

  const milesLow = measured ?? straight * ROAD_FACTOR_LOW;
  const milesMid = measured ?? straight * ROAD_FACTOR_MID;
  const milesHigh = measured ?? straight * ROAD_FACTOR_HIGH;

  // Past the last rung. Do NOT extrapolate: the reason the card ends is that
  // beyond it the trip stops being a lookup and starts being a conversation
  // about tolls, driver hours and whether the vehicle comes back empty.
  //
  // THE MIDDLE ESTIMATE DECIDES THIS, not the pessimistic one. Uptown to
  // Concord is 25.5 real road miles — comfortably inside the 30-mile rung —
  // but 19.4 straight-line times the p90 factor is 30.1, and judging it on
  // that number turns a priceable trip into "call us". Refusing to quote is
  // the most expensive mistake this function can make; a range that clips at
  // the top rung is the cheap one.
  const midBand = bandFor(card, milesMid);
  if (!midBand) {
    return {
      kind: 'quote-only',
      reason: 'beyond-bands',
      miles: Math.round(milesMid * 10) / 10,
      message: `That is a longer trip than our published ${card.label} rates cover. Send the request and a dispatcher will quote it — usually within 2 hours.`,
    };
  }

  // Clamped to the card, having already established the trip belongs on it.
  const lowBand = bandFor(card, milesLow) ?? card.bands[0]!;
  const highBand = bandFor(card, milesHigh) ?? card.bands[card.bands.length - 1]!;

  const surcharges = surchargesFor(input.requestedAt);
  const surchargeTotal = surcharges.reduce((sum, s) => sum + s.cents, 0);
  const extras = Math.max(0, (input.passengers ?? 1) - 1) * card.perExtra;

  // Charged ONCE, like a surcharge and unlike a fare. The driver walks them out
  // of the building one time; a return leg does not double it.
  const escortCents =
    input.escort && escortAvailable(input.serviceLine) ? ESCORT_CENTS : 0;

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
      extras +
      escortCents
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
    // The MIDDLE estimate, not the low one. Printing the optimistic figure is
    // what made the site read 10.6 miles for an 11.1-mile drive.
    miles: Math.round(milesMid * 10) / 10,
    surcharges,
    entryBand: lowBand === card.bands[0] && highBand === card.bands[0],
    waitIncludedMin,
    cardLabel: card.label,
    roundTrip: bothLegs,
    exact,
    measuredFrom: exact || !fromPlace || !toPlace ? null : `${fromPlace} to ${toPlace}`,
    distanceMeasured: measured !== null,
    escortCents,
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
