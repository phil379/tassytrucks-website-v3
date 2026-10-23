import assert from 'node:assert/strict';
import { tripRequestSchema } from '../lib/trip-request';
import { containsNul, MAX_REQUEST_BODY_CHARS } from '../lib/request-guards';
import { POST } from '../app/api/trip-request/route';

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
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

await t('estimateShown: only a real true (or the string "true") means the customer saw a price', () => {
  assert.equal(shown(true), true);
  assert.equal(shown('true'), true);
});

await t('estimateShown: the string "false" is false, not true', () => {
  assert.equal(shown('false'), false);
  assert.equal(shown(false), false);
});

await t('estimateShown: missing, null, 0, empty and junk are all false', () => {
  assert.equal(shown(undefined), false);
  assert.equal(shown(null), false);
  assert.equal(shown(0), false);
  assert.equal(shown(''), false);
  assert.equal(shown('yes'), false);
  assert.equal(shown({}), false);
});

const post = (body: string) =>
  POST(new Request('http://localhost/api/trip-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body }));

await t('a NUL character anywhere in the body is a plain 400, not a 500 "could not save"', async () => {
  assert.equal(containsNul({ a: ['x', { b: 'ok\u0000no' }] }), true);
  assert.equal(containsNul({ a: 'fine', b: 1, c: null }), false);
  const res = await post(JSON.stringify({ ...base, contactFirstName: 'A\u0000B' }));
  assert.equal(res.status, 400);
  const json = (await res.json()) as { ok: boolean; fieldErrors?: Record<string, string> };
  assert.equal(json.ok, false);
  assert.ok(json.fieldErrors?.form);
});

await t('an oversized body is refused with 413 before it is parsed', async () => {
  const res = await post(JSON.stringify({ ...base, pad: 'B'.repeat(MAX_REQUEST_BODY_CHARS) }));
  assert.equal(res.status, 413);
  assert.equal(((await res.json()) as { ok: boolean }).ok, false);
});

await t('invalid JSON is still a 400 "Expected a JSON body."', async () => {
  const res = await post('{not json');
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as { error: string }).error, 'Expected a JSON body.');
});

console.log(`${n} passed`);
