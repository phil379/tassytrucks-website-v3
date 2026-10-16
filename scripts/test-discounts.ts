// Unit tests for lib/discounts.ts. Run: bun run scripts/test-discounts.ts
import assert from 'node:assert/strict';
import { applyDiscount, easternIsoWeekday, meetsMinContribution, pickDiscount, projectedKeepCents, type DiscountProgram } from '../lib/discounts';

const vet: DiscountProgram = { code: 'veteran', label: 'Veteran Rate', pct: 5, serviceLines: ['care', 'recovery', 'winnie'], weekday: null, requiresVerification: true, minContributionCents: 600, active: true };
const senior: DiscountProgram = { code: 'senior_day', label: 'Senior Day', pct: 5, serviceLines: ['care', 'recovery'], weekday: 2, requiresVerification: true, minContributionCents: 600, active: true };
const programs = [vet, senior];
// 2026-10-20 is a Tuesday; 2026-10-21 a Wednesday.
const TUE_NOON = '2026-10-20T16:00:00Z'; // 12:00 Eastern (EDT)
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };

t('weekday helper: Eastern wall clock, not UTC', () => {
  assert.equal(easternIsoWeekday('2026-10-20T16:00:00Z'), 2);
  assert.equal(easternIsoWeekday('2026-10-21T03:30:00Z'), 2); // Tue 11:30 PM EDT
  assert.equal(easternIsoWeekday('2026-10-20T03:30:00Z'), 1); // Mon 11:30 PM EDT
  assert.equal(easternIsoWeekday('2026-10-20T04:30:00Z'), 2); // Tue 12:30 AM EDT
  assert.equal(easternIsoWeekday('not a date'), null);
});
t('weekday helper: DST edges (fall back 2026-11-01, spring forward 2026-03-08)', () => {
  assert.equal(easternIsoWeekday('2026-11-03T04:30:00Z'), 1); // Mon 11:30 PM EST
  assert.equal(easternIsoWeekday('2026-11-03T05:30:00Z'), 2); // Tue 12:30 AM EST
  assert.equal(easternIsoWeekday('2026-03-10T03:30:00Z'), 1); // Mon 11:30 PM EDT
  assert.equal(easternIsoWeekday('2026-03-10T04:30:00Z'), 2);
});
t('verified veteran gets 5% on care, recovery, winnie, any day', () => {
  for (const line of ['care', 'recovery', 'winnie']) {
    assert.deepEqual(pickDiscount({ serviceLine: line, pickupAt: '2026-10-21T16:00:00Z', verified: { veteran: true }, programs }), { code: 'veteran', label: 'Veteran Rate', pct: 5 });
  }
});
t('pet is treated as winnie', () => {
  assert.equal(pickDiscount({ serviceLine: 'pet', verified: { veteran: true }, programs })?.code, 'veteran');
});
t('excluded lines never get a discount', () => {
  for (const line of ['concierge', 'scholar', 'care_wav', 'wellness', 'guardian', '', null, undefined]) {
    assert.equal(pickDiscount({ serviceLine: line as string, pickupAt: TUE_NOON, verified: { veteran: true, senior_day: true }, programs }), null);
  }
});
t('wheelchair mobility on care is Care WAV: excluded', () => {
  assert.equal(pickDiscount({ serviceLine: 'care', mobility: 'Wheelchair', verified: { veteran: true }, programs }), null);
});
t('facility, program-billed and on-account trips are excluded', () => {
  for (const billing of [{ facility: true }, { programBilled: true }, { onAccount: true }]) {
    assert.equal(pickDiscount({ serviceLine: 'care', billing, verified: { veteran: true }, programs }), null);
  }
});
t('unverified rider pays list (no self-attestation)', () => {
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: TUE_NOON, verified: {}, programs }), null);
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: TUE_NOON, verified: { veteran: false, senior_day: false }, programs }), null);
});
t('inactive programs return null (the shipped state)', () => {
  const off = programs.map((p) => ({ ...p, active: false }));
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: TUE_NOON, verified: { veteran: true, senior_day: true }, programs: off }), null);
});
t('senior day: verified senior on Tuesday gets 5%', () => {
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: TUE_NOON, verified: { senior_day: true }, programs })?.code, 'senior_day');
});
t('senior day: verified senior on Wednesday pays list', () => {
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: '2026-10-21T16:00:00Z', verified: { senior_day: true }, programs }), null);
});
t('senior day: Tuesday 12:30 AM Eastern counts, Monday 11:30 PM does not', () => {
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: '2026-10-20T04:30:00Z', verified: { senior_day: true }, programs })?.code, 'senior_day');
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: '2026-10-20T03:30:00Z', verified: { senior_day: true }, programs }), null);
});
t('senior day: no pickup time means no weekday discount', () => {
  assert.equal(pickDiscount({ serviceLine: 'care', pickupAt: null, verified: { senior_day: true }, programs }), null);
});
t('senior day is not offered on winnie', () => {
  assert.equal(pickDiscount({ serviceLine: 'winnie', pickupAt: TUE_NOON, verified: { senior_day: true }, programs }), null);
});
t('veteran aged 70+ on Tuesday gets 5% once, never 10%', () => {
  const r = pickDiscount({ serviceLine: 'care', pickupAt: TUE_NOON, verified: { veteran: true, senior_day: true }, programs });
  assert.equal(r?.pct, 5);
  assert.equal(r?.code, 'veteran'); // tie keeps the earlier program
});
t('a larger or equal plan discount beats the program (no stacking)', () => {
  assert.equal(pickDiscount({ serviceLine: 'care', verified: { veteran: true }, planPct: 15, programs }), null);
  assert.equal(pickDiscount({ serviceLine: 'care', verified: { veteran: true }, planPct: 5, programs }), null);
  assert.equal(pickDiscount({ serviceLine: 'care', verified: { veteran: true }, planPct: 3, programs })?.pct, 5);
});
t('applyDiscount rounds to the cent and adds back to list', () => {
  assert.deepEqual(applyDiscount(8900, 5), { discountCents: 445, agreedCents: 8455 });
  assert.deepEqual(applyDiscount(4900, 5), { discountCents: 245, agreedCents: 4655 });
  assert.deepEqual(applyDiscount(7900, 5), { discountCents: 395, agreedCents: 7505 });
  assert.deepEqual(applyDiscount(19500, 5), { discountCents: 975, agreedCents: 18525 });
  const odd = applyDiscount(7719, 5);
  assert.equal(odd.discountCents + odd.agreedCents, 7719);
  assert.ok(Number.isInteger(odd.discountCents));
});
t('applyDiscount rejects bad input', () => {
  assert.throws(() => applyDiscount(0, 5));
  assert.throws(() => applyDiscount(89.5, 5));
  assert.throws(() => applyDiscount(8900, 0));
  assert.throws(() => applyDiscount(8900, 60));
});
t('projectedKeep matches the TassyOps oracle (driver on LIST, card on collected)', () => {
  const care = { card_fee_pct: 2.9, card_fee_fixed_cents: 30, insurance_cents: 600, dispatch_cents: 300 };
  assert.equal(projectedKeepCents(8900, 8455, 55, care), 2385);
  assert.equal(projectedKeepCents(4900, 4655, 55, care), 895);
  assert.equal(projectedKeepCents(7900, 7505, 55, care), 2012);
  assert.equal(projectedKeepCents(19500, 18525, 55, { ...care, insurance_cents: 800 }), 6133);
});
t('minimum-contribution guard', () => {
  assert.equal(meetsMinContribution(vet, 895), true);
  assert.equal(meetsMinContribution(vet, 599), false);
  assert.equal(meetsMinContribution(vet, 600), true);
});
console.log(`\n${n} tests passed`);
