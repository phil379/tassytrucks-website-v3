import { test, expect, type APIRequestContext } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';

/**
 * The Stripe webhook: record the payment, THEN tell somebody.
 *
 * Before this, a paid session flipped payment_status and paid_at and told
 * nobody — the money arrived and the trip sat in the queue looking unpaid.
 *
 * The test that matters most is the last one. notifyOperatorPaid must NEVER
 * throw, because a non-2xx here makes Stripe retry a payment we have already
 * stored. A dead push service turning a recorded payment into a replayed one is
 * a worse bug than a missing notification, and it is the kind that only shows
 * up when ntfy is down at 2am.
 */

// Serial: every spec here shares the loopback capture port, and "was the alert
// sent exactly once" is not answerable if two specs are pushing at it.
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);
const h = () => ({ apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` });

/**
 * Must match the SECOND webServer in playwright.config.ts.
 *
 * These specs deliberately do NOT use the default 3941 server: it runs the real
 * NTFY_TOPIC, and the PII spec asserts against messages actually published
 * there. Redirecting that sink globally turns that test into one that polls an
 * empty topic and passes for the wrong reason.
 */
const WEBHOOK_ORIGIN = 'http://127.0.0.1:3943';
const SECRET = 'whsec_pw_test_secret';
const CAPTURE_PORT = 3942;
const TEST_MARKER = 'pw-stripe';

/** The ntfy sink, as a server we can start, count and kill. */
let capture: Server | null = null;
let pushes: { title: string | null; body: string }[] = [];

async function startCapture() {
  pushes = [];
  await new Promise<void>((resolve) => {
    capture = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        pushes.push({ title: req.headers['title'] as string | null, body });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      });
    });
    capture.listen(CAPTURE_PORT, '127.0.0.1', resolve);
  });
}

async function stopCapture() {
  if (!capture) return;
  await new Promise<void>((resolve) => capture!.close(() => resolve()));
  capture = null;
}

/** Sign exactly as Stripe does: HMAC over `${timestamp}.${rawBody}`. */
function sign(rawBody: string, secret = SECRET, atSeconds = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac('sha256', secret).update(`${atSeconds}.${rawBody}`, 'utf8').digest('hex');
  return `t=${atSeconds},v1=${v1}`;
}

function paidSession(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        payment_status: 'paid',
        amount_total: 12500,
        ...over,
      },
    },
  });
}

async function seedTrip(api: APIRequestContext, linkId: string): Promise<string> {
  const res = await api.post(`${SUPABASE_URL}/rest/v1/trip_requests`, {
    headers: { ...h(), Prefer: 'return=representation', 'Content-Type': 'application/json' },
    data: {
      service_line: 'care',
      status: 'confirmed',
      contact_name: `${TEST_MARKER} Payer`,
      contact_phone: '704-555-0100',
      pickup_address: '1200 Elizabeth Ave, Charlotte NC',
      dropoff_address: '1000 Blythe Blvd, Charlotte NC',
      requested_at: new Date(Date.now() + 86_400_000).toISOString(),
      payment_status: 'unpaid',
      stripe_payment_link_id: linkId,
      is_test_data: true,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json())[0].id;
}

async function readTrip(api: APIRequestContext, id: string) {
  const res = await api.get(
    `${SUPABASE_URL}/rest/v1/trip_requests?select=id,payment_status,paid_at,status&id=eq.${id}`,
    { headers: h() },
  );
  return (await res.json())[0];
}

test.beforeEach(async () => {
  await startCapture();
});

test.afterEach(async () => {
  await stopCapture();
});

test.afterAll(async ({ playwright }) => {
  if (!dbConfigured) return;
  const api = await playwright.request.newContext();
  await api.delete(`${SUPABASE_URL}/rest/v1/trip_requests?contact_name=like.${TEST_MARKER}*`, {
    headers: h(),
  });
  await api.dispose();
});

/* ── the signature gate ───────────────────────────────────────────────────── */

test('a bad signature is 400 before anything is read', async ({ request }) => {
  const body = paidSession({ metadata: { trip_request_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' } });

  for (const [label, header] of [
    ['no header', undefined],
    ['garbage', 't=1,v1=deadbeef'],
    ['wrong secret', sign(body, 'whsec_not_the_secret')],
    ['stale timestamp', sign(body, SECRET, Math.floor(Date.now() / 1000) - 60 * 60)],
  ] as const) {
    const res = await request.post(`${WEBHOOK_ORIGIN}/api/stripe/webhook`, {
      headers: header ? { 'stripe-signature': header, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
      data: body,
    });
    expect(res.status(), label).toBe(400);
  }
  // Failing open on a payment path would let a stranger mark every trip paid.
  expect(pushes.length, 'nothing may be sent for an unverified body').toBe(0);
});

/* ── the happy path ───────────────────────────────────────────────────────── */

test('a paid session records the payment and alerts exactly once', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const linkId = `plink_pw_${Date.now()}`;
  const id = await seedTrip(api, linkId);

  const body = paidSession({ metadata: { trip_request_id: id } });
  const res = await request.post(`${WEBHOOK_ORIGIN}/api/stripe/webhook`, {
    headers: { 'stripe-signature': sign(body), 'Content-Type': 'application/json' },
    data: body,
  });

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, updated: 1 });

  const row = await readTrip(api, id);
  expect(row.payment_status).toBe('paid');
  expect(row.paid_at, 'Stripe told us when').toBeTruthy();
  // payment_status and status are tracked separately on purpose.
  expect(row.status, 'the webhook must not touch dispatch status').toBe('confirmed');

  expect(pushes.length, 'the operator is told once').toBe(1);
  expect(pushes[0].title).toContain('PAID');
  // PII rule: a ref, and nothing else.
  expect(pushes[0].body).toMatch(new RegExp(`Ref ${id.slice(0, 8)}`));
  expect(pushes[0].body).not.toContain('Payer');
  expect(pushes[0].body).not.toContain('Elizabeth Ave');
  expect(pushes[0].body).not.toMatch(/125|12500/);

  await api.dispose();
});

/* ── the replay ───────────────────────────────────────────────────────────── */

test('a replayed session changes nothing and does not alert again', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const linkId = `plink_pw_replay_${Date.now()}`;
  const id = await seedTrip(api, linkId);

  const first = paidSession({ metadata: { trip_request_id: id } });
  await request.post(`${WEBHOOK_ORIGIN}/api/stripe/webhook`, {
    headers: { 'stripe-signature': sign(first), 'Content-Type': 'application/json' },
    data: first,
  });
  const afterFirst = await readTrip(api, id);
  expect(afterFirst.payment_status).toBe('paid');
  expect(pushes.length).toBe(1);

  // Stripe retries on its own schedule. The retry must not re-stamp paid_at
  // and must not page the operator a second time.
  const replay = paidSession({ metadata: { trip_request_id: id } });
  const res = await request.post(`${WEBHOOK_ORIGIN}/api/stripe/webhook`, {
    headers: { 'stripe-signature': sign(replay), 'Content-Type': 'application/json' },
    data: replay,
  });

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, ignored: 'already paid' });

  const afterReplay = await readTrip(api, id);
  expect(afterReplay.paid_at, 'paid_at is when Stripe FIRST told us').toBe(afterFirst.paid_at);
  expect(pushes.length, 'one payment, one alert').toBe(1);

  await api.dispose();
});

/* ── the unmatched session ────────────────────────────────────────────────── */

test('a session matching no request is acknowledged, not retried', async ({ request }) => {
  const body = paidSession({ metadata: { trip_request_id: '00000000-0000-0000-0000-000000000000' } });
  const res = await request.post(`${WEBHOOK_ORIGIN}/api/stripe/webhook`, {
    headers: { 'stripe-signature': sign(body), 'Content-Type': 'application/json' },
    data: body,
  });

  // 200, because a payment for a deleted request should not be retried for
  // three days — but it is logged, because it is not normal.
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, ignored: 'no matching request' });
  expect(pushes.length, 'nothing was recorded, so nobody is told').toBe(0);
});

/* ── THE POINT OF THE CHANGE ──────────────────────────────────────────────── */

test('a dead push sink does not undo a recorded payment', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const linkId = `plink_pw_deadsink_${Date.now()}`;
  const id = await seedTrip(api, linkId);

  // Kill the sink. NTFY_BASE_URL now points at a refused port — the same shape
  // as ntfy.sh being down.
  await stopCapture();

  const body = paidSession({ metadata: { trip_request_id: id } });
  const res = await request.post(`${WEBHOOK_ORIGIN}/api/stripe/webhook`, {
    headers: { 'stripe-signature': sign(body), 'Content-Type': 'application/json' },
    data: body,
  });

  /**
   * 200, not 500. A non-2xx makes Stripe retry, and retrying a payment we have
   * already stored is worse than losing one notification. This is the whole
   * reason notifyOperatorPaid swallows where notifyOperatorUrgent throws.
   */
  expect(res.status(), 'a dead sink must not make Stripe retry').toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, updated: 1 });

  const row = await readTrip(api, id);
  expect(row.payment_status, 'the money is still recorded').toBe('paid');
  expect(row.paid_at).toBeTruthy();

  await api.dispose();
});
