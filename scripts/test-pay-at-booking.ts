// Pay at booking (Phil, 2026-11-20): the eligibility predicate, the /pay
// link-state rule, and the auto-reply's pay-at-booking closing line.
// Run: bun run scripts/test-pay-at-booking.ts
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { payAtBookingEligible, payAtBookingLine } from '../lib/pay-at-booking';
import { buildRequesterText } from '../lib/notifications';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const firm = { exact: true, lowCents: 5900, highCents: 5900 };

/* ── The line rule ─────────────────────────────────────────────────────── */

t('the pay-at-booking lines are care, recovery, concierge and winnie', () => {
  for (const line of ['care', 'recovery', 'concierge', 'winnie']) {
    assert.equal(payAtBookingLine(line, 'ambulatory'), true, line);
    assert.equal(payAtBookingLine(line, null), true, line);
  }
});

t('scholar is never a pay-at-booking line', () => {
  assert.equal(payAtBookingLine('scholar', 'ambulatory'), false);
  assert.equal(payAtBookingLine('guardian', 'ambulatory'), false);
  assert.equal(payAtBookingLine(null), false);
  assert.equal(payAtBookingLine(undefined), false);
});

t('wheelchair is review-first on every line — the partner-network exception', () => {
  for (const line of ['care', 'recovery', 'concierge', 'winnie']) {
    assert.equal(payAtBookingLine(line, 'wheelchair'), false, line);
  }
});

/* ── The full predicate ────────────────────────────────────────────────── */

t('a firm-price retail booking on a pay-at-booking line is eligible', () => {
  assert.equal(
    payAtBookingEligible({ serviceLine: 'care', mobility: 'ambulatory', facility: false, price: firm }),
    true,
  );
  // Treatment Day is a Care booking with a firm flat price: same flow.
  assert.equal(
    payAtBookingEligible({ serviceLine: 'care', mobility: null, facility: false, price: firm }),
    true,
  );
  assert.equal(
    payAtBookingEligible({ serviceLine: 'concierge', mobility: null, facility: false, price: firm }),
    true,
  );
  // Winnie is locked today; when it opens, its firm bookings pay at booking.
  assert.equal(
    payAtBookingEligible({ serviceLine: 'winnie', mobility: null, facility: false, price: firm }),
    true,
  );
});

t('a facility booking is never eligible, however firm its price', () => {
  assert.equal(
    payAtBookingEligible({ serviceLine: 'care', mobility: 'ambulatory', facility: true, price: firm }),
    false,
  );
});

t('no firm price, no charge at booking: range, ZIP estimate, unpriced, zero', () => {
  assert.equal(
    payAtBookingEligible({
      serviceLine: 'care', mobility: 'ambulatory', facility: false,
      price: { exact: true, lowCents: 5900, highCents: 7400 },
    }),
    false,
    'a range is an estimate, not a price',
  );
  assert.equal(
    payAtBookingEligible({
      serviceLine: 'care', mobility: 'ambulatory', facility: false,
      price: { exact: false, lowCents: 5900, highCents: 5900 },
    }),
    false,
    'a ZIP estimate is one number but not a firm one',
  );
  assert.equal(
    payAtBookingEligible({ serviceLine: 'care', mobility: 'ambulatory', facility: false, price: null }),
    false,
    'quote-only / beyond bands',
  );
  assert.equal(
    payAtBookingEligible({
      serviceLine: 'care', mobility: 'ambulatory', facility: false,
      price: { exact: true, lowCents: 0, highCents: 0 },
    }),
    false,
  );
});

t('wheelchair and scholar stay on the dispatcher flow even with a firm price', () => {
  assert.equal(
    payAtBookingEligible({ serviceLine: 'care', mobility: 'wheelchair', facility: false, price: firm }),
    false,
  );
  assert.equal(
    payAtBookingEligible({ serviceLine: 'recovery', mobility: 'wheelchair', facility: false, price: firm }),
    false,
  );
  assert.equal(
    payAtBookingEligible({ serviceLine: 'scholar', mobility: null, facility: false, price: firm }),
    false,
  );
});

t('an out-of-area pickup is never pay-at-booking, however firm its price', () => {
  // The sequencing guard (PR #132 rebased onto PR #139): the route measures
  // the pickup against the Charlotte ring (lib/service-area.ts) and passes
  // the flag in. A Raleigh pickup on a firm-price Care booking must land as a
  // plain quote request — never auto-confirmed, never charged.
  for (const line of ['care', 'recovery', 'concierge', 'winnie']) {
    assert.equal(
      payAtBookingEligible({ serviceLine: line, mobility: 'ambulatory', facility: false, price: firm, outOfArea: true }),
      false,
      line,
    );
  }
  // The same bookings inside the ring stay eligible: the flag, and only the
  // flag, changes the answer.
  assert.equal(
    payAtBookingEligible({ serviceLine: 'care', mobility: 'ambulatory', facility: false, price: firm, outOfArea: false }),
    true,
  );
  assert.equal(
    payAtBookingEligible({ serviceLine: 'care', mobility: 'ambulatory', facility: false, price: firm }),
    true,
  );
});

/* ── The auto-reply's closing line ─────────────────────────────────────── */

const mail = (payAtBooking: boolean) =>
  buildRequesterText({
    firstName: 'Pat',
    serviceLine: 'care',
    requestedAt: '2026-11-21T14:00:00.000Z',
    reference: 'T-1',
    at: new Date('2026-11-20T15:00:00.000Z'),
    price: { text: '$59', exact: true, range: false },
    payAtBooking,
  });

t('auto-reply, pay at booking: the dispatcher-first promise is gone, the pay link is promised', () => {
  const text = mail(true);
  assert.ok(!text.includes('Nothing is booked and nothing is charged until you agree to the price.'));
  assert.ok(
    text.includes(
      'Your ride is booked at the price above, and you pay it when you book — the secure pay link follows with your confirmation.',
    ),
  );
  assert.ok(text.includes('Your price: $59'));
});

t('auto-reply, dispatcher flow: the wording is exactly as before', () => {
  const text = mail(false);
  assert.ok(text.includes('Nothing is booked and nothing is charged until you agree to the price.'));
});

/* ── paymentLinkState against a fake Stripe ────────────────────────────── */

// A local stand-in for Stripe: the link id in the path decides the answer.
const server = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url?.includes('plink_dead')) {
    res.end(JSON.stringify({ id: 'plink_dead', active: false, url: 'https://buy.stripe.com/dead' }));
  } else if (req.url?.includes('plink_broken')) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: { message: 'boom' } }));
  } else {
    res.end(JSON.stringify({ id: 'plink_live', active: true, url: 'https://buy.stripe.com/live' }));
  }
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const port = (server.address() as { port: number }).port;
process.env.STRIPE_API_BASE = `http://127.0.0.1:${port}`;
process.env.STRIPE_SECRET_KEY = 'sk_live_fake';

const { paymentLinkState, paymentLinkUrl } = await import('../lib/stripe');

assert.equal(await paymentLinkState('plink_live'), 'active');
console.log('ok - a live link reads active');
n++;
assert.equal(await paymentLinkUrl('plink_live'), 'https://buy.stripe.com/live');
console.log('ok - a live link still resolves to its URL');
n++;
assert.equal(await paymentLinkState('plink_dead'), 'inactive');
console.log('ok - a deactivated link reads inactive — the only state /pay may heal');
n++;
assert.equal(await paymentLinkUrl('plink_dead'), null);
console.log('ok - a deactivated link resolves to no URL');
n++;
assert.equal(await paymentLinkState('plink_broken'), 'unknown');
console.log('ok - a failed lookup reads unknown, never inactive — no blind second link');
n++;

server.close();
console.log(`\n${n} tests passed`);
