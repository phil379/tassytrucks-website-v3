// Unit tests for lib/promo.ts (Black Friday 2026). Run: bun run scripts/test-promo.ts
import assert from 'node:assert/strict';
import { BLACK_FRIDAY, blackFridayActive, blackFridayDiscount } from '../lib/promo';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };

t('the offer is 10% and calls itself Black Friday', () => {
  assert.equal(BLACK_FRIDAY.pct, 10);
  assert.equal(BLACK_FRIDAY.label, 'Black Friday');
});

t('window: closed the Sunday night before, open Monday Nov 23 from midnight ET', () => {
  assert.equal(blackFridayActive(new Date('2026-11-22T23:59:59-05:00')), false);
  assert.equal(blackFridayActive(new Date('2026-11-23T00:00:00-05:00')), true);
  assert.equal(blackFridayActive(new Date('2026-11-23T07:54:00-05:00')), true);
});

t('window: still open Sunday Nov 29 late evening, closed at Monday midnight ET', () => {
  assert.equal(blackFridayActive(new Date('2026-11-29T23:59:59-05:00')), true);
  assert.equal(blackFridayActive(new Date('2026-11-30T00:00:00-05:00')), false);
  assert.equal(blackFridayActive(new Date('2026-12-01T12:00:00-05:00')), false);
});

t('window: the same instants read in UTC land on the same side', () => {
  // Mon Nov 23 00:00 ET = 05:00 UTC; Mon Nov 30 00:00 ET = 05:00 UTC.
  assert.equal(blackFridayActive(new Date('2026-11-23T04:59:59Z')), false);
  assert.equal(blackFridayActive(new Date('2026-11-23T05:00:00Z')), true);
  assert.equal(blackFridayActive(new Date('2026-11-30T04:59:59Z')), true);
  assert.equal(blackFridayActive(new Date('2026-11-30T05:00:00Z')), false);
});

t('discount: the card prices come off by exactly 10%', () => {
  assert.deepEqual(blackFridayDiscount(4900), { discountCents: 490, agreedCents: 4410 }); // Care from $49
  assert.deepEqual(blackFridayDiscount(5900), { discountCents: 590, agreedCents: 5310 }); // Care $59
  assert.deepEqual(blackFridayDiscount(12900), { discountCents: 1290, agreedCents: 11610 }); // Recovery from $129
  assert.deepEqual(blackFridayDiscount(8900), { discountCents: 890, agreedCents: 8010 }); // Concierge from $89
});

t('discount: cents round the way applyDiscount rounds (nearest cent)', () => {
  assert.deepEqual(blackFridayDiscount(5955), { discountCents: 596, agreedCents: 5359 });
  assert.deepEqual(blackFridayDiscount(10620), { discountCents: 1062, agreedCents: 9558 }); // Winnie RT floor case
});

console.log(`\n${n} promo tests passed`);
