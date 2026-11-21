import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOOKINGS_PAUSED_MESSAGE, bookingsPaused } from '../lib/bookings-paused';
import { POST } from '../app/api/trip-request/route';

// The bookings pause switch (Phil, 2026-11-20): BOOKINGS_PAUSED=1 shows the
// notice instead of the public form and refuses new public bookings at the
// API door. Absent (or anything but '1') is normal operation. Facility
// bookings — a partner flow — are not the public door and are not paused.

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const post = (body: Record<string, unknown>) =>
  POST(
    new Request('http://localhost/api/trip-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

await t('the notice is Phil\'s sentence, verbatim', () => {
  assert.equal(
    BOOKINGS_PAUSED_MESSAGE,
    'Online booking is paused right now — please call (704) 941-8508 and we will book it for you.',
  );
});

await t('the flag fails OFF: unset, "0" and "true" all mean normal operation', () => {
  delete process.env.BOOKINGS_PAUSED;
  assert.equal(bookingsPaused(), false);
  process.env.BOOKINGS_PAUSED = '0';
  assert.equal(bookingsPaused(), false);
  process.env.BOOKINGS_PAUSED = 'true';
  assert.equal(bookingsPaused(), false);
  process.env.BOOKINGS_PAUSED = '1';
  assert.equal(bookingsPaused(), true);
  delete process.env.BOOKINGS_PAUSED;
});

await t('paused: a new public booking is refused 503 with the notice, before any row', async () => {
  process.env.BOOKINGS_PAUSED = '1';
  try {
    const res = await post({});
    assert.equal(res.status, 503);
    const json = (await res.json()) as { ok: boolean; error?: string };
    assert.equal(json.ok, false);
    assert.equal(json.error, BOOKINGS_PAUSED_MESSAGE);
  } finally {
    delete process.env.BOOKINGS_PAUSED;
  }
});

await t('paused: a facility booking is NOT pause-refused (it meets the ordinary checks instead)', async () => {
  process.env.BOOKINGS_PAUSED = '1';
  try {
    const res = await post({ facilityBooking: true });
    assert.notEqual(res.status, 503);
    const json = (await res.json()) as { error?: string };
    assert.notEqual(json.error, BOOKINGS_PAUSED_MESSAGE);
  } finally {
    delete process.env.BOOKINGS_PAUSED;
  }
});

await t('unpaused: the door behaves exactly as before (an empty body is a plain 400)', async () => {
  const res = await post({});
  assert.equal(res.status, 400);
  const json = (await res.json()) as { ok: boolean; error?: string };
  assert.equal(json.ok, false);
  assert.equal(json.error, 'Please check the form.');
});

await t('both public form pages render the notice instead of the form while paused', () => {
  for (const page of ['app/request/page.tsx', 'app/airport/page.tsx']) {
    const src = read(page);
    assert.ok(src.includes('bookingsPaused()'), `${page} checks the switch`);
    assert.ok(src.includes('BOOKINGS_PAUSED_MESSAGE'), `${page} renders the notice`);
  }
});

console.log(`${n} passed`);
