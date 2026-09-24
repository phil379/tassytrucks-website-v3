import { test, expect } from '@playwright/test';
import {
  RATE_CARD,
  SHOW_ESTIMATES,
  estimateTrip,
  formatRange,
  formatUsd,
  haversineMiles,
  surchargesFor,
} from '../../lib/quote';
import { SERVICE_VALUES } from '../../lib/trip-request';

/** Uptown Charlotte → Atrium Health Carolinas Medical Center. ~1.8 straight miles. */
const UPTOWN = { lat: 35.2271, lng: -80.8431 };
const CMC = { lat: 35.2046, lng: -80.8384 };
/** Uptown → Concord. ~18 straight miles. */
const CONCORD = { lat: 35.4088, lng: -80.5795 };

const WEEKDAY_MIDDAY = '2026-10-07T13:00'; // Wednesday
const SATURDAY_MIDDAY = '2026-10-10T13:00';
const WEEKDAY_NIGHT = '2026-10-07T22:00';

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

  test('one address resolved is not enough', () => {
    expect(estimateTrip({ ...base, pickup: UPTOWN })).toBeNull();
    expect(estimateTrip({ ...base, dropoff: CMC })).toBeNull();
  });

  test('null coordinates are not treated as the equator', () => {
    // 0,0 is in the Atlantic. If null ever coerced to 0 this would return a
    // four-figure fare for a trip across the ocean instead of null.
    const quote = estimateTrip({
      ...base,
      pickup: { lat: null, lng: null },
      dropoff: CMC,
    });
    expect(quote).toBeNull();
  });
});

test.describe('the estimate is a range, never a single number', () => {
  test('a real trip returns a low and a high', () => {
    const quote = estimateTrip({
      serviceLine: 'care',
      pickup: UPTOWN,
      dropoff: CONCORD,
      requestedAt: WEEKDAY_MIDDAY,
    })!;
    expect(quote).not.toBeNull();
    expect(quote.highCents).toBeGreaterThan(quote.lowCents);
    expect(formatRange(quote)).toContain('–');
  });

  test('a short trip falls back to the minimum fare and says so', () => {
    const quote = estimateTrip({
      serviceLine: 'care',
      pickup: UPTOWN,
      dropoff: CMC,
      requestedAt: WEEKDAY_MIDDAY,
    })!;
    expect(quote.atMinimum, 'a 2-mile trip is a minimum-fare trip').toBe(true);
    expect(quote.lowCents).toBeGreaterThanOrEqual(RATE_CARD.care.minimum);
  });

  test('farther costs more', () => {
    const near = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY })!;
    const far = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY })!;
    expect(far.lowCents).toBeGreaterThan(near.lowCents);
  });

  test('a round trip is two legs', () => {
    const oneWay = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY })!;
    const round = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY, returnTrip: true })!;
    expect(round.lowCents).toBe(oneWay.lowCents * 2);
  });

  test('extra passengers cost extra', () => {
    const one = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY, passengers: 1 })!;
    const three = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY, passengers: 3 })!;
    expect(three.lowCents).toBeGreaterThan(one.lowCents);
  });

  test('prices land on clean numbers, not $83.47', () => {
    const quote = estimateTrip({ serviceLine: 'recovery', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY })!;
    expect(quote.lowCents % 500, 'rounded to the nearest $5').toBe(0);
    expect(formatUsd(quote.lowCents)).toMatch(/^\$[\d,]+$/);
  });
});

test.describe('surcharges follow Charlotte time', () => {
  test('a weekday midday trip has none', () => {
    expect(surchargesFor(WEEKDAY_MIDDAY)).toHaveLength(0);
  });

  test('a 10pm weekday pickup is after hours', () => {
    expect(surchargesFor(WEEKDAY_NIGHT).map((s) => s.label)).toContain('After hours');
  });

  test('a Saturday midday pickup is a weekend', () => {
    expect(surchargesFor(SATURDAY_MIDDAY).map((s) => s.label)).toContain('Weekend');
  });

  test('surcharges are judged in Charlotte time, not the server zone', () => {
    // 10pm in Charlotte is 2am UTC the next day. A UTC-based check would call
    // this an early-morning trip on a different weekday.
    const night = surchargesFor(WEEKDAY_NIGHT);
    expect(night.map((s) => s.label)).toContain('After hours');
    expect(night.map((s) => s.label)).not.toContain('Weekend');
  });

  test('an after-hours trip costs more than the same trip at midday', () => {
    const day = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_MIDDAY })!;
    const night = estimateTrip({ serviceLine: 'care', pickup: UPTOWN, dropoff: CONCORD, requestedAt: WEEKDAY_NIGHT })!;
    expect(night.lowCents).toBeGreaterThan(day.lowCents);
  });
});

test.describe('the rate card is complete and sane', () => {
  test('every bookable service line has a rate', () => {
    for (const line of SERVICE_VALUES) {
      expect(RATE_CARD[line], `${line} has a rate`).toBeTruthy();
    }
  });

  test('no line has a minimum below its own base fare', () => {
    for (const [line, rate] of Object.entries(RATE_CARD)) {
      expect(rate.minimum, `${line} minimum covers its base`).toBeGreaterThanOrEqual(rate.base);
    }
  });

  test('every rate is a positive whole number of cents', () => {
    for (const [line, rate] of Object.entries(RATE_CARD)) {
      for (const [field, value] of Object.entries(rate)) {
        expect(Number.isInteger(value), `${line}.${field} is whole cents`).toBe(true);
        expect(value, `${line}.${field} is not negative`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('wheelchair-grade lines cost more per mile than student transport', () => {
    expect(RATE_CARD.recovery.perMile).toBeGreaterThan(RATE_CARD.scholar.perMile);
  });
});

test.describe('the public display stays off until the rates are approved', () => {
  test('SHOW_ESTIMATES is false', () => {
    // This is the guard that keeps an unapproved price off a live booking page.
    // If this test fails, someone published a rate card Phil has not signed off.
    expect(SHOW_ESTIMATES).toBe(false);
  });

  test('no estimate panel appears on the public form', async ({ page }) => {
    await page.goto('/request');
    await expect(page.getByTestId('trip-estimate')).toHaveCount(0);
  });

  test('the preview flag opens the panel for review', async ({ page }) => {
    await page.goto('/request?preview_quote=1');
    const panel = page.getByTestId('trip-estimate');
    await expect(panel).toHaveCount(1);
    // With no addresses picked it must ask, not guess.
    await expect(panel).toContainText('Pick both addresses');
  });
});
