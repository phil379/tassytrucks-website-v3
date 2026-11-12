import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HOTEL_FLOOR_CENTS, driverPayDollarsFromCard, hotelBySlug, hotelQuote, referralCreditAllowed,
} from '../lib/hotel-price';
import { CLT_TERMINAL, HOTEL_ZONES, ZONE_INTROS } from '../lib/hotel-zones';
import { CANCELLATION, CONCIERGE_PRICED_MAX_MILES, conciergeNoShowFeeText } from '../lib/refund-policy';
import { CONCIERGE, bandFor } from '../lib/quote';

/**
 * Phil's decisions, approved 2026-11-12. These numbers are pinned here so a change to the card,
 * the zone table or the policy file that moves them fails a test instead of shipping silently.
 */

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const CLT = { lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng };
const at = (slug: string) => {
  const h = hotelBySlug(slug)!;
  return { lat: h.lat, lng: h.lng };
};
const AFTER_INTRO = { introRidesUsed: 20 }; // cap reached: card price
const IN_INTRO = { introRidesUsed: 0, introFirstBookingAt: null }; // no booking yet: intro open

const APPROVED: Record<string, { card: number; driver: number; intro: number | null }> = {
  jw: { card: 9900, driver: 54, intro: 8900 },
  westin: { card: 9900, driver: 54, intro: 8900 },
  'marriott-city-center': { card: 9900, driver: 54, intro: 8900 },
  bohemian: { card: 9900, driver: 54, intro: 8900 },
  courtyard: { card: 9900, driver: 54, intro: 8900 },
  'hilton-uptown': { card: 9900, driver: 54, intro: 8900 },
  omni: { card: 9900, driver: 54, intro: 8900 },
  aloft: { card: 9900, driver: 54, intro: 8900 },
  iveys: { card: 9900, driver: 54, intro: 8900 },
  'ac-southpark': { card: 10900, driver: 59, intro: 9900 },
  'sheraton-airport': { card: 8900, driver: 48, intro: null },
  'hampton-airport': { card: 8900, driver: 48, intro: null },
  'hgi-airport': { card: 9900, driver: 54, intro: null },
  'hilton-airport': { card: 9900, driver: 54, intro: null },
};

t('every listed hotel is in the approved table, and nothing extra', () => {
  assert.deepEqual(HOTEL_ZONES.map((h) => h.slug).sort(), Object.keys(APPROVED).sort());
});

t('approved card prices and driver pay = floor(0.55 x card), one way, both directions', () => {
  for (const [slug, a] of Object.entries(APPROVED)) {
    for (const [pickup, dropoff] of [[at(slug), CLT], [CLT, at(slug)]] as const) {
      const q = hotelQuote({ serviceLine: 'concierge', pickup, dropoff, ...AFTER_INTRO })!;
      assert.equal(q.cardPriceCents, a.card, `${slug} card`);
      assert.equal(q.chargedCents, a.card, `${slug} after the intro`);
      assert.equal(driverPayDollarsFromCard(q.cardPriceCents), a.driver, `${slug} driver pay`);
      assert.equal(Math.floor((0.55 * a.card) / 100), a.driver);
    }
  }
});

t('intro: Uptown $89 and SouthPark $99 for the first 30 days or 20 rides; driver pay still from the card', () => {
  assert.deepEqual(ZONE_INTROS.uptown, { introCents: 8900, introDays: 30, introMaxRides: 20 });
  assert.deepEqual(ZONE_INTROS.southpark, { introCents: 9900, introDays: 30, introMaxRides: 20 });
  assert.equal(ZONE_INTROS['airport-area'].introCents, null);
  for (const [slug, a] of Object.entries(APPROVED)) {
    const q = hotelQuote({ serviceLine: 'concierge', pickup: at(slug), dropoff: CLT, ...IN_INTRO })!;
    assert.equal(q.chargedCents, a.intro ?? a.card, `${slug} during the intro`);
    assert.equal(q.cardPriceCents, a.card, `${slug} card is stored beside the intro price`);
    assert.equal(driverPayDollarsFromCard(q.cardPriceCents), a.driver, `${slug}: pay from the card, not the intro`);
  }
});

t('flat (no surcharge at any hour or on a holiday) and never below $89', () => {
  assert.equal(HOTEL_FLOOR_CENTS, 8900);
  for (const now of [new Date('2026-11-14T09:00:00Z'), new Date('2026-11-26T23:00:00Z'), new Date('2026-12-25T04:00:00Z')]) {
    for (const slug of Object.keys(APPROVED)) {
      const q = hotelQuote({ serviceLine: 'concierge', pickup: at(slug), dropoff: CLT, now, ...IN_INTRO })!;
      assert.ok(q.chargedCents >= 8900, slug);
    }
  }
});

t('no hotel incentive: the intro is never combined with a referral credit, and none exists in the flow', () => {
  const q = hotelQuote({ serviceLine: 'concierge', pickup: at('jw'), dropoff: CLT, ...IN_INTRO })!;
  assert.equal(q.introApplied, true);
  assert.equal(referralCreditAllowed(q), false);
  const route = readFileSync('app/api/trip-request/route.ts', 'utf8');
  assert.ok(!/referral/i.test(route), 'the booking route applies no referral credit');
});

t('Concierge no-show: $35 flat, trips over 30 miles 100%, waivable, marked for counsel review', () => {
  assert.equal(CANCELLATION.conciergeNoShow.flatFeeCents, 3500);
  assert.equal(conciergeNoShowFeeText(), '$35');
  assert.equal(CANCELLATION.conciergeNoShow.longTripOverMiles, 30, 'today the card ends at 30 miles');
  assert.equal(CANCELLATION.conciergeNoShow.longTripNoShowFeePercent, 100);
  assert.equal(CANCELLATION.conciergeNoShow.counselReview, true);
  assert.equal(CANCELLATION.mayWaiveCaseByCase, true);
  assert.equal(CANCELLATION.trip.noShowFeePercent, 100, 'every other line keeps the Oct 24 100%');
  const src = readFileSync('lib/refund-policy.ts', 'utf8');
  assert.ok(/FOR COUNSEL REVIEW/.test(src));
  const page = readFileSync('app/refunds/page.tsx', 'utf8');
  assert.ok(/conciergeNoShowFeeText\(\)/.test(page), '/refunds reads the amount from the config');
  assert.ok(!/\$35/.test(page), 'the page never types the amount');
});

t('a "long trip" is exactly what the website does not price: read from the Concierge card, never typed', () => {
  const last = CONCIERGE.bands[CONCIERGE.bands.length - 1]!.upToMiles;
  assert.equal(CONCIERGE_PRICED_MAX_MILES, last);
  assert.equal(CANCELLATION.conciergeNoShow.longTripOverMiles, last);
  // Exactly the last band is still priced (not long); anything past it is not priced (long).
  assert.ok(bandFor(CONCIERGE, last), `${last} miles is priced`);
  assert.equal(bandFor(CONCIERGE, last + 0.01), null, `${last + 0.01} miles is past the card`);
  // The policy file reads the card; it does not type the number.
  const src = readFileSync('lib/refund-policy.ts', 'utf8');
  assert.ok(/longTripOverMiles: CONCIERGE_PRICED_MAX_MILES,/.test(src));
  assert.ok(/CONCIERGE\.bands\[CONCIERGE\.bands\.length - 1\]!\.upToMiles/.test(src));
  assert.ok(!/longTripOverMiles:\s*\d/.test(src), 'no typed mileage');
});

console.log(`${n} approved pricing checks passed`);
