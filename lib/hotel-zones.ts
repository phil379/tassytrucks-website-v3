/**
 * Hotel zones: DATA ONLY. The rules that read this table live in lib/hotel-price.ts.
 *
 * A hotel zone price is a fixed Concierge price for a ride between a listed hotel and the CLT
 * terminal area, so the same hotel never quotes $99 one day and $109 the next because the road
 * distance came back 6.9 or 7.1 miles. It is a per-hotel (per-zone) price, not one price for all
 * of Charlotte. Every other address keeps using the normal quote engine.
 *
 * NO DOLLAR AMOUNTS LIVE HERE except the introductory prices and a negotiated `overrideCents`.
 * The normal hotel price is the live Concierge card price at `referenceMiles`, worked out in
 * lib/hotel-price.ts from CONCIERGE in lib/quote.ts, so a later card change flows through.
 *
 * COORDINATES. Looked up 2026-10-31 from a Google Maps places search (name, address, place id,
 * latitude, longitude). They were NOT run through the site's own geocoder because the Maps key is
 * not available to the build session. Re-check them with `bun run scripts/geocode-hotels.ts`
 * (needs GOOGLE_MAPS_API_KEY) before launch. A coordinate that is wrong by more than
 * HOTEL_MATCH_RADIUS_M only ever fails SAFE: that hotel quotes the normal ladder.
 *
 * TODO(Phil): NO-SHOW FEE. Add a $25-35 no-show line to the Concierge terms once the amount is
 * decided. Nothing charges it in code today, and no page promises it. (Separate from this: if
 * the guest no-shows, the driver's $25 callout fee is an ops-repo rule, not built here.)
 */

export type HotelZoneId = 'uptown' | 'southpark' | 'airport-area';

export type HotelZoneRow = {
  /** URL-safe id used in /airport?hotel=<slug>. Display and pre-fill only; never a price input. */
  slug: string;
  label: string;
  address: string;
  /** Google place id, used to pre-fill the booking form as a picked place. */
  placeId: string;
  lat: number;
  lng: number;
  zone: HotelZoneId;
  /**
   * The road miles used to read the Concierge card for this hotel. One fixed number per hotel,
   * so the price cannot move with a 6.9 or 7.1 mile route.
   */
  referenceMiles: number;
  /** A negotiated hotel rate in cents, or null. Never charged below the $89 floor. */
  overrideCents: number | null;
};

/** A ride counts as a hotel ride when one end is within this many metres of a listed hotel. */
export const HOTEL_MATCH_RADIUS_M = 150;

/** The other end must be inside this circle around the CLT terminal area. */
export const CLT_TERMINAL = {
  label: 'Charlotte Douglas International Airport',
  address: '5501 Josh Birmingham Pkwy, Charlotte, NC 28208',
  placeId: 'ChIJidRKt32YVogRN6fEPG9Kuho',
  lat: 35.2162994,
  lng: -80.9539428,
  radiusMeters: 2000,
} as const;

export const HOTEL_ZONES: readonly HotelZoneRow[] = [
  // ── Uptown loop: one price, because the hotels are a few blocks apart ─────────────────────
  { slug: 'jw', label: 'JW Marriott Charlotte', address: '600 S College St, Charlotte, NC 28202', placeId: 'ChIJ0S-vcSmgVogR7wNbBYFUAZs', lat: 35.2223858, lng: -80.8481961, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'westin', label: 'The Westin Charlotte', address: '601 S College St, Charlotte, NC 28202', placeId: 'ChIJgRbpoSmgVogRWB-4W91uy9Q', lat: 35.2221036, lng: -80.8472698, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'marriott-city-center', label: 'Charlotte Marriott City Center', address: '100 W Trade St, Charlotte, NC 28202', placeId: 'ChIJNXAOiC-gVogR44gSMEdYNX0', lat: 35.2279309, lng: -80.8435714, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'bohemian', label: 'Grand Bohemian Charlotte', address: '201 W Trade St, Charlotte, NC 28202', placeId: 'ChIJifymScChVogRpPxqS0c7Rr0', lat: 35.2281797, lng: -80.844445, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'courtyard', label: 'Courtyard by Marriott Charlotte City Center', address: '237 S Tryon St, Charlotte, NC 28202', placeId: 'ChIJBZqzPy-gVogRpm-slgbmJfE', lat: 35.225625, lng: -80.8450295, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'hilton-uptown', label: 'Hilton Charlotte Uptown', address: '222 E 3rd St, Charlotte, NC 28202', placeId: 'ChIJa15rrSigVogR0gowynh3XIo', lat: 35.2239649, lng: -80.8438219, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'omni', label: 'Omni Charlotte Hotel', address: '132 E Trade St, Charlotte, NC 28202', placeId: 'ChIJk2CotiSgVogRcVR-x9bwl68', lat: 35.2265484, lng: -80.8426556, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'aloft', label: 'Aloft Charlotte City Center', address: '210 E Trade St, Charlotte, NC 28202', placeId: 'ChIJ7cS_6yWgVogRwSvwb2pXBg4', lat: 35.2251928, lng: -80.8422334, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },
  { slug: 'iveys', label: "The Ivey's Hotel", address: '127 N Tryon St, Charlotte, NC 28202', placeId: 'ChIJEbV-XSWgVogRUK0U8nYBzmU', lat: 35.227989, lng: -80.8422606, zone: 'uptown', referenceMiles: 6.9, overrideCents: null },

  // ── SouthPark ────────────────────────────────────────────────────────────────────────────
  { slug: 'ac-southpark', label: 'AC Hotel Charlotte SouthPark', address: '1824 Roxborough Rd, Charlotte, NC 28211', placeId: 'ChIJdySUsj6eVogR0f40KQ_113Q', lat: 35.1564276, lng: -80.8302051, zone: 'southpark', referenceMiles: 11.0, overrideCents: null },

  // ── Airport area: each hotel reads the card at its own distance ──────────────────────────
  { slug: 'sheraton-airport', label: 'Sheraton Charlotte Airport Hotel', address: '3315 Scott Futrell Dr, Charlotte, NC 28208', placeId: 'ChIJbZ-wtxKiVogROzKJ8Fze8FM', lat: 35.2375077, lng: -80.9226235, zone: 'airport-area', referenceMiles: 2.8, overrideCents: null },
  { slug: 'hilton-airport', label: 'Hilton Charlotte Airport', address: '2800 Coliseum Centre Dr, Charlotte, NC 28217', placeId: 'ChIJbzYFRyWZVogRMaXSYBaC_6c', lat: 35.1885478, lng: -80.9153268, zone: 'airport-area', referenceMiles: 5.6, overrideCents: null },
  { slug: 'hgi-airport', label: 'Hilton Garden Inn Charlotte Airport', address: '2400 Cascade Pointe Blvd, Charlotte, NC 28208', placeId: 'ChIJqynRB8GYVogRCw7atWgBXEE', lat: 35.1991755, lng: -80.9167314, zone: 'airport-area', referenceMiles: 4.8, overrideCents: null },
  { slug: 'hampton-airport', label: 'Hampton Inn & Suites Charlotte-Airport', address: '2731 Little Rock Rd, Charlotte, NC 28214', placeId: 'ChIJqbVsF2OiVogRATDYOUp9TFA', lat: 35.2384032, lng: -80.9387362, zone: 'airport-area', referenceMiles: 1.6, overrideCents: null },
];

/**
 * Introductory prices, per zone. Ending an intro is a one-line change: set `introCents` to null.
 *
 * NO CALENDAR DATE TO SET ON MERGE DAY. The window starts by itself at the zone's FIRST hotel
 * booking and runs `introDays` days; until that first booking exists the window has not started.
 * The intro ends at whichever comes first: `introDays` after the first booking, or `introMaxRides`
 * bookings in the zone (both read from the database on the server, see lib/hotel-price.server.ts).
 *
 * The intro is a charge-side discount only. Driver pay is worked out from the card price that is
 * stored beside it (`card_price_cents`), never from the intro price. It is never combined with a
 * referral credit (see referralCreditAllowed in lib/hotel-price.ts).
 */
export type ZoneIntro = {
  introCents: number | null;
  /** Days the intro runs, counted from the zone's first hotel booking. Null = no time limit. */
  introDays: number | null;
  introMaxRides: number | null;
};

export const ZONE_INTROS: Record<HotelZoneId, ZoneIntro> = {
  uptown: { introCents: 8900, introDays: 30, introMaxRides: 20 },
  southpark: { introCents: 9900, introDays: 30, introMaxRides: 20 },
  'airport-area': { introCents: null, introDays: null, introMaxRides: null },
};
