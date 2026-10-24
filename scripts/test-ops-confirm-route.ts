import assert from 'node:assert/strict';

// POST /api/ops/confirm is the door the TassyOps dispatch board uses to send a rider a pay link.
// Every refusal below happens BEFORE the database or Stripe is touched, so nothing here needs a
// network: if any case reached confirmTrip it would fail on the missing database and the test
// would say so.
process.env.INTERNAL_NOTIFY_SECRET = 'test-secret-do-not-use';
const { POST } = await import('../app/api/ops/confirm/route');
const { BRIDGE_HEADER, signBridgeBody } = await import('../lib/ops-bridge');

const SECRET = process.env.INTERNAL_NOTIFY_SECRET!;
const TRIP = '62ff9131-fb62-415c-821d-a68e6521294d';
const now = () => Math.floor(Date.now() / 1000);

let n = 0;
async function t(name: string, fn: () => Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

function call(body: string, header?: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (header) headers[BRIDGE_HEADER] = header;
  return POST(new Request('http://localhost/api/ops/confirm', { method: 'POST', headers, body }));
}
const good = (extra: Record<string, unknown> = {}) => JSON.stringify({ tripId: TRIP, agreedCents: 5900, onAccount: false, ...extra });
const status = async (r: Response) => [r.status, ((await r.json()) as { error?: string }).error] as const;

await t('an unsigned call is refused with 401', async () => {
  assert.deepEqual(await status(await call(good())), [401, 'unauthorized']);
});

await t('a wrong, malformed, empty or other-purpose signature is refused with 401', async () => {
  const body = good();
  const sig = signBridgeBody(SECRET, body, now());
  assert.equal((await call(body, sig.replace(/.$/, sig.endsWith('0') ? '1' : '0'))).status, 401); // one hex digit off
  assert.equal((await call(body, 'garbage')).status, 401);
  assert.equal((await call(body, 'v1=' + '0'.repeat(64))).status, 401);
  assert.equal((await call(body, signBridgeBody('some-other-secret', body, now()))).status, 401);
});

await t('a signature for a different body (price edited in transit) is refused', async () => {
  const sig = signBridgeBody(SECRET, good({ agreedCents: 100 }), now());
  assert.equal((await call(good({ agreedCents: 5900 }), sig)).status, 401);
  assert.equal((await call(good({ tripId: '00000000-0000-4000-8000-000000000000' }), sig)).status, 401);
});

await t('a signature outside the 5-minute window is refused, old or future-dated', async () => {
  const body = good();
  assert.equal((await call(body, signBridgeBody(SECRET, body, now() - 301))).status, 401);
  assert.equal((await call(body, signBridgeBody(SECRET, body, now() + 301))).status, 401);
});

await t('no secret configured: 503, never an open door', async () => {
  delete process.env.INTERNAL_NOTIFY_SECRET;
  try {
    const body = good();
    assert.deepEqual(await status(await call(body, signBridgeBody(SECRET, body, now()))), [503, 'unconfigured']);
    assert.deepEqual(await status(await call(body)), [503, 'unconfigured']);
    // An empty secret must not validate an "empty-key" signature either.
    process.env.INTERNAL_NOTIFY_SECRET = '';
    assert.equal((await call(body, signBridgeBody('', body, now()))).status, 503);
  } finally {
    process.env.INTERNAL_NOTIFY_SECRET = SECRET;
  }
});

await t('a correctly signed but malformed or unreasonable body is a 400, before any money moves', async () => {
  const signed = (body: string) => call(body, signBridgeBody(SECRET, body, now()));
  const bad = [
    '{not json',
    '[]',
    JSON.stringify({ agreedCents: 5900 }), // no trip
    JSON.stringify({ tripId: 'not-a-uuid', agreedCents: 5900 }),
    good({ agreedCents: 0 }),
    good({ agreedCents: -5900 }),
    good({ agreedCents: 59.5 }),
    good({ agreedCents: '5900' }), // a string, even a numeric one
    good({ agreedCents: null }),
    good({ agreedCents: 5_000_001 }), // above the $50,000 cap
    good({ onAccount: 'yes' }),
  ];
  for (const b of bad) assert.deepEqual(await status(await signed(b)), [400, 'bad_request'], b.slice(0, 60));
});

console.log(`${n} passed`);
