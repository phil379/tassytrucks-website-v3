import { test, expect } from '@playwright/test';
import {
  CARE,
  RECOVERY,
  CONCIERGE,
  WINNIE,
  SHOW_ESTIMATES,
  bandFor,
  cardFor,
  isQuoteOnly,
  estimateTrip,
  formatRange,
  formatUsd,
  haversineMiles,
  surchargesFor,
} from '../../lib/quote';
import type { Quote, QuoteOnly } from '../../lib/quote';
import { extractZip, zipCentroid, resolvePoint } from '../../lib/zip-centroids';
import { SERVICE_VALUES } from '../../lib/trip-request';

/** Uptown Charlotte → Atrium Health Carolinas Medical Center. ~1.6 straight miles. */
const UPTOWN = { lat: 35.2271, lng: -80.8431 };
const CMC = { lat: 35.2046, lng: -80.8384 };
/** Uptown → Concord. ~19 straight miles, so ~24–28 road miles. */
const CONCORD = { lat: 35.4088, lng: -80.5795 };
/** Uptown → north Charlotte. ~5.5 straight miles, so 6.9–8.0 road miles. */
const NORTH_CLT = { lat: 35.3068, lng: -80.8431 };
/** Uptown → Winston-Salem. ~69 straight miles: past every card. */
const WINSTON = { lat: 36.0999, lng: -80.2442 };

const WEEKDAY_MIDDAY = '2026-10-07T13:00'; // Wednesday
const SATURDAY_MIDDAY = '2026-10-10T13:00';
const WEEKDAY_NIGHT = '2026-10-07T22:00';

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

test.describe("Phil's approved entry prices", () => {
  test('Tassy Care starts at $49', () => {
    expect(CARE.bands[0]!.cents).toBe(4900);
  });
  test('Tassy Recovery starts at $129 and includes 20 minutes of wait', () => {
    expect(RECOVERY.bands[0]!.cents).toBe(12900);
    expect(RECOVERY.waitIncludedMin).toBe(20);
  });
  test('Tassy Concierge starts at $69, not $79', () => {
    expect(CONCIERGE.bands[0]!.cents).toBe(6900);
  });
  test('Winnie Ride is exactly $49 / $59 / $69 / $79 / $89', () => {
    expect(WINNIE.bands.map((b) => b.cents)).toEqual([4900, 5900, 6900, 7900, 8900]);
  });
  test('every band on every card is ascending, and none is free', () => {
    for (const card of [CARE, RECOVERY, CONCIERGE, WINNIE]) {
      for (let i = 1; i < card.bands.length; i += 1) {
        expect(card.bands[i]!.upToMiles, `${card.label} rung ${i} distance`).toBeGreaterThan(
          card.bands[i - 1]!.upToMiles,
        );
        expect(card.bands[i]!.cents, `${card.label} rung ${i} price`).toBeGreaterThan(
          card.bands[i - 1]!.cents,
        );
      }
      expect(card.bands[0]!.cents, `${card.label} entry price`).toBeGreaterThan(0);
    }
  });
  test('the Concierge ladder has no jagged step off the floor', () => {
    // A $69 entry against an unchanged $99 second rung would be a 43% jump.
    // Every step should be under 30%.
    for (let i = 1; i < CONCIERGE.bands.length; i += 1) {
      const step = CONCIERGE.bands[i]!.cents / CONCIERGE.bands[i - 1]!.cents - 1;
      expect(step, `Concierge step ${i}`).toBeLessThan(0.3);
    }
  });
  test('Recovery costs more than Care at every distance', () => {
    for (let i = 0; i < CARE.bands.length; i += 1) {
      expect(RECOVERY.bands[i]!.cents).toBeGreaterThan(CARE.bands[i]!.cents);
    }
  });
});

test.describe('the ZIP fallback — pricing survives a missing Maps key', () => {
  test('a ZIP is pulled from the end of a typed address', () => {
    expect(extractZip('2000 Randolph Rd, Charlotte, NC 28207')).toBe('28207');
    expect(extractZip('Charlotte NC 28202-1234')).toBe('28202');
  });
  test('a street number that looks like a ZIP does not win', () => {
    // "28th Street" and a house number must not beat the trailing ZIP.
    expect(extractZip('12345 Elm St, Charlotte, NC 28205')).toBe('28205');
  });
  test('a ZIP outside the service area resolves to nothing', () => {
    expect(extractZip('350 5th Ave, New York, NY 10118')).toBeNull();
    expect(zipCentroid('10118')).toBeNull();
  });
  test('no ZIP at all is null, not a guess', () => {
    expect(extractZip('somewhere near the hospital')).toBeNull();
    expect(extractZip(null)).toBeNull();
    expect(extractZip('')).toBeNull();
  });

  test('a picked place always beats the ZIP, and is marked exact', () => {
    const r = resolvePoint(UPTOWN, '101 N Tryon St, Charlotte, NC 28202')!;
    expect(r.exact).toBe(true);
    expect(r.point).toEqual(UPTOWN);
  });
  test('no picked place falls back to the ZIP, marked NOT exact', () => {
    const r = resolvePoint(null, 'somewhere, Charlotte, NC 28202')!;
    expect(r.exact).toBe(false);
    expect(r.zip).toBe('28202');
  });

  test('two typed addresses with ZIPs still produce a real price', () => {
    const q = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickupAddress: 'Uptown, Charlotte, NC 28202',
        dropoffAddress: 'Matthews, NC 28105',
        requestedAt: WEEKDAY_MIDDAY,
      }),
    );
    expect(q.lowCents).toBeGreaterThan(0);
    // ...and it is honest about where the number came from.
    expect(q.exact).toBe(false);
    expect(q.measuredFrom).toContain('Charlotte');
    expect(q.measuredFrom).toContain('Matthews');
  });

  test('Uptown to Matthews lands in a believable band', () => {
    // Roughly 14 road miles in reality, which is the 13-17 rung at $89.
    const q = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickupAddress: 'Charlotte, NC 28202',
        dropoffAddress: 'Matthews, NC 28105',
        requestedAt: WEEKDAY_MIDDAY,
      }),
    );
    expect(q.lowCents).toBeGreaterThanOrEqual(7400);
    expect(q.highCents).toBeLessThanOrEqual(10900);
  });

  test('one address without a usable ZIP means no price at all', () => {
    expect(
      estimateTrip({
        serviceLine: 'care',
        pickupAddress: 'Charlotte, NC 28202',
        dropoffAddress: 'the clinic on the corner',
        requestedAt: WEEKDAY_MIDDAY,
      }),
    ).toBeNull();
  });

  test('a picked pair is marked exact and names no ZIP source', () => {
    const q = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
      }),
    );
    expect(q.exact).toBe(true);
    expect(q.measuredFrom).toBeNull();
  });
});

test.describe('bands', () => {
  test('a short trip lands in the entry band and reads as one number', () => {
    const q = asEstimate(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    expect(q.lowCents).toBe(4900);
    expect(q.entryBand).toBe(true);
    expect(formatRange(q)).toBe('$49');
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
  test('bandFor picks the first rung that contains the distance', () => {
    expect(bandFor(CARE, 3)!.cents).toBe(4900);
    expect(bandFor(CARE, 3.1)!.cents).toBe(5900);
    expect(bandFor(CARE, 999)).toBeNull();
  });
  test('past the last band it says so instead of extrapolating', () => {
    const q = asQuoteOnly(
      estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: WINSTON, requestedAt: WEEKDAY_MIDDAY }),
    );
    expect(q.reason).toBe('beyond-bands');
    expect(q.message).toContain('dispatcher');
  });
});

test.describe('Care WAV is quoted, never priced', () => {
  test('a wheelchair passenger on Tassy Care gets a quote, not a number', () => {
    const q = asQuoteOnly(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        mobility: 'wheelchair',
      }),
    );
    expect(q.reason).toBe('wheelchair');
    expect(q.message).toContain('ramp-equipped');
  });
  test('an ambulatory passenger on the same trip gets a price', () => {
    const q = asEstimate(
      estimateTrip({
        serviceLine: 'care',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        mobility: 'ambulatory',
      }),
    );
    expect(q.cardLabel).toBe('Tassy Care');
  });
  test('wheelchair does NOT turn a pet trip into a WAV quote', () => {
    // A dog does not need a lift. The form blocks this pairing, but a stale row
    // must not reach the engine and come back unpriced.
    expect(cardFor('pet', 'wheelchair')).toBe(WINNIE);
    expect(isQuoteOnly('pet', 'wheelchair')).toBe(false);
  });
});

test.describe('Recovery and Concierge are different products', () => {
  test('Recovery is ALREADY a round trip and must not double', () => {
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
    expect(one.waitIncludedMin).toBe(20);
  });
  test('Concierge is one way, and a round trip is two reserved legs', () => {
    const one = asEstimate(
      estimateTrip({ serviceLine: 'concierge', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    const two = asEstimate(
      estimateTrip({
        serviceLine: 'concierge',
        pickup: UPTOWN,
        dropoff: CMC,
        requestedAt: WEEKDAY_MIDDAY,
        returnTrip: true,
      }),
    );
    expect(one.lowCents).toBe(6900);
    expect(two.lowCents).toBe(one.lowCents * 2);
    expect(one.waitIncludedMin).toBe(0);
  });
  test('Recovery costs more than Concierge on the same trip', () => {
    const rec = asEstimate(
      estimateTrip({ serviceLine: 'recovery', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    const con = asEstimate(
      estimateTrip({ serviceLine: 'concierge', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    expect(rec.lowCents).toBeGreaterThan(con.lowCents);
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
  test('Winnie round trip is $89 on the entry band, with a longer wait', () => {
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
    expect(q.waitIncludedMin).toBe(20);
  });
  test('a Winnie round trip is cheaper than two one-ways', () => {
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
});

test.describe('Tassy Scholar is quoted by the route', () => {
  test('it returns quote-only even with both addresses resolved', () => {
    const q = asQuoteOnly(
      estimateTrip({ serviceLine: 'scholar', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY }),
    );
    expect(q.reason).toBe('quoted-line');
    expect(q.message).toContain('school year');
    // The reason stop count drives the cost belongs in front of the parent.
    expect(q.message).toContain('stops');
  });
  test('it says so before it needs an address at all', () => {
    const q = asQuoteOnly(estimateTrip({ serviceLine: 'scholar' }));
    expect(q.miles).toBeNull();
  });
});

test.describe('surcharges', () => {
  test('a weekday midday trip has none — this is the target window', () => {
    expect(surchargesFor(WEEKDAY_MIDDAY)).toEqual([]);
  });
  test('a 10 PM weekday trip is after hours', () => {
    expect(surchargesFor(WEEKDAY_NIGHT).map((x) => x.label)).toEqual(['After hours']);
  });
  test('a Saturday midday trip is a weekend', () => {
    expect(surchargesFor(SATURDAY_MIDDAY).map((x) => x.label)).toEqual(['Weekend']);
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

test.describe('it never quotes what it cannot measure', () => {
  const base = { serviceLine: 'care' as const, requestedAt: WEEKDAY_MIDDAY };
  test('nothing at all, no estimate', () => {
    expect(estimateTrip({ ...base })).toBeNull();
  });
  test('one end resolved is not enough', () => {
    expect(estimateTrip({ ...base, pickup: UPTOWN })).toBeNull();
    expect(estimateTrip({ ...base, dropoff: CMC })).toBeNull();
  });
  test('a half-resolved place (lat but no lng) is not enough', () => {
    expect(estimateTrip({ ...base, pickup: { lat: 35.2, lng: null }, dropoff: CMC })).toBeNull();
  });
});

test.describe('coverage and formatting', () => {
  test('every requestable service line resolves to a price or a quote', () => {
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
  test('the dropdown offers Recovery and Concierge as separate lines', () => {
    expect(SERVICE_VALUES).toContain('recovery');
    expect(SERVICE_VALUES).toContain('concierge');
    // Wellness is retired, not deleted — old rows still render its name.
    expect(SERVICE_VALUES).not.toContain('wellness');
    expect(SERVICE_VALUES).not.toContain('guardian');
  });
  test('money reads as whole dollars', () => {
    expect(formatUsd(4900)).toBe('$49');
    expect(formatUsd(123400)).toBe('$1,234');
  });
  test('estimates are on', () => {
    expect(SHOW_ESTIMATES).toBe(true);
  });
});
