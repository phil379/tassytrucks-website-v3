import assert from 'node:assert/strict';
import { PRICE_RANGE_NOTE, PICK_TO_SEE_PRICE, priceKind, priceLabel } from '../lib/price-fallback';
import { buildRequesterText } from '../lib/notifications';
import { estimateTrip, formatRange, roundTripForced } from '../lib/quote';

// These tests exercise the published Care WAV card, so the switch (lib/wav.ts) is on for them.
// scripts/test-wav-switch.ts covers the off state.
process.env.NEXT_PUBLIC_WAV_LIVE = 'true';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const q = (lowCents: number, highCents: number) => ({ lowCents, highCents }) as Parameters<typeof formatRange>[0];

t('the two sentences are exactly what was agreed', () => {
  assert.equal(PICK_TO_SEE_PRICE, 'Pick your address to see your price');
  assert.equal(PRICE_RANGE_NOTE, 'A dispatcher will confirm the exact price before you’re charged.');
});

t('a range is written $89–$99: an en dash, no spaces; one price is just the price', () => {
  assert.equal(formatRange(q(8900, 9900)), '$89–$99');
  assert.equal(formatRange(q(8900, 8900)), '$89');
});

t('only a single firm price is called "Your price"; a range and a ZIP estimate are "Estimated price"', () => {
  assert.equal(priceLabel(priceKind({ exact: true })), 'Your price');
  assert.equal(priceLabel(priceKind({ exact: true, range: true })), 'Estimated price');
  assert.equal(priceLabel(priceKind({ exact: false, range: true })), 'Estimated price');
  assert.equal(priceLabel(priceKind({ exact: false })), 'Estimated price');
});

t('a range is recognised from its text too, so a missing flag can never make it "Your price"', () => {
  assert.equal(priceKind({ exact: true, text: '$89–$99' }), 'range');
  assert.equal(priceKind({ exact: true, text: '$89 – $99' }), 'range');
  assert.equal(priceKind({ exact: true, text: '$1,089–$1,199' }), 'range');
  assert.equal(priceKind({ exact: true, text: '$89' }), 'firm');
  assert.equal(priceKind({ exact: false, text: '$59' }), 'zip');
});

const mail = (price: Parameters<typeof buildRequesterText>[0]['price']) =>
  buildRequesterText({
    firstName: 'Pat',
    serviceLine: 'winnie',
    requestedAt: '2026-10-26T14:00:00.000Z',
    reference: 'T-1',
    at: new Date('2026-10-26T15:00:00.000Z'),
    price,
  });

t('email, a range: one sentence in the agreed words; never "Your price", never "the price you saw"', () => {
  const text = mail({ text: '$89–$99', exact: false, range: true });
  assert.ok(text.includes('Estimated price $89–$99. A dispatcher will confirm the exact price before you’re charged.'));
  assert.ok(!text.includes('Your price'));
  assert.ok(!text.includes('the price you saw when you booked'));
  assert.ok(!text.includes('ZIP codes'));
});

t('email, a range flagged exact by mistake, or with no flag at all, still reads as a range', () => {
  for (const price of [
    { text: '$89–$99', exact: true, range: true },
    { text: '$89–$99', exact: true },
    { text: '$89 – $99', exact: true },
  ]) {
    const text = mail(price);
    assert.ok(text.includes('A dispatcher will confirm the exact price before you’re charged.'), JSON.stringify(price));
    assert.ok(!text.includes('Your price'), JSON.stringify(price));
    assert.ok(!text.includes('you saw when you booked'), JSON.stringify(price));
  }
});

t('email, one firm price and one ZIP estimate: wording unchanged', () => {
  const firm = mail({ text: '$89', exact: true, range: false });
  assert.ok(firm.includes('Your price: $89'));
  assert.ok(firm.includes('That is the price you saw when you booked.'));
  const zip = mail({ text: '$59', exact: false, range: false });
  assert.ok(zip.includes('Estimated price: $59'));
  assert.ok(zip.includes('That is an estimate from the ZIP codes you entered.'));
});

// Wheelchair Recovery: the box says one way, the job is a round trip.
const rec = (mobility: string | null, returnTrip: boolean) => {
  const r = estimateTrip({
    serviceLine: 'recovery',
    requestedAt: '2026-10-26T10:00',
    pickup: { lat: 35.2271, lng: -80.8431 },
    dropoff: { lat: 35.2271, lng: -80.8131 },
    roadMiles: 2,
    mobility,
    returnTrip,
  });
  assert.equal(r?.kind, 'estimate');
  return r as Extract<typeof r, { kind: 'estimate' }>;
};

t('wheelchair Recovery is a round trip whether or not the box is ticked, and prices the same either way', () => {
  const unticked = rec('wheelchair', false);
  const ticked = rec('wheelchair', true);
  assert.equal(unticked.roundTrip, true);
  assert.equal(unticked.lowCents, ticked.lowCents);
  assert.equal(unticked.highCents, ticked.highCents);
  assert.equal(unticked.cardLabel, 'Tassy Care WAV');
  // 1.8 x the $109 entry rung: the return leg is charged, not dropped.
  assert.equal(unticked.lowCents, 19600);
});

t('nothing else moves: ambulatory Recovery stays $129, and Care + wheelchair stays one way unless ticked', () => {
  assert.equal(rec(null, false).lowCents, 12900);
  assert.equal(rec('ambulatory', true).lowCents, 12900);
  assert.equal(roundTripForced('recovery', 'wheelchair'), true);
  assert.equal(roundTripForced('recovery', 'ambulatory'), false);
  assert.equal(roundTripForced('care', 'wheelchair'), false);
  assert.equal(roundTripForced('concierge', 'wheelchair'), false);
  const care = (returnTrip: boolean) =>
    estimateTrip({
      serviceLine: 'care',
      requestedAt: '2026-10-26T10:00',
      pickup: { lat: 35.2271, lng: -80.8431 },
      dropoff: { lat: 35.2271, lng: -80.8131 },
      roadMiles: 2,
      mobility: 'wheelchair',
      returnTrip,
    }) as { lowCents: number };
  assert.equal(care(false).lowCents, 10900);
  assert.equal(care(true).lowCents, 19600);
});

console.log(`${n} passed`);
