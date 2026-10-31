// Tassy Care WAV (wheelchair): the switch in lib/wav.ts, and what it changes.
//   OFF (default)  a wheelchair request is "quoted by a person" on every line; nothing else moves.
//   ON             it prices on CARE_WAV for Care, Recovery and Concierge, round trip 1.8x, $180 floor.
// Past 30 miles it is a person either way. Run with: bun run scripts/test-wav-switch.ts
import assert from 'node:assert/strict';
import {
  CARE, CARE_WAV, CONCIERGE, RECOVERY, WAV_MESSAGE,
  cardFor, estimateTrip, isQuoteOnly, roundTripCents, type Quote, type QuoteOnly, type QuoteInput,
} from '../lib/quote';
import { unpricedFor, isNeedsPrice } from '../lib/price-fallback';
import { WAV_PARTNER_LINE, wavLive } from '../lib/wav';
import { tripRequestSchema, type ServiceLine } from '../lib/trip-request';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
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

// ── The switch itself ────────────────────────────────────────────────────────
t('the switch defaults OFF, and only the exact string "true" turns it on', () => {
  off();
  assert.equal(wavLive(), false);
  for (const v of ['', 'false', '0', '1', 'yes', 'TRUE', 'on']) {
    process.env.NEXT_PUBLIC_WAV_LIVE = v;
    assert.equal(wavLive(), false, `"${v}" must not turn it on`);
  }
  on();
  assert.equal(wavLive(), true);
});

// ── ON: Care, Recovery and Concierge all price on CARE_WAV ────────────────────
t('ON: a wheelchair request prices on CARE_WAV for Care, Recovery and Concierge', () => {
  on();
  for (const line of LINES) {
    assert.equal(cardFor(line, 'wheelchair'), CARE_WAV, line);
    assert.equal(isQuoteOnly(line, 'wheelchair'), false, line);
    const q = estimate(trip(line, { mobility: 'wheelchair' }));
    assert.equal(q.cardLabel, 'Tassy Care WAV', line);
  }
  // One way on Care and Concierge is the rung itself; the distance bands are the card's, unchanged.
  assert.equal(estimate(trip('care', { mobility: 'wheelchair' })).lowCents, CARE_WAV.bands[0]!.cents);
  assert.equal(estimate(trip('concierge', { mobility: 'wheelchair' })).lowCents, CARE_WAV.bands[0]!.cents);
});

t('ON: the distance bands are exactly CARE_WAV ($109 / $129 / $155 / $185 / $225)', () => {
  on();
  assert.deepEqual(CARE_WAV.bands.map((b) => [b.upToMiles, b.cents]), [[5, 10900], [10, 12900], [15, 15500], [20, 18500], [30, 22500]]);
  for (const [miles, cents] of [[3, 10900], [5, 10900], [7, 12900], [10, 12900], [12, 15500], [18, 18500], [25, 22500], [30, 22500]] as const) {
    assert.equal(estimate(trip('care', { mobility: 'wheelchair', roadMiles: miles })).lowCents, cents, `${miles} mi`);
  }
});

t('ON: round trip is 1.8x the one-way rung with a $180 floor, on every line', () => {
  on();
  assert.equal(CARE_WAV.returnFactor, 1.8);
  assert.equal(CARE_WAV.returnFloor, 18000);
  for (const line of ['care', 'concierge'] as const) {
    for (const band of CARE_WAV.bands) {
      const q = estimate(trip(line, { mobility: 'wheelchair', roadMiles: band.upToMiles, returnTrip: true }));
      assert.equal(q.lowCents, Math.round(roundTripCents(CARE_WAV, band.cents) / 100) * 100, `${line} ${band.upToMiles} mi`);
      assert.equal(q.roundTrip, true);
    }
  }
  // Recovery is always a round trip with a wheelchair, ticked or not.
  assert.equal(estimate(trip('recovery', { mobility: 'wheelchair' })).lowCents, 19600);
  assert.equal(estimate(trip('recovery', { mobility: 'wheelchair', returnTrip: true })).lowCents, 19600);
  // The floor binds when an entry rung is cut below it: 1.8 x $95 = $171, charged as $180.
  const cheap = { ...CARE_WAV, bands: [{ upToMiles: 5, cents: 9500 }] };
  assert.equal(roundTripCents(cheap, 9500), 18000);
});

t('ON: surcharges follow the Care rules already in the code, and none are added', () => {
  on();
  const weekday = estimate(trip('care', { mobility: 'wheelchair' })).lowCents;
  const saturday = estimate(trip('care', { mobility: 'wheelchair', requestedAt: '2026-11-21T12:00' })).lowCents;
  const lateNight = estimate(trip('care', { mobility: 'wheelchair', requestedAt: '2026-11-17T21:00' })).lowCents;
  assert.equal(saturday - weekday, 2000);
  assert.equal(lateNight - weekday, 2500);
  assert.equal(weekday, estimate(trip('care', { mobility: 'wheelchair' })).highCents);
});

// ── Past 30 miles: always a person ───────────────────────────────────────────
t('ON or OFF: a wheelchair trip over 30 miles is quoted by a person', () => {
  for (const flip of [on, off]) {
    flip();
    for (const line of LINES) {
      const r = trip(line, { mobility: 'wheelchair', roadMiles: 31 }) as QuoteOnly;
      assert.equal(r.kind, 'quote-only', line);
    }
  }
  on();
  const far = trip('care', { mobility: 'wheelchair', roadMiles: 31 }) as QuoteOnly;
  assert.equal(far.reason, 'beyond-bands');
  assert.equal(unpricedFor(far, { pickup: false, dropoff: false }).priceUnavailable, true);
});

// ── OFF: wheelchair is a person-quote; nothing else changes ──────────────────
t('OFF: wheelchair is "quoted by a dispatcher" on Care, Recovery and Concierge, with no price', () => {
  off();
  for (const line of LINES) {
    assert.equal(cardFor(line, 'wheelchair'), null, line);
    assert.equal(isQuoteOnly(line, 'wheelchair'), true, line);
    const r = trip(line, { mobility: 'wheelchair' }) as QuoteOnly;
    assert.equal(r.kind, 'quote-only', line);
    assert.equal(r.reason, 'wheelchair', line);
    assert.equal(r.message, WAV_MESSAGE);
    assert.ok(!/\$\d/.test(r.message), 'the message prints no dollar figure');
    assert.ok(r.message.includes(WAV_PARTNER_LINE));
  }
});

t('OFF: the booking is flagged for a dispatcher to price, and the request is still accepted', () => {
  off();
  const r = trip('care', { mobility: 'wheelchair' });
  const u = unpricedFor(r, { pickup: false, dropoff: false });
  assert.equal(u.priceUnavailable, true);
  assert.ok(isNeedsPrice(u.note));
  for (const serviceLine of LINES) {
    const ok = tripRequestSchema.safeParse({
      serviceLine, mobility: 'wheelchair', pickupAddress: '100 N Tryon St, Charlotte, NC 28202',
      dropoffAddress: '1000 Blythe Blvd, Charlotte, NC 28203', requestedAt: '2099-01-05T10:00',
      contactFirstName: 'QA', contactLastName: 'Probe', contactPhone: '7045550100',
    });
    assert.ok(ok.success, `${serviceLine} + wheelchair is a valid booking`);
  }
});

t('ON: the booking carries a real price and is not flagged as needing one', () => {
  on();
  const r = trip('care', { mobility: 'wheelchair' });
  assert.equal(r?.kind, 'estimate');
  assert.deepEqual(unpricedFor(r, { pickup: false, dropoff: false }), { priceUnavailable: false, note: null });
});

t('OFF vs ON: every non-wheelchair quote is identical, and a pet ride is never a WAV ride', () => {
  const inputs: QuoteInput[] = [];
  for (const serviceLine of ['care', 'recovery', 'concierge', 'winnie', 'pet'] as ServiceLine[]) {
    for (const mobility of [undefined, 'ambulatory', 'walker', 'other']) {
      for (const roadMiles of [2, 6, 11, 16, 24, 31]) {
        for (const returnTrip of [false, true]) {
          inputs.push({ serviceLine, pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY, roadMiles, returnTrip, mobility });
        }
      }
    }
  }
  inputs.push({ serviceLine: 'pet', pickup: UPTOWN, dropoff: CMC, requestedAt: WEEKDAY_MIDDAY, roadMiles: 4, mobility: 'wheelchair' });
  off();
  const before = inputs.map((i) => JSON.stringify(estimateTrip(i)));
  on();
  const after = inputs.map((i) => JSON.stringify(estimateTrip(i)));
  assert.deepEqual(before, after);
  assert.equal(cardFor('care', 'ambulatory'), CARE);
  assert.equal(cardFor('recovery', 'ambulatory'), RECOVERY);
  assert.equal(cardFor('concierge', null), CONCIERGE);
  off();
  assert.equal(isQuoteOnly('pet', 'wheelchair'), false);
});

off();
console.log(`${n} passed`);
