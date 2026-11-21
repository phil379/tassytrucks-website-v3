import assert from 'node:assert/strict';

// Staff lead-time exemption (Phil, 2026-11-20): a booking entered from a
// signed TassyOps staff link may be as soon as the pickup can be served; the
// public keeps the 4-hour minimum. The marker's SIGNATURE is the proof — the
// schema reads its shape, the route verifies and deletes a marker that does
// not prove itself (lib/staff-booking.ts / lib/staff-booking.server.ts).
process.env.INTERNAL_NOTIFY_SECRET = 'test-staff-secret';

const { tripRequestSchema, minDateTimeLocal, MIN_LEAD_TIME_MS } = await import('../lib/trip-request');
const { staffLeadExemption, parseStaffMarker } = await import('../lib/staff-booking');
const { mintStaffMarker, verifyStaffMarker, sanitizeStaffMarker } = await import(
  '../lib/staff-booking.server'
);
const { POST } = await import('../app/api/trip-request/route');

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const PUBLIC_MESSAGE = 'Please choose a time at least 4 hours from now.';
/** A Charlotte wall-clock string ~1h from now (the picker floor at lead 0). */
const inOneHour = () => minDateTimeLocal(new Date(Date.now() + 55 * 60_000), 0);
const inThreeDays = () => minDateTimeLocal(new Date(Date.now() + 3 * 86_400_000), 0);
const twoHoursAgo = () => minDateTimeLocal(new Date(Date.now() - 2 * 3_600_000), 0);

const base = (requestedAt: string) => ({
  serviceLine: 'care',
  pickupAddress: '100 N Tryon St, Charlotte, NC 28202',
  dropoffAddress: '1000 Blythe Blvd, Charlotte, NC 28203',
  requestedAt,
  contactFirstName: 'QA',
  contactLastName: 'Probe',
  contactPhone: '7045550100',
  contactEmail: 'qa@example.com',
});

const leadError = (payload: Record<string, unknown>): string | null => {
  const r = tripRequestSchema.safeParse(payload);
  if (r.success) return null;
  return r.error.issues.find((i) => i.path.join('.') === 'requestedAt')?.message ?? 'other-error';
};

const marker = mintStaffMarker();
assert.ok(marker, 'a marker mints when a secret is configured');

await t('public booking at 1h lead is rejected with the public message, unchanged', () => {
  assert.equal(leadError(base(inOneHour())), PUBLIC_MESSAGE);
});

await t('staff-flagged booking at 1h lead is accepted', () => {
  const r = tripRequestSchema.safeParse({ ...base(inOneHour()), staffMarker: marker });
  assert.ok(r.success, 'payload should validate');
  assert.equal(leadError({ ...base(inOneHour()), staffMarker: marker }), null);
});

await t('a forged marker does not verify, is stripped by the route gate, and the booking is judged public', () => {
  const forged = marker!.replace(/.$/, marker!.endsWith('0') ? '1' : '0');
  assert.equal(verifyStaffMarker(forged), false);
  const raw: Record<string, unknown> = { ...base(inOneHour()), staffMarker: forged };
  sanitizeStaffMarker(raw);
  assert.equal('staffMarker' in raw, false);
  assert.equal(leadError(raw), PUBLIC_MESSAGE);
});

await t('the route itself refuses a forged-marker 1h booking with the public message', async () => {
  const forged = marker!.replace(/.$/, marker!.endsWith('0') ? '1' : '0');
  const res = await POST(
    new Request('http://localhost/api/trip-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...base(inOneHour()), staffMarker: forged }),
    }),
  );
  assert.equal(res.status, 400);
  const json = (await res.json()) as { fieldErrors?: Record<string, string> };
  assert.equal(json.fieldErrors?.requestedAt, PUBLIC_MESSAGE);
});

await t('an expired marker (13h old) earns nothing', () => {
  const old = mintStaffMarker(Math.floor(Date.now() / 1000) - 13 * 3600);
  assert.ok(old);
  assert.equal(verifyStaffMarker(old), false);
  assert.equal(staffLeadExemption(old), false);
  assert.equal(leadError({ ...base(inOneHour()), staffMarker: old }), PUBLIC_MESSAGE);
});

await t('a marker minted under a different secret does not verify', () => {
  process.env.INTERNAL_NOTIFY_SECRET = 'some-other-secret';
  const foreign = mintStaffMarker();
  process.env.INTERNAL_NOTIFY_SECRET = 'test-staff-secret';
  assert.ok(foreign);
  assert.equal(verifyStaffMarker(foreign), false);
});

await t('no secret configured: minting and verification both fail closed', () => {
  delete process.env.INTERNAL_NOTIFY_SECRET;
  try {
    assert.equal(mintStaffMarker(), null);
    assert.equal(verifyStaffMarker(marker), false);
  } finally {
    process.env.INTERNAL_NOTIFY_SECRET = 'test-staff-secret';
  }
});

await t('a garbage marker does not break an ordinary public booking', () => {
  const r = tripRequestSchema.safeParse({ ...base(inThreeDays()), staffMarker: 'not-a-marker' });
  assert.ok(r.success, 'payload should validate');
  assert.equal(parseStaffMarker('not-a-marker'), null);
});

await t('staff exemption is not a time machine: a past pickup is still refused', () => {
  assert.equal(
    leadError({ ...base(twoHoursAgo()), staffMarker: marker }),
    'Please choose a pickup time in the future.',
  );
});

await t('picker floors: staff floor is ~now, public floor is ~+4h', () => {
  const now = new Date();
  const staffFloor = minDateTimeLocal(now, 0);
  const publicFloor = minDateTimeLocal(now);
  assert.ok(staffFloor < publicFloor);
  assert.ok(publicFloor >= minDateTimeLocal(now, MIN_LEAD_TIME_MS));
});

console.log(`${n} passed`);
