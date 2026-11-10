// Hotel zone prices (lib/hotel-price.ts) and wheelchair rides (Tassy Care WAV, PR #73) share
// Concierge, so this pins that they never touch each other: a wheelchair quote is main's quote,
// whether or not the trip starts at a listed hotel, and whatever NEXT_PUBLIC_WAV_LIVE says.
// Run with: bun run scripts/test-hotel-wheelchair.ts
import assert from 'node:assert/strict';
import { CARE_WAV, estimateTrip, type Quote, type QuoteInput } from '../lib/quote';
import { hotelBySlug, hotelQuote, type HotelQuoteInput } from '../lib/hotel-price';
import { CLT_TERMINAL, HOTEL_ZONES } from '../lib/hotel-zones';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const CLT = { lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng };
const WEEKDAY_MIDDAY = '2026-11-17T12:00';
const hotel = (slug: string) => {
  const h = hotelBySlug(slug)!;
  return { lat: h.lat, lng: h.lng };
};
const NOT_A_HOTEL = { lat: 35.2046, lng: -80.8384 };
const estimate = (r: ReturnType<typeof estimateTrip>) => {
  assert.equal(r?.kind, 'estimate');
  return r as Quote;
};
const wc = (pickup: { lat: number; lng: number }, o: Partial<QuoteInput> = {}) =>
  estimateTrip({ serviceLine: 'concierge', mobility: 'wheelchair', pickup, dropoff: CLT, requestedAt: WEEKDAY_MIDDAY, roadMiles: 6.9, ...o });

const saved = process.env.NEXT_PUBLIC_WAV_LIVE;
delete process.env.NEXT_PUBLIC_WAV_LIVE;

t('switch unset: a wheelchair Concierge ride from a hotel to CLT is main\'s Care WAV quote ($129 at 6.9 mi), never a hotel price', () => {
  for (const h of HOTEL_ZONES) {
    const q = estimate(wc(hotel(h.slug)));
    assert.equal(q.cardLabel, 'Tassy Care WAV', h.slug);
    assert.equal(q.lowCents, 12900, h.slug);
    assert.equal(q.flatLabel, undefined, `${h.slug}: no flat hotel label on a wheelchair quote`);
    assert.equal(hotelQuote({ serviceLine: 'concierge', mobility: 'wheelchair', pickup: hotel(h.slug), dropoff: CLT }), null, h.slug);
  }
});

t('hotel pricing changes no wheelchair quote: the same trip from a hotel and from a non-hotel address quote identically, one way and round trip', () => {
  for (const h of HOTEL_ZONES) {
    for (const miles of [3, 6.7, 6.9, 7.1, 7.4, 12, 31]) {
      for (const returnTrip of [false, true]) {
        const fromHotel = JSON.stringify(wc(hotel(h.slug), { roadMiles: miles, returnTrip }));
        const elsewhere = JSON.stringify(wc(NOT_A_HOTEL, { roadMiles: miles, returnTrip }));
        assert.equal(fromHotel, elsewhere, `${h.slug} ${miles} mi return=${returnTrip}`);
      }
    }
  }
});

t('wheelchair quotes carry no hotel surcharge exemption: Saturday and a holiday add the Care surcharges as on main', () => {
  const weekday = estimate(wc(hotel('jw'))).lowCents;
  assert.equal(estimate(wc(hotel('jw'), { requestedAt: '2026-11-21T12:00' })).lowCents - weekday, 2000);
  assert.equal(estimate(wc(hotel('jw'), { requestedAt: '2026-11-26T12:00' })).lowCents - weekday, 4500);
});

t('the WAV switch changes no wheelchair quote and no hotel quote', () => {
  const inputs: { quote: QuoteInput; hotel: HotelQuoteInput }[] = [];
  for (const h of HOTEL_ZONES) {
    for (const mobility of [undefined, 'ambulatory', 'wheelchair']) {
      for (const requestedAt of [WEEKDAY_MIDDAY, '2026-11-21T04:00']) {
        inputs.push({
          quote: { serviceLine: 'concierge', mobility, pickup: hotel(h.slug), dropoff: CLT, requestedAt, roadMiles: 6.9 },
          hotel: { serviceLine: 'concierge', mobility, pickup: hotel(h.slug), dropoff: CLT, now: new Date('2026-12-20T15:00:00Z') },
        });
      }
    }
  }
  const run = () => inputs.map((i) => JSON.stringify([estimateTrip(i.quote), hotelQuote(i.hotel)]));
  delete process.env.NEXT_PUBLIC_WAV_LIVE;
  const off = run();
  process.env.NEXT_PUBLIC_WAV_LIVE = 'true';
  const on = run();
  delete process.env.NEXT_PUBLIC_WAV_LIVE;
  assert.deepEqual(off, on);
});

t('the Care WAV card is untouched by the hotel work', () => {
  assert.deepEqual(CARE_WAV.bands.map((b) => [b.upToMiles, b.cents]), [[5, 10900], [10, 12900], [15, 15500], [20, 18500], [30, 22500]]);
  assert.equal(CARE_WAV.returnFactor, 1.8);
  assert.equal(CARE_WAV.returnFloor, 18000);
});

if (saved === undefined) delete process.env.NEXT_PUBLIC_WAV_LIVE;
else process.env.NEXT_PUBLIC_WAV_LIVE = saved;
console.log(`${n} passed`);
