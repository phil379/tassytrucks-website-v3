import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONCIERGE, estimateTrip, haversineMiles } from '../lib/quote';
import {
  HOTEL_FLOOR_CENTS, atTerminal, driverPayDollarsFromCard, hotelAt, hotelBySlug, hotelPriceMismatch,
  hotelQuote, quoteFromHotel, referralCreditAllowed, type HotelQuoteInput,
} from '../lib/hotel-price';
import { CLT_TERMINAL, HOTEL_MATCH_RADIUS_M, HOTEL_ZONES, ZONE_INTROS } from '../lib/hotel-zones';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const CLT = { lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng };
const hotel = (slug: string) => {
  const h = hotelBySlug(slug);
  assert.ok(h, `hotel ${slug} exists`);
  return { lat: h!.lat, lng: h!.lng };
};
/**
 * The intro window starts at the zone's first hotel booking (here Nov 1, 2026) and runs
 * ZONE_INTROS.<zone>.introDays days. IN_INTRO is 9 days in; AFTER_INTRO is 49 days in.
 */
const FIRST_BOOKING = '2026-11-01T15:00:00Z';
const IN_INTRO = new Date('2026-11-10T15:00:00Z');
const AFTER_INTRO = new Date('2026-12-20T15:00:00Z');

function q(slug: string, o: Partial<HotelQuoteInput> = {}) {
  return hotelQuote({ serviceLine: 'concierge', pickup: hotel(slug), dropoff: CLT, now: AFTER_INTRO, introFirstBookingAt: FIRST_BOOKING, ...o });
}
const cents = (slug: string, o: Partial<HotelQuoteInput> = {}) => q(slug, o)?.chargedCents;

// ── The zone table, as it prices today.
t('the card price per hotel today: uptown $99, southpark $109, Sheraton $89, Hampton $89, Hilton Garden Inn $99, Hilton Airport $99', () => {
  assert.equal(cents('jw'), 9900);
  assert.equal(cents('iveys'), 9900);
  assert.equal(cents('ac-southpark'), 10900);
  assert.equal(cents('sheraton-airport'), 8900);
  assert.equal(cents('hampton-airport'), 8900);
  assert.equal(cents('hgi-airport'), 9900);
  assert.equal(cents('hilton-airport'), 9900);
});

t('every Uptown hotel quotes the same price (one price for the whole loop)', () => {
  const prices = HOTEL_ZONES.filter((h) => h.zone === 'uptown').map((h) => cents(h.slug));
  assert.equal(new Set(prices).size, 1);
  assert.equal(prices.length, 9);
});

t('the introductory price: Uptown $89 and SouthPark $99 while it runs, then the card price; airport hotels never get one', () => {
  assert.equal(cents('jw', { now: IN_INTRO }), 8900);
  assert.equal(q('jw', { now: IN_INTRO })?.introApplied, true);
  assert.equal(cents('ac-southpark', { now: IN_INTRO }), 9900);
  assert.equal(cents('jw', { now: AFTER_INTRO }), 9900);
  assert.equal(q('jw', { now: AFTER_INTRO })?.introApplied, false);
  assert.equal(cents('hgi-airport', { now: IN_INTRO }), 9900);
  assert.equal(q('hgi-airport', { now: IN_INTRO })?.introApplied, false);
});

t('the introductory price also ends after introMaxRides bookings in the zone', () => {
  const max = ZONE_INTROS.uptown.introMaxRides!;
  assert.equal(cents('jw', { now: IN_INTRO, introRidesUsed: max - 1 }), 8900);
  assert.equal(cents('jw', { now: IN_INTRO, introRidesUsed: max }), 9900);
});

t('the intro has no calendar date to set: it starts at the zone\'s first booking and runs introDays days', () => {
  for (const z of Object.values(ZONE_INTROS)) assert.ok(!('introEndsAt' in z), 'no hard-coded end date remains');
  assert.equal(ZONE_INTROS.uptown.introDays, 30);
  assert.equal(ZONE_INTROS.southpark.introDays, 30);
  const day = 86_400_000;
  const start = Date.parse(FIRST_BOOKING);
  // No booking yet: the window has not started, so the intro is on at any date (only the cap applies).
  assert.equal(cents('jw', { now: new Date('2027-06-01T00:00:00Z'), introFirstBookingAt: null }), 8900);
  assert.equal(cents('jw', { now: new Date(start), introFirstBookingAt: FIRST_BOOKING }), 8900, 'day 0');
  assert.equal(cents('jw', { now: new Date(start + 29 * day), introFirstBookingAt: FIRST_BOOKING }), 8900, 'day 29');
  assert.equal(cents('jw', { now: new Date(start + 30 * day), introFirstBookingAt: FIRST_BOOKING }), 9900, 'day 30: ended');
  assert.equal(cents('ac-southpark', { now: new Date(start + 30 * day), introFirstBookingAt: FIRST_BOOKING }), 10900);
  assert.equal(cents('ac-southpark', { now: new Date(start + 29 * day), introFirstBookingAt: FIRST_BOOKING }), 9900);
  // An unreadable start closes the intro rather than guessing a lower price.
  assert.equal(cents('jw', { now: IN_INTRO, introFirstBookingAt: 'not a date' }), 9900);
  // The two limits are independent: 20 bookings ends it inside the 30 days.
  assert.equal(ZONE_INTROS.uptown.introMaxRides, 20);
  assert.equal(cents('jw', { now: new Date(start + 5 * day), introFirstBookingAt: FIRST_BOOKING, introRidesUsed: 19 }), 8900);
  assert.equal(cents('jw', { now: new Date(start + 5 * day), introFirstBookingAt: FIRST_BOOKING, introRidesUsed: 20 }), 9900);
  // Airport hotels never have an intro, whatever the window says.
  assert.equal(cents('hampton-airport', { now: IN_INTRO, introFirstBookingAt: null }), 8900);
  assert.equal(q('hgi-airport', { now: IN_INTRO, introFirstBookingAt: null })?.introApplied, false);
});

t('the server reads the zone\'s first booking (oldest first, test rows out) and a database error closes the intro', () => {
  const src = readFileSync('lib/hotel-price.server.ts', 'utf8');
  assert.ok(/\.eq\('hotel_zone', zone\)[\s\S]*\.eq\('is_test_data', false\)[\s\S]*\.order\('created_at', \{ ascending: true \}\)[\s\S]*\.limit\(1\)/.test(src));
  assert.ok(/if \(error\) return new Date\(0\)\.toISOString\(\)/.test(src), 'an error returns the epoch, so the window is long over');
  assert.ok(/introFirstBookingAt: first/.test(src), 'the first booking is passed into the price');
});

// ── Same hotel, same price, whatever the route says.
t('the same hotel quotes the same price when the engine distance comes back 6.7, 6.9, 7.1 or 7.4 miles', () => {
  const engine = [6.7, 6.9, 7.1, 7.4].map((roadMiles) => {
    const r = estimateTrip({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: CLT, roadMiles, requestedAt: '2026-11-18T10:00' });
    assert.ok(r && r.kind === 'estimate');
    return r.lowCents;
  });
  assert.deepEqual(engine, [9900, 9900, 10900, 10900], 'the engine really does flip at the 7 mile edge');
  // The hotel path never reads a distance at all, so there is nothing for it to flip on.
  for (const miles of [6.7, 6.9, 7.1, 7.4]) {
    assert.equal(cents('jw', { roadMiles: miles } as Partial<HotelQuoteInput>), 9900);
  }
});

t('reverse direction (CLT to hotel) gives the same price; a round trip is exactly double', () => {
  for (const h of HOTEL_ZONES) {
    for (const now of [IN_INTRO, AFTER_INTRO]) {
      const there = hotelQuote({ serviceLine: 'concierge', pickup: hotel(h.slug), dropoff: CLT, now })!;
      const back = hotelQuote({ serviceLine: 'concierge', pickup: CLT, dropoff: hotel(h.slug), now })!;
      assert.equal(back.chargedCents, there.chargedCents, h.slug);
      assert.equal(back.direction, 'from-airport');
      const both = hotelQuote({ serviceLine: 'concierge', pickup: hotel(h.slug), dropoff: CLT, returnTrip: true, now })!;
      assert.equal(both.chargedCents, there.chargedCents * 2, h.slug);
      assert.equal(both.cardPriceCents, there.cardPriceCents * 2, h.slug);
    }
  }
});

// ── Where a hotel price applies, and where it does not.
t('a non-hotel address near Uptown uses the normal ladder', () => {
  const near = { lat: hotel('omni').lat + 0.003, lng: hotel('omni').lng }; // about 330 m north of the Omni
  assert.equal(hotelAt(near), null);
  assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: near, dropoff: CLT, now: AFTER_INTRO }), null);
});

t('the ?hotel= parameter alone changes nothing: the price has no slug input', () => {
  const near = { lat: 35.2301, lng: -80.8402 };
  const withSlug = { serviceLine: 'concierge', pickup: near, dropoff: CLT, now: AFTER_INTRO, hotel: 'hampton-airport', slug: 'hampton-airport' } as HotelQuoteInput;
  assert.equal(hotelQuote(withSlug), null, 'naming a hotel does not make a trip a hotel trip');
  const page = readFileSync('app/airport/page.tsx', 'utf8');
  assert.ok(!/hotelPrefill=\{[^}]*price/i.test(page), 'the page passes addresses to the form, not a price');
});

t('only a hotel <-> CLT trip counts: hotel to hotel, hotel to elsewhere and CLT to elsewhere are not hotel trips', () => {
  const elsewhere = { lat: 35.2, lng: -80.78 };
  assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: hotel('omni') }), null);
  assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: elsewhere }), null);
  assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: CLT, dropoff: elsewhere }), null);
  assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: null, dropoff: CLT }), null);
});

t('only ambulatory Concierge: Care, Recovery, Winnie and a wheelchair rider are never hotel priced', () => {
  for (const serviceLine of ['care', 'recovery', 'winnie', 'pet', 'scholar']) {
    assert.equal(hotelQuote({ serviceLine, pickup: hotel('jw'), dropoff: CLT }), null, serviceLine);
  }
  assert.equal(hotelQuote({ serviceLine: 'concierge', mobility: 'wheelchair', pickup: hotel('jw'), dropoff: CLT }), null);
});

t('the match radius is 150 m: a point 140 m away matches, 170 m does not', () => {
  const h = hotelBySlug('hampton-airport')!;
  const dLat = (m: number) => m / 111_320;
  assert.equal(hotelAt({ lat: h.lat + dLat(140), lng: h.lng })?.slug, 'hampton-airport');
  assert.equal(hotelAt({ lat: h.lat + dLat(170), lng: h.lng }), null);
  assert.equal(HOTEL_MATCH_RADIUS_M, 150);
});

// ── Floor, flat, no hard-coded dollars.
t('a hotel at the airport (Sheraton) quotes the $89 rung, never less, at any hour and with any data', () => {
  assert.equal(cents('sheraton-airport'), 8900);
  const saved = { sheraton: hotelBySlug('sheraton-airport')!.overrideCents, intro: ZONE_INTROS.uptown.introCents };
  hotelBySlug('sheraton-airport')!.overrideCents = 4000; // a negotiated rate cannot go under the floor
  ZONE_INTROS.uptown.introCents = 5000; // nor can an introductory price
  try {
    assert.equal(cents('sheraton-airport'), HOTEL_FLOOR_CENTS);
    assert.equal(cents('jw', { now: IN_INTRO }), HOTEL_FLOOR_CENTS);
  } finally {
    hotelBySlug('sheraton-airport')!.overrideCents = saved.sheraton;
    ZONE_INTROS.uptown.introCents = saved.intro;
  }
  for (const h of HOTEL_ZONES) for (const now of [IN_INTRO, AFTER_INTRO]) {
    for (const returnTrip of [false, true]) {
      const r = hotelQuote({ serviceLine: 'concierge', pickup: hotel(h.slug), dropoff: CLT, returnTrip, now })!;
      assert.ok(r.oneWayChargedCents >= HOTEL_FLOOR_CENTS, h.slug);
    }
  }
});

t('changing a card price in quote.ts changes the hotel price (no hard-coded dollars)', () => {
  const rung = CONCIERGE.bands[1]!; // the 7 mile rung: Uptown
  const saved = rung.cents;
  try {
    rung.cents = 11900;
    assert.equal(cents('jw'), 11900);
    assert.equal(q('jw')?.cardPriceCents, 11900);
    assert.equal(cents('hgi-airport'), 11900);
  } finally {
    rung.cents = saved;
  }
  assert.equal(cents('jw'), 9900);
  assert.ok(!/\b(89|99|109)(00)?\b/.test(readFileSync('lib/hotel-price.ts', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/8900/, '')),
    'lib/hotel-price.ts has no price literal other than the floor');
});

t('FLAT: a Saturday 4 AM quote, a holiday quote and a weekday quote are the same number with no surcharge', () => {
  const times = ['2026-11-14T04:00', '2026-11-26T10:00', '2026-12-25T23:30', '2026-11-18T10:00'];
  const hq = q('jw')!;
  const prices = times.map((requestedAt) => {
    // A hotel quote takes no time; the extra key is ignored, and the Quote it builds has no surcharge.
    const h = hotelQuote({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: CLT, now: AFTER_INTRO, introFirstBookingAt: FIRST_BOOKING, requestedAt } as HotelQuoteInput)!;
    const quote = quoteFromHotel(h);
    assert.deepEqual(quote.surcharges, [], requestedAt);
    assert.equal(quote.lowCents, quote.highCents);
    return quote.lowCents;
  });
  assert.deepEqual(prices, [hq.chargedCents, hq.chargedCents, hq.chargedCents, hq.chargedCents]);
  // And the normal engine really would have added them: that is what flat protects the guest from.
  const sat = estimateTrip({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: CLT, roadMiles: 6.9, requestedAt: times[0] });
  const holiday = estimateTrip({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: CLT, roadMiles: 6.9, requestedAt: times[1] });
  assert.ok(sat && sat.kind === 'estimate' && sat.lowCents === 9900 + 2000, 'normal engine: Saturday +$20');
  assert.ok(holiday && holiday.kind === 'estimate' && holiday.lowCents === 9900 + 4500, 'normal engine: Thanksgiving +$45');
});

// ── The server decides.
t('the server rejects a client-sent price that does not match', () => {
  const server = q('jw')!;
  assert.equal(hotelPriceMismatch(undefined, server), false, 'no client price: the server price applies');
  assert.equal(hotelPriceMismatch(9900, server), false);
  assert.equal(hotelPriceMismatch(8900, server), true, 'a lower price than the server worked out');
  assert.equal(hotelPriceMismatch(9900, null), true, 'a hotel price on a trip that is not a hotel trip');
  assert.equal(hotelPriceMismatch(0, server), true);
  const route = readFileSync('app/api/trip-request/route.ts', 'utf8');
  assert.ok(/hotelPriceMismatch\(data\.hotelQuotedCents, hotel\)/.test(route), 'the booking route calls the check');
  assert.ok(/status: 409/.test(route.slice(route.indexOf('hotelPriceMismatch(data')) ), 'and answers 409 without storing');
  assert.ok(route.indexOf('hotelPriceMismatch(data') < route.indexOf('.insert('), 'before anything is inserted');
});

// ── Driver pay and the intro.
t('at the $89 Uptown intro price the booking records the $99 card price, and driver pay stays $54', () => {
  const intro = q('jw', { now: IN_INTRO })!;
  assert.equal(intro.chargedCents, 8900);
  assert.equal(intro.cardPriceCents, 9900);
  assert.equal(driverPayDollarsFromCard(intro.cardPriceCents), 54);
  // Worked from the charged amount it would be $48: that is exactly the mistake this guards.
  assert.equal(driverPayDollarsFromCard(intro.chargedCents), 48);
  assert.notEqual(driverPayDollarsFromCard(intro.cardPriceCents), driverPayDollarsFromCard(intro.chargedCents));
  assert.equal(driverPayDollarsFromCard(q('ac-southpark')!.cardPriceCents), 59);
  assert.equal(driverPayDollarsFromCard(q('sheraton-airport')!.cardPriceCents), 48);
  const route = readFileSync('app/api/trip-request/route.ts', 'utf8');
  assert.ok(/card_price_cents: hotel\.cardPriceCents/.test(route), 'the row stores the card price');
  assert.ok(!/driver_pay|driverPay/i.test(route), 'driver pay is not computed or stored in this repo');
});

t('the card price is stored for every hotel booking, intro or not, and round trips double it', () => {
  for (const now of [IN_INTRO, AFTER_INTRO]) {
    assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: CLT, now })!.cardPriceCents, 9900);
    assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: hotel('jw'), dropoff: CLT, now, returnTrip: true })!.cardPriceCents, 19800);
  }
});

t('the intro price is never combined with a referral credit', () => {
  assert.equal(referralCreditAllowed(q('jw', { now: IN_INTRO })), false);
  assert.equal(referralCreditAllowed(q('jw', { now: AFTER_INTRO })), true);
  assert.equal(referralCreditAllowed(null), true);
});

// ── The table itself.
t('the table is sane: unique slugs, Charlotte coordinates, none at the terminal, near hotels share a price', () => {
  assert.equal(new Set(HOTEL_ZONES.map((h) => h.slug)).size, HOTEL_ZONES.length);
  assert.equal(HOTEL_ZONES.length, 14);
  for (const h of HOTEL_ZONES) {
    assert.ok(h.lat > 35.1 && h.lat < 35.3 && h.lng > -81.0 && h.lng < -80.8, `${h.slug} is in Charlotte`);
    assert.equal(atTerminal(h), false, `${h.slug} is not inside the terminal circle`);
    assert.ok(h.placeId.length > 10 && h.address.includes('Charlotte'), h.slug);
  }
  for (const a of HOTEL_ZONES) for (const b of HOTEL_ZONES) {
    if (a === b) continue;
    if (haversineMiles(a, b) * 1609.344 <= HOTEL_MATCH_RADIUS_M * 2) {
      assert.equal(cents(a.slug), cents(b.slug), `${a.slug} and ${b.slug} overlap so they must price the same`);
    }
  }
  const uptown = HOTEL_ZONES.filter((h) => h.zone === 'uptown');
  for (const a of uptown) for (const b of uptown) assert.ok(haversineMiles(a, b) < 1, 'the Uptown loop is a few blocks');
});

t('copy rules: the airport page names no vehicle make, model or year and makes no unbuilt claims', () => {
  const page = readFileSync('app/airport/page.tsx', 'utf8');
  assert.ok(/luxurious SUV/.test(page));
  assert.ok(!/expedition|ford|2024|flight track|insured|licensed|uber|lyft/i.test(page));
  assert.ok(/robots: \{ index: false/.test(page), 'noindex');
  assert.ok(!/\$\d/.test(page.replace(/`\$\{[^}]*\}`/g, '')), 'no dollar amount is typed on the page');
});

console.log(`\n${n} hotel zone checks passed`);
