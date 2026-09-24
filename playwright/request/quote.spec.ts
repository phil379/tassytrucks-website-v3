import { test, expect } from '@playwright/test';
import {
  CARE,
  CARE_WAV,
  CONCIERGE,
  WINNIE,
  SHOW_ESTIMATES,
  bandFor,
  cardFor,
  estimateTrip,
  formatRange,
  formatUsd,
  haversineMiles,
  surchargesFor,
} from '../../lib/quote';
import type { Quote, QuoteOnly } from '../../lib/quote';
import { SERVICE_VALUES } from '../../lib/trip-request';

/** Uptown Charlotte → Atrium Health Carolinas Medical Center. ~1.6 straight miles. */
const UPTOWN = { lat: 35.2271, lng: -80.8431 };
const CMC = { lat: 35.2046, lng: -80.8384 };
/** Uptown → Concord. ~18 straight miles, so ~22–26 road miles. */
const CONCORD = { lat: 35.4088, lng: -80.5795 };
/** Uptown → north Charlotte. ~5.5 straight miles, so 6.9–8.0 road miles. */
const NORTH_CLT = { lat: 35.3068, lng: -80.8431 };
/** Uptown → Winston-Salem. ~69 straight miles: past every card. */
const WINSTON = { lat: 36.0999, lng: -80.2442 };

const WEEKDAY_MIDDAY = '2026-10-07T13:00'; // Wednesday
const SATURDAY_MIDDAY = '2026-10-10T13:00';
const WEEKDAY_NIGHT = '2026-10-07T22:00';

/** Narrows, and fails the test with a useful message rather than a type error. */
function asEstimate(r: ReturnType<typeof estimateTrip>): Quote {
  expect(r, 'expected an estimate').toBeTruthy();
  expect(r!.kind).toBe('estimate');
  return r as Quote;
}

function asQuoteOnly(r: ReturnType<typeof estimateTrip>): QuoteOnly {
  expect(r, 'expected a quote-only answer').toBeTruthy();
  expect(r!.kind).toBe('quote-only');
  return r as QuoteOnly;
}

test.describe('distance', () => {
  test('haversine matches a known Charlotte pair', () => {
    const miles = haversineMiles(UPTOWN, CMC);
    expect(miles).toBeGreaterThan(1.3);
    expect(miles).toBeLessThan(2.2);
  });

  test('the same point is zero miles', () => {
    expect(haversineMiles(UPTOWN, UPTOWN)).toBeCloseTo(0, 5);
  });

  test('it is symmetric', () => {
    expect(haversineMiles(UPTOWN, CONCORD)).toBeCloseTo(haversineMiles(CONCORD, UPTOWN), 6);
  });
});

test.describe('it never quotes what it cannot measure', () => {
  const base = { serviceLine: 'care' as const, requestedAt: WEEKDAY_MIDDAY };

  test('no coordinates, no estimate', () => {
    expect(estimateTrip({ ...base })).toBeNull();
  });

  test('one address picked is not enough', () => {
    expect(estimateTrip({ ...base, pickup: UPTOWN })).toBeNull();
    expect(estimateTrip({ ...base, dropoff: CMC })).toBeNull();
  });

  test('a half-resolved place (lat but no lng) is not enough', () => {
    expect(
      estimateTrip({ ...base, pickup: { lat: 35.2, lng: null }, dropoff: CMC }),
    ).toBeNull();
  });
});

test.describe('bands', () => {
  test('a short trip lands in the entry band and reads as one number', () => {
    const q = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
      }),
    );
    expect(q.lowCents).toBe(4000);
    expect(q.highCents).toBe(4000);
    expect(q.entryBand).toBe(true);
    // The whole point of bands: no fake-precise range on a 2-mile trip.
    expect(formatRange(q)).toBe('$40');
  });

  test('a longer trip costs more', () => {
    const near = asEstimate(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    const far = asEstimate(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY }),
    );
    expect(far.lowCents).toBeGreaterThan(near.lowCents);
  });

  test('bands are ascending on every card, and none is free', () => {
    for (const card of [CARE, CARE_WAV, CONCIERGE, WINNIE]) {
      for (let i = 1; i < card.bands.length; i += 1) {
        expect(card.bands[i]!.upToMiles, `${card.label} band ${i} distance`).toBeGreaterThan(
          card.bands[i - 1]!.upToMiles,
        );
        expect(card.bands[i]!.cents, `${card.label} band ${i} price`).toBeGreaterThan(
          card.bands[i - 1]!.cents,
        );
      }
      expect(card.bands[0]!.cents, `${card.label} entry price`).toBeGreaterThan(0);
    }
  });

  test('bandFor picks the first rung that contains the distance', () => {
    expect(bandFor(CARE, 3)!.cents).toBe(4000); // inclusive upper edge
    expect(bandFor(CARE, 3.1)!.cents).toBe(5500);
    expect(bandFor(CARE, 999)).toBeNull();
  });

  test('past the last band it says so instead of extrapolating', () => {
    const q = asQuoteOnly(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: WINSTON,
        requestedAt: WEEKDAY_MIDDAY,
      }),
    );
    expect(q.reason).toBe('beyond-bands');
    expect(q.message).toContain('dispatcher');
  });
});

test.describe("Phil's approved entry prices", () => {
  test('Tassy Care starts at $40 and Care WAV at $50', () => {
    expect(CARE.bands[0]!.cents).toBe(4000);
    expect(CARE_WAV.bands[0]!.cents).toBe(5000);
  });

  test('Concierge starts at $100', () => {
    expect(CONCIERGE.bands[0]!.cents).toBe(10000);
  });

  test('Winnie Ride is exactly $49 / $59 / $69 / $79 / $89', () => {
    expect(WINNIE.bands.map((b) => b.cents)).toEqual([4900, 5900, 6900, 7900, 8900]);
  });

  test('WAV costs more than ambulatory at every distance', () => {
    for (let i = 0; i < CARE.bands.length; i += 1) {
      expect(CARE_WAV.bands[i]!.cents).toBeGreaterThan(CARE.bands[i]!.cents);
    }
  });
});

test.describe('wheelchair switches the card', () => {
  test('cardFor sends a wheelchair passenger to the WAV card', () => {
    expect(cardFor('care', 'ambulatory')).toBe(CARE);
    expect(cardFor('care', 'wheelchair')).toBe(CARE_WAV);
    expect(cardFor('care', null)).toBe(CARE);
  });

  test('a wheelchair quote is the WAV price, and says which card it used', () => {
    const amb = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        mobility: 'ambulatory',
      }),
    );
    const wav = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        mobility: 'wheelchair',
      }),
    );
    expect(wav.lowCents).toBeGreaterThan(amb.lowCents);
    expect(wav.cardLabel).toBe('Tassy Care WAV');
    expect(amb.cardLabel).toBe('Tassy Care');
  });

  test('wheelchair does NOT move a pet trip onto the WAV card', () => {
    // A dog does not need a lift. The form blocks this combination, but the
    // engine must not price it as a wheelchair run if a stale row reaches it.
    expect(cardFor('pet', 'wheelchair')).toBe(WINNIE);
  });
});

test.describe('round trips', () => {
  test('Tassy Care doubles — two dispatches, two fares', () => {
    const one = asEstimate(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    const two = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        returnTrip: true,
      }),
    );
    expect(two.lowCents).toBe(one.lowCents * 2);
  });

  test('Winnie round trip is $89 on the entry band, exactly as specified', () => {
    const q = asEstimate(
      estimateTrip({
        serviceLine: 'pet',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        returnTrip: true,
      }),
    );
    expect(q.lowCents).toBe(8900);
    // And the wait allowance grows, because the driver stays with the animal.
    expect(q.waitIncludedMin).toBe(30);
  });

  test('a Winnie round trip is cheaper than two one-ways', () => {
    // Above the entry band, so the $89 floor is not what is being measured.
    const one = asEstimate(
      estimateTrip({ serviceLine: 'pet', pickup: UPTOWN, dropoff: NORTH_CLT, requestedAt: WEEKDAY_MIDDAY }),
    );
    const two = asEstimate(
      estimateTrip({
        serviceLine: 'pet',
        pickup: UPTOWN,
        dropoff: NORTH_CLT,
        requestedAt: WEEKDAY_MIDDAY,
        returnTrip: true,
      }),
    );
    expect(two.lowCents).toBeLessThan(one.lowCents * 2);
    expect(two.lowCents).toBeGreaterThan(one.lowCents);
  });

  test('Concierge is ALREADY a round trip and must not double', () => {
    const one = asEstimate(
      estimateTrip({ serviceLine: 'recovery', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    const two = asEstimate(
      estimateTrip({
        serviceLine: 'recovery',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        returnTrip: true,
      }),
    );
    expect(two.lowCents).toBe(one.lowCents);
    expect(one.roundTrip).toBe(true);
  });
});

test.describe('Tassy Scholar is quoted, not metered', () => {
  test('it returns quote-only even with both addresses resolved', () => {
    const q = asQuoteOnly(
      estimateTrip({
        serviceLine: 'scholar',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
      }),
    );
    expect(q.reason).toBe('quoted-line');
    expect(q.message).toContain('school year');
  });

  test('it says so before it needs coordinates at all', () => {
    // A parent picking "Tassy Scholar" should learn how it is priced
    // immediately, not after filling in two addresses.
    const q = asQuoteOnly(estimateTrip({ serviceLine: 'scholar' }));
    expect(q.miles).toBeNull();
  });
});

test.describe('surcharges', () => {
  test('a weekday midday trip has none — this is the target window', () => {
    expect(surchargesFor(WEEKDAY_MIDDAY)).toEqual([]);
  });

  test('a 10 PM weekday trip is after hours', () => {
    const s = surchargesFor(WEEKDAY_NIGHT);
    expect(s.map((x) => x.label)).toEqual(['After hours']);
  });

  test('a Saturday midday trip is a weekend', () => {
    const s = surchargesFor(SATURDAY_MIDDAY);
    expect(s.map((x) => x.label)).toEqual(['Weekend']);
  });

  test('surcharges land on the fare', () => {
    const day = asEstimate(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    const night = asEstimate(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_NIGHT }),
    );
    expect(night.lowCents - day.lowCents).toBe(2500);
  });

  test('a surcharge is charged ONCE, not once per leg', () => {
    // One dispatch, at one hour of the day. Doubling the after-hours fee on a
    // round trip is the kind of arithmetic a customer checks.
    const oneWay = asEstimate(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_NIGHT }),
    );
    const round = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_NIGHT,
        returnTrip: true,
      }),
    );
    expect(round.lowCents).toBe((oneWay.lowCents - 2500) * 2 + 2500);
  });

  test('an unparseable time attracts nothing rather than guessing', () => {
    expect(surchargesFor(null)).toEqual([]);
    expect(surchargesFor('not a date')).toEqual([]);
  });
});

test.describe('extra passengers', () => {
  test('more passengers cost more, once', () => {
    const one = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        passengers: 1,
      }),
    );
    const three = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        passengers: 3,
      }),
    );
    expect(three.lowCents - one.lowCents).toBe(2 * CARE.perExtra);
  });
});

test.describe('coverage and formatting', () => {
  test('every requestable service line resolves to a card or a quote', () => {
    for (const line of SERVICE_VALUES) {
      const r = estimateTrip({
        serviceLine: line,
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
      });
      expect(r, `${line} produced no answer at all`).toBeTruthy();
      expect(['estimate', 'quote-only'], `${line}`).toContain(r!.kind);
    }
  });

  test('money reads as whole dollars', () => {
    expect(formatUsd(4000)).toBe('$40');
    expect(formatUsd(123400)).toBe('$1,234');
  });

  test('estimates are on', () => {
    // Phil approved the card on 2026-09-24 and asked for instant pricing.
    // If this ever flips back to false, it should be a deliberate decision.
    expect(SHOW_ESTIMATES).toBe(true);
  });
});
