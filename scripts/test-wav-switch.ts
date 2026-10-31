// Tassy Care WAV (wheelchair): the switch in lib/wav.ts changes WORDING only.
//   OFF (default)  exactly today's behaviour: wheelchair prices on CARE_WAV, bookings carry that price.
//   ON             same prices and bookings; only the "book and pay" note is added (form, tables).
// Run with: bun run scripts/test-wav-switch.ts
import assert from 'node:assert/strict';
import {
  CARE, CARE_WAV, CONCIERGE, RECOVERY,
  cardFor, estimateTrip, isQuoteOnly, roundTripCents, type Quote, type QuoteOnly, type QuoteInput,
} from '../lib/quote';
import { unpricedFor } from '../lib/price-fallback';
import { WAV_BOOK_AND_PAY_NOTE, WAV_PARTNER_LINE, wavLive } from '../lib/wav';
import { GET as priceList } from '../app/api/price-list/route';
import { tripRequestSchema, type ServiceLine } from '../lib/trip-request';

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const UPTOWN = { lat: 35.2271, lng: -80.8431 };
const CMC = { lat: 35.2046, lng: -80.8384 };
const WEEKDAY_MIDDAY = '2026-11-17T12:00'; // a Tuesday, no surcharge
const LINES: ServiceLine[] = ['care', 'recovery', 'concierge'];

const on = () => { process.env.NEXT_PUBLIC_WAV_LIVE = 'true'; };
const off = () => { delete process.env.NEXT_PUBLIC_WAV_LIVE; };
const trip = (serviceLine: ServiceLine, extra: Partial<QuoteInput> = {}) =>
  estimateTrip({ serviceLine, pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY, roadMiles: 4, ...extra });
const estimate = (r: ReturnType<typeof estimateTrip>) => {
  assert.equal(r?.kind, 'estimate');
  return r as Quote;
};

await t('the switch defaults OFF, and only the exact string "true" turns it on', () => {
  off();
  assert.equal(wavLive(), false);
  for (const v of ['', 'false', '0', '1', 'yes', 'TRUE', 'on']) {
    process.env.NEXT_PUBLIC_WAV_LIVE = v;
    assert.equal(wavLive(), false, `"${v}" must not turn it on`);
  }
  on();
  assert.equal(wavLive(), true);
  off();
});

await t('OFF (today): a wheelchair request prices on CARE_WAV for Care, Recovery and Concierge', () => {
  off();
  for (const line of LINES) {
    assert.equal(cardFor(line, 'wheelchair'), CARE_WAV, line);
    assert.equal(isQuoteOnly(line, 'wheelchair'), false, line);
    assert.equal(estimate(trip(line, { mobility: 'wheelchair' })).cardLabel, 'Tassy Care WAV', line);
  }
  assert.equal(estimate(trip('care', { mobility: 'wheelchair' })).lowCents, 10900);
  assert.equal(estimate(trip('concierge', { mobility: 'wheelchair' })).lowCents, 10900);
});

await t('the distance bands are exactly CARE_WAV ($109 / $129 / $155 / $185 / $225)', () => {
  off();
  assert.deepEqual(CARE_WAV.bands.map((b) => [b.upToMiles, b.cents]), [[5, 10900], [10, 12900], [15, 15500], [20, 18500], [30, 22500]]);
  for (const [miles, cents] of [[3, 10900], [5, 10900], [7, 12900], [10, 12900], [12, 15500], [18, 18500], [25, 22500], [30, 22500]] as const) {
    assert.equal(estimate(trip('care', { mobility: 'wheelchair', roadMiles: miles })).lowCents, cents, `${miles} mi`);
  }
});

await t('round trip is 1.8x the one-way rung with a $180 floor, on every line', () => {
  off();
  assert.equal(CARE_WAV.returnFactor, 1.8);
  assert.equal(CARE_WAV.returnFloor, 18000);
  for (const line of ['care', 'concierge'] as const) {
    for (const band of CARE_WAV.bands) {
      const q = estimate(trip(line, { mobility: 'wheelchair', roadMiles: band.upToMiles, returnTrip: true }));
      assert.equal(q.lowCents, Math.round(roundTripCents(CARE_WAV, band.cents) / 100) * 100, `${line} ${band.upToMiles} mi`);
      assert.equal(q.roundTrip, true);
    }
  }
  assert.equal(estimate(trip('recovery', { mobility: 'wheelchair' })).lowCents, 19600);
  assert.equal(estimate(trip('recovery', { mobility: 'wheelchair', returnTrip: true })).lowCents, 19600);
  const cheap = { ...CARE_WAV, bands: [{ upToMiles: 5, cents: 9500 }] };
  assert.equal(roundTripCents(cheap, 9500), 18000); // 1.8 x $95 = $171, floored to $180
});

await t('surcharges follow the Care rules already in the code, and none are added', () => {
  off();
  const weekday = estimate(trip('care', { mobility: 'wheelchair' })).lowCents;
  assert.equal(estimate(trip('care', { mobility: 'wheelchair', requestedAt: '2026-11-21T12:00' })).lowCents - weekday, 2000);
  assert.equal(estimate(trip('care', { mobility: 'wheelchair', requestedAt: '2026-11-17T21:00' })).lowCents - weekday, 2500);
});

await t('over 30 miles a wheelchair trip is quoted by a person, and the booking is flagged for a price', () => {
  off();
  for (const line of LINES) {
    const r = trip(line, { mobility: 'wheelchair', roadMiles: 31 }) as QuoteOnly;
    assert.equal(r.kind, 'quote-only', line);
    assert.equal(r.reason, 'beyond-bands', line);
    assert.equal(unpricedFor(r, { pickup: false, dropoff: false }).priceUnavailable, true);
  }
});

await t('a wheelchair booking is valid on Care, Recovery and Concierge and carries the card price', () => {
  off();
  for (const serviceLine of LINES) {
    const ok = tripRequestSchema.safeParse({
      serviceLine, mobility: 'wheelchair', pickupAddress: '100 N Tryon St, Charlotte, NC 28202',
      dropoffAddress: '1000 Blythe Blvd, Charlotte, NC 28203', requestedAt: '2099-01-05T10:00',
      contactFirstName: 'QA', contactLastName: 'Probe', contactPhone: '7045550100',
    });
    assert.ok(ok.success, `${serviceLine} + wheelchair is a valid booking`);
  }
  assert.deepEqual(unpricedFor(trip('care', { mobility: 'wheelchair' }), { pickup: false, dropoff: false }), { priceUnavailable: false, note: null });
});

await t('SWITCH OFF vs ON: every quote, for every line and mobility, is byte-identical', () => {
  const inputs: QuoteInput[] = [];
  for (const serviceLine of ['care', 'recovery', 'concierge', 'winnie', 'pet'] as ServiceLine[]) {
    for (const mobility of [undefined, 'ambulatory', 'walker', 'wheelchair']) {
      for (const roadMiles of [2, 6, 11, 16, 24, 31]) {
        for (const returnTrip of [false, true]) {
          inputs.push({ serviceLine, pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY, roadMiles, returnTrip, mobility });
        }
      }
    }
  }
  off();
  const before = inputs.map((i) => JSON.stringify(estimateTrip(i)));
  on();
  const after = inputs.map((i) => JSON.stringify(estimateTrip(i)));
  off();
  assert.deepEqual(before, after);
  assert.equal(cardFor('care', 'ambulatory'), CARE);
  assert.equal(cardFor('recovery', 'ambulatory'), RECOVERY);
  assert.equal(cardFor('concierge', null), CONCIERGE);
  assert.equal(isQuoteOnly('pet', 'wheelchair'), false);
});

await t('/api/price-list is the same OFF and ON, still lists the WAV card, and gains no field', async () => {
  off();
  const a = await (priceList() as Response).json();
  on();
  const b = await (priceList() as Response).json();
  off();
  assert.deepEqual(a, b);
  const wav = a.cards.find((c: { label: string }) => c.label === 'Tassy Care WAV');
  assert.deepEqual(Object.keys(wav).sort(), ['bands', 'label', 'perExtraCents', 'returnFactor', 'returnFloorCents', 'waitIncludedMin', 'waitOverageCents']);
  assert.equal(wav.bands[0].cents, 10900);
});

await t('the book-and-pay note is ON-only wording: it names no dollar figure and no partner', () => {
  assert.ok(!/\$\d/.test(WAV_BOOK_AND_PAY_NOTE));
  assert.ok(!/ambulance|medicaid|medicare|VA\b/i.test(WAV_BOOK_AND_PAY_NOTE + WAV_PARTNER_LINE));
  assert.ok(WAV_PARTNER_LINE.includes('partner network'));
});

off();
console.log(`${n} passed`);
