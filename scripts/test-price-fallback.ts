import assert from 'node:assert/strict';
import { normalizeUnit, withUnit } from '../lib/address-unit';
import {
  NEEDS_PRICE_MARKER,
  PICK_ADDRESS_MESSAGE,
  PRICE_PENDING_MESSAGE,
  isNeedsPrice,
  needsPriceNote,
} from '../lib/price-fallback';
import { buildRequesterText } from '../lib/notifications';
import { estimateTrip } from '../lib/quote';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

t('the two customer-facing sentences are exactly what was agreed', () => {
  assert.equal(PICK_ADDRESS_MESSAGE, 'Pick your address from the list so we can show your price');
  assert.equal(PRICE_PENDING_MESSAGE, 'A dispatcher will confirm your price before anything is charged.');
});

t('a bare unit number gets a label; a unit that already says what it is is left alone', () => {
  assert.equal(normalizeUnit('1910'), 'Unit 1910');
  assert.equal(normalizeUnit('Apt 1910'), 'Apt 1910');
  assert.equal(normalizeUnit('apt. 4B'), 'apt. 4B');
  assert.equal(normalizeUnit('Suite 300'), 'Suite 300');
  assert.equal(normalizeUnit('#7'), '#7');
  assert.equal(normalizeUnit('Floor 2'), 'Floor 2');
});

t('an empty, blank or comma-only unit is no unit, and commas cannot split the address', () => {
  assert.equal(normalizeUnit(''), null);
  assert.equal(normalizeUnit('   '), null);
  assert.equal(normalizeUnit(null), null);
  assert.equal(normalizeUnit(undefined), null);
  assert.equal(normalizeUnit(', ,'), null);
  assert.equal(normalizeUnit('Apt 5, Rear'), 'Apt 5 Rear');
  assert.equal(normalizeUnit('x'.repeat(100))!.length <= 45, true);
});

t('the stored address is the picked address plus the door; no unit leaves it untouched', () => {
  assert.equal(
    withUnit('1220 Tourmaline Rd, Charlotte, NC 28205, USA', 'Apt 1910'),
    '1220 Tourmaline Rd, Charlotte, NC 28205, USA, Apt 1910',
  );
  assert.equal(withUnit('3106 Aransas Rd, Charlotte, NC 28214, USA', ''), '3106 Aransas Rd, Charlotte, NC 28214, USA');
  assert.equal(withUnit('3106 Aransas Rd', null), '3106 Aransas Rd');
});

t('the reported trip: a typed pickup with no ZIP cannot be priced, the same address picked can', () => {
  const base = {
    serviceLine: 'winnie' as const,
    requestedAt: '2026-10-26T10:00',
    dropoff: { lat: 35.2892281, lng: -80.9174 },
    dropoffAddress: '3106 Aransas Rd, Charlotte, NC 28214, USA',
  };
  // Typed: no coordinates, and "Apt 1910" is not a ZIP.
  assert.equal(estimateTrip({ ...base, pickupAddress: '1220 Tourmaline Rd, Apt 1910' }), null);
  // Picked: coordinates, so there is a price, with the unit nowhere near the matching.
  const picked = estimateTrip({
    ...base,
    pickup: { lat: 35.2561, lng: -80.7352 },
    pickupAddress: '1220 Tourmaline Rd, Charlotte, NC 28205, USA',
  });
  assert.equal(picked?.kind, 'estimate');
});

t('the row note carries a fixed marker a queue can filter on, and says which end failed', () => {
  assert.ok(needsPriceNote({ pickup: true, dropoff: false }).startsWith(NEEDS_PRICE_MARKER));
  assert.match(needsPriceNote({ pickup: true, dropoff: false }), /pickup address was typed/);
  assert.match(needsPriceNote({ pickup: false, dropoff: true }), /destination was typed/);
  assert.match(needsPriceNote({ pickup: true, dropoff: true }), /neither address/);
  assert.match(needsPriceNote({ pickup: false, dropoff: false }), /distance could not be worked out/);
  assert.equal(isNeedsPrice(needsPriceNote({ pickup: true, dropoff: false })), true);
  assert.equal(isNeedsPrice('Call before 5pm'), false);
  assert.equal(isNeedsPrice(null), false);
});

const mail = (over: Partial<Parameters<typeof buildRequesterText>[0]> = {}) =>
  buildRequesterText({
    firstName: 'Pat',
    serviceLine: 'winnie',
    requestedAt: '2026-10-26T14:00:00.000Z',
    reference: 'T-20261023-0001',
    at: new Date('2026-10-26T15:00:00.000Z'),
    ...over,
  });

t('auto-reply with no price and an unpriceable trip tells the customer a dispatcher will confirm it', () => {
  const text = mail({ price: null, priceUnavailable: true });
  assert.ok(text.includes(PRICE_PENDING_MESSAGE));
  assert.ok(text.includes('Nothing is booked and nothing is charged until you agree to the price.'));
});

t('auto-reply with a price shows the price and does NOT carry the dispatcher-will-price line', () => {
  // A single ZIP estimate. (Ranges have their own wording, pinned in test-price-wording.ts.)
  const text = mail({ price: { text: '$59', exact: false }, priceUnavailable: false });
  assert.ok(text.includes('Estimated price: $59'));
  assert.ok(!text.includes(PRICE_PENDING_MESSAGE));
});

t('auto-reply for a quote-only line (no price, not "unavailable") is unchanged: no pending line', () => {
  assert.ok(!mail({ price: null, priceUnavailable: false }).includes(PRICE_PENDING_MESSAGE));
});

console.log(`${n} passed`);
