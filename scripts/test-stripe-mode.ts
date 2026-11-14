import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { paymentMayMarkPaid, stripeModeForTrip, stripeTestKey, stripeTestModeReady } from '../lib/stripe-mode';

// ── The rules ──────────────────────────────────────────────────────────────
const withKey = { STRIPE_TEST_SECRET_KEY: 'sk_test_abc', STRIPE_SECRET_KEY: 'sk_live_real' };

assert.equal(stripeModeForTrip({ is_test_data: true }, withKey), 'test');
// Only `true` exactly: never a truthy string, never a missing flag.
assert.equal(stripeModeForTrip({ is_test_data: false }, withKey), 'live');
assert.equal(stripeModeForTrip({ is_test_data: 'true' }, withKey), 'live');
assert.equal(stripeModeForTrip({}, withKey), 'live');
assert.equal(stripeModeForTrip(null, withKey), 'live');
// No test key: a test booking behaves exactly as it did before (live link).
assert.equal(stripeModeForTrip({ is_test_data: true }, { STRIPE_SECRET_KEY: 'sk_live_real' }), 'live');
// A LIVE key pasted into the test slot is refused, so a test booking can never charge a card.
assert.equal(stripeTestKey({ STRIPE_TEST_SECRET_KEY: 'sk_live_oops' }), null);
assert.equal(stripeTestModeReady({ STRIPE_TEST_SECRET_KEY: 'sk_live_oops' }), false);
assert.equal(stripeModeForTrip({ is_test_data: true }, { STRIPE_TEST_SECRET_KEY: 'sk_live_oops' }), 'live');
assert.equal(stripeTestKey({ STRIPE_TEST_SECRET_KEY: ' rk_test_restricted ' }), 'rk_test_restricted');

// Test money settles test trips only. Live money: unchanged.
assert.equal(paymentMayMarkPaid('test', { is_test_data: true }), true);
assert.equal(paymentMayMarkPaid('test', { is_test_data: false }), false);
assert.equal(paymentMayMarkPaid('test', null), false);
assert.equal(paymentMayMarkPaid('live', { is_test_data: false }), true);
assert.equal(paymentMayMarkPaid('live', { is_test_data: true }), true);

// ── The key that is actually sent ──────────────────────────────────────────
// A local stand-in for Stripe records which key each call arrives with.
const seen: { auth: string; path: string; body: string }[] = [];
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    seen.push({ auth: String(req.headers.authorization), path: req.url ?? '', body });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(req.url?.startsWith('/products') ? { data: [] } : { id: 'x_1', url: 'https://stripe.test/pay' }));
  });
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const port = (server.address() as { port: number }).port;
process.env.STRIPE_API_BASE = `http://127.0.0.1:${port}`;
process.env.STRIPE_SECRET_KEY = 'sk_live_real';
process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_abc';

const { createTripPaymentLink, createBrandedCheckout, withStripeMode, currentStripeMode } = await import('../lib/stripe');
const trip = { amountCents: 7900, serviceName: 'Tassy Care', confirmationCode: 'TT-46K7HM', tripRequestId: 't1', serviceLine: 'care' };
const checkout = { ...trip, successUrl: 'https://x/r', cancelUrl: 'https://x/p', logoUrl: 'https://x/l.png', tripSummary: 'Ride TT-46K7HM' };

assert.equal(currentStripeMode(), 'live');
await withStripeMode('test', async () => {
  assert.equal(currentStripeMode(), 'test');
  await createTripPaymentLink(trip);
  await createBrandedCheckout(checkout);
});
assert.equal(currentStripeMode(), 'live');
assert.ok(seen.length >= 3);
// Every test-mode call carried the TEST key, and the live key was never sent.
assert.ok(seen.every((c) => c.auth === 'Bearer sk_test_abc'), 'a test-mode call used the wrong key');
// The page says TEST in the item name and beside the Pay button.
const decoded = seen.map((c) => decodeURIComponent(c.body.replace(/\+/g, ' ')));
assert.ok(decoded.some((b) => b.includes('product_data[name]=TEST · Tassy Care · TT-46K7HM')));
assert.ok(decoded.some((b) => b.includes('TEST BOOKING. No real charge') && b.includes('Ride TT-46K7HM')));
assert.ok(decoded.some((b) => b.includes('metadata[stripe_mode]=test')));

seen.length = 0;
await createTripPaymentLink(trip);
await createBrandedCheckout(checkout);
assert.ok(seen.every((c) => c.auth === 'Bearer sk_live_real'), 'a live call used the wrong key');
assert.ok(!seen.some((c) => decodeURIComponent(c.body).includes('TEST')), 'a live page must never say TEST');

// Test mode with no usable test key fails closed; it never falls back to the live key.
process.env.STRIPE_TEST_SECRET_KEY = 'sk_live_oops';
seen.length = 0;
await assert.rejects(() => withStripeMode('test', () => createTripPaymentLink(trip)), /STRIPE_TEST_SECRET_KEY/);
assert.equal(seen.length, 0);

server.close();
console.log('stripe-mode: ok');
