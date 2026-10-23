import assert from 'node:assert/strict';
import { tripRequestSchema } from '../lib/trip-request';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const when = new Date(Date.now() + 3 * 86_400_000);
const p = (x: number) => String(x).padStart(2, '0');
const requestedAt = `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}T10:00`;

const base = {
  serviceLine: 'care',
  pickupAddress: '100 N Tryon St, Charlotte, NC 28202',
  dropoffAddress: '1000 Blythe Blvd, Charlotte, NC 28203',
  requestedAt,
  contactFirstName: 'QA',
  contactLastName: 'Probe',
  contactPhone: '7045550100',
};

const shown = (v: unknown) => {
  const r = tripRequestSchema.safeParse({ ...base, ...(v === undefined ? {} : { estimateShown: v }) });
  assert.ok(r.success, 'payload should validate');
  return (r.data as { estimateShown: boolean }).estimateShown;
};

t('estimateShown: only a real true (or the string "true") means the customer saw a price', () => {
  assert.equal(shown(true), true);
  assert.equal(shown('true'), true);
});

t('estimateShown: the string "false" is false, not true', () => {
  assert.equal(shown('false'), false);
  assert.equal(shown(false), false);
});

t('estimateShown: missing, null, 0, empty and junk are all false', () => {
  assert.equal(shown(undefined), false);
  assert.equal(shown(null), false);
  assert.equal(shown(0), false);
  assert.equal(shown(''), false);
  assert.equal(shown('yes'), false);
  assert.equal(shown({}), false);
});

console.log(`${n} passed`);
