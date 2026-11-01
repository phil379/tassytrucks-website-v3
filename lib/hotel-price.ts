import {
  bandFor,
  cardFor,
  haversineMiles,
  roundTripCents,
  type LatLng,
  type Quote,
} from '@/lib/quote';
import {
  CLT_TERMINAL,
  HOTEL_MATCH_RADIUS_M,
  HOTEL_ZONES,
  ZONE_INTROS,
  type HotelZoneId,
  type HotelZoneRow,
} from '@/lib/hotel-zones';

/**
 * Hotel zone pricing: the rules. The table is in lib/hotel-zones.ts.
 *
 * PURE. No database, no network, no clock: the time and the number of introductory rides already
 * used arrive as arguments, so every rule here can be tested. The server is the only place that
 * decides a price (app/api/trip-request, app/api/hotel-price, app/airport); `?hotel=` only
 * pre-fills an address and picks which hotel the page names.
 *
 * WHAT A HOTEL PRICE IS
 *   One end of the trip is within HOTEL_MATCH_RADIUS_M of a listed hotel and the other end is the
 *   CLT terminal area, either direction, on Concierge, ambulatory. The price is the LIVE Concierge
 *   card price at the hotel's `referenceMiles`, never a typed dollar amount, so a card change in
 *   lib/quote.ts moves it. It is FLAT: no after-hours, weekend, holiday or surge charge of any
 *   kind. A round trip is double, by the card's own rule.
 */

/** Nothing in this file ever charges less than this per leg. */
export const HOTEL_FLOOR_CENTS = 8900;


/** Great-circle metres, reusing the engine's haversine so there is one definition of distance. */
function metersBetween(a: LatLng, b: LatLng): number {
  return haversineMiles(a, b) * 1609.344;
}

export function hotelBySlug(slug: string | null | undefined): HotelZoneRow | null {
  if (!slug) return null;
  return HOTEL_ZONES.find((h) => h.slug === slug.trim().toLowerCase()) ?? null;
}

/** The listed hotel within the match radius of this point, nearest first, or null. */
export function hotelAt(point: LatLng | null | undefined): HotelZoneRow | null {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  let best: { hotel: HotelZoneRow; m: number } | null = null;
  for (const hotel of HOTEL_ZONES) {
    const m = metersBetween(point, hotel);
    if (m <= HOTEL_MATCH_RADIUS_M && (!best || m < best.m)) best = { hotel, m };
  }
  return best?.hotel ?? null;
}

export function atTerminal(point: LatLng | null | undefined): boolean {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
  return metersBetween(point, CLT_TERMINAL) <= CLT_TERMINAL.radiusMeters;
}

export type HotelDirection = 'to-airport' | 'from-airport';

/** Which hotel and which way, when the two ends are a listed hotel and the terminal. */
export function hotelTripFor(
  pickup: LatLng | null | undefined,
  dropoff: LatLng | null | undefined,
): { hotel: HotelZoneRow; direction: HotelDirection } | null {
  const fromHotel = hotelAt(pickup);
  if (fromHotel && atTerminal(dropoff)) return { hotel: fromHotel, direction: 'to-airport' };
  const toHotel = hotelAt(dropoff);
  if (toHotel && atTerminal(pickup)) return { hotel: toHotel, direction: 'from-airport' };
  return null;
}

const DAY_MS = 86_400_000;

/**
 * True while the zone's introductory price is on offer: fewer than `introMaxRides` bookings, and
 * fewer than `introDays` days since the zone's first hotel booking. With no first booking yet
 * (null) the day window has not started, so only the booking cap applies.
 */
export function introActive(
  zone: HotelZoneId,
  now: Date,
  ridesUsed: number,
  firstBookingAt: Date | string | null = null,
): boolean {
  const intro = ZONE_INTROS[zone];
  if (intro.introCents === null) return false;
  if (intro.introDays !== null && firstBookingAt !== null) {
    const started = firstBookingAt instanceof Date ? firstBookingAt.getTime() : Date.parse(firstBookingAt);
    // An unreadable start closes the intro: a wrong lower price is worse than the card price.
    if (!Number.isFinite(started) || now.getTime() >= started + intro.introDays * DAY_MS) return false;
  }
  if (intro.introMaxRides !== null && ridesUsed >= intro.introMaxRides) return false;
  return true;
}

export type HotelQuote = {
  slug: string;
  label: string;
  zone: HotelZoneId;
  direction: HotelDirection;
  roundTrip: boolean;
  /** One leg at the card price (live Concierge card at the hotel's reference miles). */
  oneWayCardCents: number;
  /** One leg as charged: card, introductory or negotiated, never under the floor. */
  oneWayChargedCents: number;
  /** What the booking is charged, both legs on a round trip. This is the ONE price. */
  chargedCents: number;
  /** The card price for the whole booking. Stored as card_price_cents; driver pay comes from it. */
  cardPriceCents: number;
  introApplied: boolean;
  overrideApplied: boolean;
};

export type HotelQuoteInput = {
  serviceLine: string;
  mobility?: string | null;
  pickup: LatLng | null | undefined;
  dropoff: LatLng | null | undefined;
  returnTrip?: boolean | null;
  now?: Date;
  /** Bookings already taken at the introductory price in this zone. */
  introRidesUsed?: number;
  /** When the zone's first hotel booking was made (starts the intro day window), or null/absent if none yet. */
  introFirstBookingAt?: Date | string | null;
};

/**
 * The hotel price for this trip, or null when it is not a hotel trip. Null means "use the normal
 * quote engine, unchanged".
 *
 * Deliberately takes NO requested time and applies NO surcharge: a hotel guest sees one number
 * at any hour on any day.
 */
export function hotelQuote(input: HotelQuoteInput): HotelQuote | null {
  // Concierge only. A wheelchair rider moves onto the WAV card in the engine; that is not this.
  if (input.serviceLine !== 'concierge' || input.mobility === 'wheelchair') return null;

  const trip = hotelTripFor(input.pickup, input.dropoff);
  if (!trip) return null;

  const card = cardFor('concierge', input.mobility);
  if (!card) return null;
  const band = bandFor(card, trip.hotel.referenceMiles);
  if (!band) return null;

  const now = input.now ?? new Date();
  const intro = ZONE_INTROS[trip.hotel.zone];
  const introOn = introActive(trip.hotel.zone, now, input.introRidesUsed ?? 0, input.introFirstBookingAt ?? null);

  const overrideApplied = trip.hotel.overrideCents !== null;
  let oneWay = band.cents;
  if (overrideApplied) oneWay = trip.hotel.overrideCents!;
  else if (introOn && intro.introCents !== null) oneWay = Math.min(band.cents, intro.introCents);
  oneWay = Math.max(oneWay, HOTEL_FLOOR_CENTS);

  const introApplied = !overrideApplied && introOn && oneWay < band.cents;
  const roundTrip = Boolean(input.returnTrip) || card.returnFactor === 1;
  const total = (leg: number) => (input.returnTrip ? roundTripCents(card, leg) : leg);

  return {
    slug: trip.hotel.slug,
    label: trip.hotel.label,
    zone: trip.hotel.zone,
    direction: trip.direction,
    roundTrip,
    oneWayCardCents: band.cents,
    oneWayChargedCents: oneWay,
    chargedCents: total(oneWay),
    cardPriceCents: total(band.cents),
    introApplied,
    overrideApplied,
  };
}

/** The same price as the engine's Quote shape, so the stored row and the confirmation read it. */
export function quoteFromHotel(h: HotelQuote): Quote {
  const hotel = HOTEL_ZONES.find((z) => z.slug === h.slug);
  return { ...quoteFromHotelPrice(h.chargedCents, h.roundTrip), miles: hotel?.referenceMiles ?? 0 };
}

/**
 * The introductory price is NEVER combined with a referral credit: a referral on the intro takes
 * the margin to about 15%. Any code that applies a referral credit to a booking must ask here
 * first. There is no referral credit in the booking flow today; this is the guard it must use.
 */
export function referralCreditAllowed(quote: Pick<HotelQuote, 'introApplied'> | null | undefined): boolean {
  return !quote?.introApplied;
}

/**
 * Driver pay is worked out from the CARD price, never from what was charged (Phil's Oct 30 rule:
 * floor(0.55 x standard card price) in whole dollars). This helper exists for the tests that
 * prove the intro price does not leak into it. Driver pay is computed and stored in the ops repo,
 * not here.
 */
export function driverPayDollarsFromCard(cardPriceCents: number): number {
  return Math.floor((0.55 * cardPriceCents) / 100);
}


/**
 * True when the browser SAYS it showed a hotel price that is not the one the server works out:
 * a different amount, or a hotel price on a trip that is not a hotel trip. The booking route
 * refuses the request when this is true. A browser that sent no price is never a mismatch; the
 * server's price applies regardless.
 */
export function hotelPriceMismatch(
  clientCents: number | undefined,
  server: Pick<HotelQuote, 'chargedCents'> | null,
): boolean {
  return clientCents !== undefined && clientCents !== server?.chargedCents;
}

/**
 * The panel's Quote for a price the server already decided (/api/hotel-price). The browser holds
 * only the amount; it never works a hotel price out, and sends the amount back at submit so the
 * server can refuse a stale one.
 */
export function quoteFromHotelPrice(chargedCents: number, roundTrip: boolean): Quote {
  return {
    kind: 'estimate',
    lowCents: chargedCents,
    highCents: chargedCents,
    miles: 0,
    surcharges: [],
    entryBand: false,
    waitIncludedMin: 0,
    cardLabel: 'Tassy Concierge',
    roundTrip,
    exact: true,
    measuredFrom: null,
    distanceMeasured: true,
    escortCents: 0,
    flatLabel: 'Flat hotel price',
  };
}
