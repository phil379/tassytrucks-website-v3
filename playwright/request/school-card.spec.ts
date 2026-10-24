import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { SCHOOL_POLICIES } from '@/lib/school-plans';

/**
 * Tassy Scholar — saving a card, and the parent text opt-in.
 *
 * The promise under test: SIGNING UP NEVER CHARGES ANYONE. A Full Year parent is sent to
 * Stripe's hosted page in SETUP mode, a card is saved, and nothing moves money. The
 * assertions that matter most look at what the app asked Stripe to do and prove it never
 * created a payment, a charge, an invoice or a subscription.
 *
 * Runs against the card rig on port 3945 (a fake Stripe key and STRIPE_API_BASE pointing at
 * playwright/support/stub-stripe.mjs on 3944, started below). Nothing here can reach the real
 * Stripe. Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, which can be the local
 * stub-supabase.
 */

test.describe.configure({ mode: 'serial' });

const ORIGIN = 'http://127.0.0.1:3945';
const STRIPE = 'http://127.0.0.1:3944';
const SECRET = 'whsec_pw_test_secret';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);
const h = () => ({ apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` });
const TEST_DOMAIN = 'pw-card.invalid';

test.use({ baseURL: ORIGIN });

let stripe: ChildProcess | null = null;

test.beforeAll(async () => {
  stripe = spawn('node', ['playwright/support/stub-stripe.mjs', '3944'], { stdio: 'ignore' });
  // Wait until it answers.
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${STRIPE}/__log`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('stub stripe did not start');
});

test.afterAll(async ({ playwright }) => {
  stripe?.kill();
  if (!dbConfigured) return;
  const api = await playwright.request.newContext();
  await api.delete(`${SUPABASE_URL}/rest/v1/students?parent_email=like.*@${TEST_DOMAIN}`, { headers: h() });
  await api.delete(`${SUPABASE_URL}/rest/v1/trip_requests?contact_email=like.*@${TEST_DOMAIN}`, { headers: h() });
  await api.dispose();
});

test.beforeEach(async () => {
  await fetch(`${STRIPE}/__reset`, { method: 'POST' });
});

type StripeCall = { method: string; path: string; fields: Record<string, string> };
async function stripeLog(): Promise<StripeCall[]> {
  return (await fetch(`${STRIPE}/__log`)).json();
}

/** Anything that could move money. The list of calls to these must always be empty. */
const MONEY_PATHS = /\/v1\/(payment_intents|charges|invoices|subscriptions|payment_links|prices|refunds)/;

function email(tag: string) {
  return `pw-card-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_DOMAIN}`;
}

function payload(over: Record<string, unknown> = {}, parentOver: Record<string, unknown> = {}) {
  const ts = new Date().toISOString();
  return {
    plan: 'full-year',
    parent: {
      first_name: 'Dana',
      last_name: 'Reed',
      email: email('api'),
      phone: '704-555-0188',
      home_address: '1200 Elizabeth Ave, Charlotte NC',
      ...parentOver,
    },
    child: {
      first_name: 'Sam',
      last_name: 'Reed',
      grade: '3rd',
      school_name: 'Elizabeth Traditional',
      school_address: '1200 Lamar Ave, Charlotte NC',
      emergency_contact_name: 'Alex Reed',
      emergency_contact_phone: '704-555-0199',
      safety_note: null,
    },
    schedule: { am: '6:45 AM', pm: '3:15 PM', days: [] },
    policies: Object.fromEntries(SCHOOL_POLICIES.map((p) => [p.key, { accepted: true, ts }])),
    guardian: { accepted: true, ts },
    starts_on: '2026-08-24',
    standard_household_confirmed: true,
    hp_token: '',
    elapsedMs: 9000,
    ...over,
  };
}

async function book(api: APIRequestContext, over: Record<string, unknown> = {}, parentOver: Record<string, unknown> = {}) {
  const res = await api.post('/api/school-booking', { data: payload(over, parentOver) });
  expect(res.status(), await res.text()).toBe(200);
  return res.json();
}

async function orderRow(api: APIRequestContext, id: string) {
  const r = await api.get(`${SUPABASE_URL}/rest/v1/standing_orders?select=*&id=eq.${id}`, { headers: h() });
  return (await r.json())[0];
}

function sessionIdFrom(url: string) {
  return url.split('/').pop()!;
}

function sign(rawBody: string, atSeconds = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac('sha256', SECRET).update(`${atSeconds}.${rawBody}`, 'utf8').digest('hex');
  return `t=${atSeconds},v1=${v1}`;
}

/* ── booking → card page ──────────────────────────────────────────────────── */

test('Full Year hands the parent a Stripe SETUP page and never asks for a payment', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  const json = await book(api);

  expect(json.cardRequired).toBe(true);
  expect(json.cardSetupUrl).toMatch(/^https:\/\/checkout\.stripe\.test\/c\/setup\/cs_test_stub/);

  const calls = await stripeLog();
  const session = calls.find((c) => c.method === 'POST' && c.path === '/v1/checkout/sessions');
  expect(session, 'a checkout session was created').toBeTruthy();
  expect(session!.fields.mode, 'setup mode saves a card and charges nothing').toBe('setup');
  expect(session!.fields['metadata[purpose]']).toBe('scholar_card_on_file');
  expect(session!.fields['metadata[standing_order_id]']).toBe(json.standingOrderId);
  expect(session!.fields['metadata[business]']).toBe('tassy-transport');
  expect(calls.filter((c) => MONEY_PATHS.test(c.path)), 'nothing that can move money was called').toEqual([]);

  const order = await orderRow(api, json.standingOrderId);
  expect(order.billing_status).toBe('card_pending');
  expect(order.stripe_customer_id).toMatch(/^cus_stub_/);
  expect(order.active, 'the booking itself is unchanged').toBe(true);
  await api.dispose();
});

test('Weekly and After-School have no card step and never touch Stripe', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  const weekly = await book(api, {
    plan: 'weekly',
    schedule: { am: '6:45 AM', pm: '3:15 PM', days: ['Tue', 'Wed', 'Thu'] },
  });
  expect(weekly.cardRequired).toBe(false);
  expect(weekly.cardSetupUrl).toBeNull();
  expect(await stripeLog(), 'no Stripe calls at all for this plan').toEqual([]);
  await api.dispose();
});

test('a Stripe outage never loses the booking, and the parent is told the truth', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  await fetch(`${STRIPE}/__fail?n=5`, { method: 'POST' });
  const json = await book(api);

  expect(json.ok).toBe(true);
  expect(json.id, 'the booking is stored').toBeTruthy();
  expect(json.cardRequired).toBe(true);
  expect(json.cardSetupUrl, 'no card page, and no pretending there is one').toBeNull();
  const order = await orderRow(api, json.standingOrderId);
  expect(order.active).toBe(true);
  await api.dispose();
});

/* ── coming back from Stripe ──────────────────────────────────────────────── */

test('the return page records a saved card and says nothing was charged', async ({ playwright, page }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  const json = await book(api);
  const sessionId = sessionIdFrom(json.cardSetupUrl);
  await fetch(`${STRIPE}/__complete/${sessionId}`, { method: 'POST' });

  await page.goto(`/school/book/card-saved?session_id=${sessionId}`);
  await expect(page.getByTestId('card-saved-page')).toHaveAttribute('data-state', 'saved');
  await expect(page.getByRole('heading', { name: 'Your card is saved.' })).toBeVisible();
  await expect(page.getByText('Visa ending 4242')).toBeVisible();
  await expect(page.getByText('Nothing has been charged.')).toBeVisible();

  const order = await orderRow(api, json.standingOrderId);
  expect(order.billing_status).toBe('card_saved');
  expect(order.stripe_payment_method_id).toMatch(/^pm_stub_/);
  expect(order.card_brand).toBe('visa');
  expect(order.card_last4).toBe('4242');
  expect(order.card_saved_at).toBeTruthy();
  expect((await stripeLog()).filter((c) => MONEY_PATHS.test(c.path))).toEqual([]);
  await api.dispose();
});

test('a session that was never completed saves no card', async ({ playwright, page }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  const json = await book(api);
  const sessionId = sessionIdFrom(json.cardSetupUrl); // never completed

  await page.goto(`/school/book/card-saved?session_id=${sessionId}`);
  await expect(page.getByTestId('card-saved-page')).toHaveAttribute('data-state', 'unconfirmed');
  const order = await orderRow(api, json.standingOrderId);
  expect(order.billing_status).toBe('card_pending');
  expect(order.stripe_payment_method_id).toBeUndefined();
  await api.dispose();
});

test('a made-up session id is refused without calling Stripe or writing anything', async ({ page }) => {
  await page.goto('/school/book/card-saved?session_id=not-a-session');
  await expect(page.getByTestId('card-saved-page')).toHaveAttribute('data-state', 'unconfirmed');
  expect(await stripeLog()).toEqual([]);
});

test('the webhook records a setup session once, and never downgrades an active plan', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  const json = await book(api);
  const sessionId = sessionIdFrom(json.cardSetupUrl);
  await fetch(`${STRIPE}/__complete/${sessionId}`, { method: 'POST' });

  const body = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: sessionId, mode: 'setup', payment_status: 'no_payment_required', metadata: { purpose: 'scholar_card_on_file' } } },
  });
  const post = () => api.post('/api/stripe/webhook', { data: body, headers: { 'stripe-signature': sign(body), 'content-type': 'application/json' } });

  const first = await post();
  expect(first.status()).toBe(200);
  expect((await first.json()).card).toBe('recorded');
  expect((await orderRow(api, json.standingOrderId)).billing_status).toBe('card_saved');

  // Phil approves in TassyOps: the plan is active. A retried or late webhook must not undo it.
  await api.patch(`${SUPABASE_URL}/rest/v1/standing_orders?id=eq.${json.standingOrderId}`, {
    headers: { ...h(), 'content-type': 'application/json' },
    data: { billing_status: 'active' },
  });
  const again = await post();
  expect(again.status()).toBe(200);
  expect((await orderRow(api, json.standingOrderId)).billing_status, 'active stays active').toBe('active');
  await api.dispose();
});

test('the webhook ignores a setup session that is not ours and an unsigned request', async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  const other = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_other', mode: 'setup', metadata: { purpose: 'something_else' } } },
  });
  const ok = await api.post('/api/stripe/webhook', { data: other, headers: { 'stripe-signature': sign(other), 'content-type': 'application/json' } });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).ignored).toBe('setup session not ours');

  const unsigned = await api.post('/api/stripe/webhook', { data: other, headers: { 'content-type': 'application/json' } });
  expect(unsigned.status(), 'no signature, no entry').toBe(400);
  await api.dispose();
});

/* ── trying again ─────────────────────────────────────────────────────────── */

test('"Add your card" gives a fresh Stripe page, and a booking with a card is not given another', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });
  const json = await book(api);

  const retry = await api.get(`/api/school-card?o=${json.standingOrderId}`, { maxRedirects: 0 });
  expect(retry.status()).toBe(303);
  expect(retry.headers()['location']).toMatch(/^https:\/\/checkout\.stripe\.test\/c\/setup\//);

  // Once a card is saved, the same link says so instead of opening another page.
  const sessionId = sessionIdFrom(json.cardSetupUrl);
  await fetch(`${STRIPE}/__complete/${sessionId}`, { method: 'POST' });
  const body = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: sessionId, mode: 'setup', metadata: { purpose: 'scholar_card_on_file' } } },
  });
  const hook = await api.post('/api/stripe/webhook', { data: body, headers: { 'stripe-signature': sign(body), 'content-type': 'application/json' } });
  expect(hook.status()).toBe(200);
  expect((await hook.json()).card).toBe('recorded');
  const have = await api.get(`/api/school-card?o=${json.standingOrderId}`, { maxRedirects: 0 });
  expect(have.status()).toBe(303);
  expect(have.headers()['location']).toContain('e=have');

  const junk = await api.get('/api/school-card?o=not-a-uuid', { maxRedirects: 0 });
  expect(junk.status()).toBe(303);
  expect(junk.headers()['location']).toMatch(/\/school$/);
  await api.dispose();
});

/* ── parent text opt-in ───────────────────────────────────────────────────── */

test('the parent text opt-in is stored with its wording version when ticked, and absent when not', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext({ baseURL: ORIGIN });

  const yes = await book(api, {}, { sms_consent: true });
  const ys = (await (await api.get(`${SUPABASE_URL}/rest/v1/students?select=*&id=eq.${yes.studentId}`, { headers: h() })).json())[0];
  expect(ys.parent_sms_consent).toBe(true);
  expect(ys.parent_sms_consent_at).toBeTruthy();
  const yt = (await (await api.get(`${SUPABASE_URL}/rest/v1/trip_requests?select=*&id=eq.${yes.id}`, { headers: h() })).json())[0];
  expect(yt.trip_details.parent_sms_consent_v).toBe('scholar-v1');
  expect(yt.trip_details.parent_sms_consent_phone).toBe('704-555-0188');

  const no = await book(api);
  const ns = (await (await api.get(`${SUPABASE_URL}/rest/v1/students?select=*&id=eq.${no.studentId}`, { headers: h() })).json())[0];
  expect(ns.parent_sms_consent, 'not ticked means not stored as consent').toBeUndefined();
  const nt = (await (await api.get(`${SUPABASE_URL}/rest/v1/trip_requests?select=*&id=eq.${no.id}`, { headers: h() })).json())[0];
  expect(nt.trip_details.parent_sms_consent).toBeUndefined();

  // Ticking the box with no usable phone number is not consent to anything.
  const noPhone = await book(api, {}, { sms_consent: true, phone: '12345678' });
  const nps = (await (await api.get(`${SUPABASE_URL}/rest/v1/students?select=*&id=eq.${noPhone.studentId}`, { headers: h() })).json())[0];
  expect(nps.parent_sms_consent).toBeUndefined();
  await api.dispose();
});

/* ── what the parent sees ─────────────────────────────────────────────────── */

async function walkToConfirm(page: Page, tickSms: boolean) {
  await page.goto('/school/book/full-year');
  await page.getByTestId('school-gate-continue').click();
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();

  const sms = page.getByTestId('parent-sms-consent');
  await expect(sms, 'the text opt-in starts unchecked').not.toBeChecked();
  await expect(page.getByText("Text me updates about my child's rides")).toBeVisible();
  await expect(page.getByText(/Reply STOP to opt out/).first()).toBeVisible();

  await page.locator('#parentFirst').fill('Dana');
  await page.locator('#parentLast').fill('Reed');
  await page.locator('#parentEmail').fill(email('ui'));
  await page.locator('#parentPhone').fill('704-555-0188');
  await page.locator('input[name="home_address"]').fill('1200 Elizabeth Ave, Charlotte NC');
  if (tickSms) await sms.check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.locator('#guardianConfirm').check();
  await page.locator('#childFirst').fill('Sam');
  await page.locator('#childLast').fill('Reed');
  await page.getByRole('combobox', { name: /^School \(required\)$/ }).fill('Elizabeth Traditional');
  await page.locator('input[name="school_address"]').fill('1200 Lamar Ave, Charlotte NC');
  await page.locator('#ecName').fill('Alex Reed');
  await page.locator('#ecPhone').fill('704-555-0199');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: '6:45 AM' }).click();
  await page.getByRole('button', { name: '3:15 PM' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  const boxes = page.locator('input[type="checkbox"]');
  for (let i = 0; i < SCHOOL_POLICIES.length; i++) await boxes.nth(i).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm your plan' })).toBeVisible();
}

test('the confirm screen says the card is saved, not charged, and the button says what it does', async ({ page }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  await walkToConfirm(page, false);
  await expect(page.getByTestId('card-note')).toContainText('Your card is saved, not charged.');
  await expect(page.getByText(/authorize Tassy to charge the card I add once that confirmation is made/)).toBeVisible();
  await expect(page.getByTestId('confirm-commitment')).toHaveText('Confirm and add card');
});

test('confirming sends the browser to Stripe once, and Back cannot resubmit the booking', async ({ page }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  // The fake hosted page lives on a name that does not resolve; answer it locally.
  await page.route('https://checkout.stripe.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub stripe card page</h1>' }),
  );
  let bookings = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/school-booking')) bookings += 1;
  });

  await walkToConfirm(page, true);
  await page.locator('input[type="checkbox"]').check();
  await page.getByTestId('confirm-commitment').click();

  await expect(page.getByRole('heading', { name: 'stub stripe card page' })).toBeVisible({ timeout: 20_000 });
  expect(page.url()).toMatch(/^https:\/\/checkout\.stripe\.test\/c\/setup\//);
  expect(bookings).toBe(1);

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'About you' }), 'the snapshot was cleared, so the wizard restarts').toBeVisible();
  expect(bookings, 'no second booking was sent').toBe(1);
});
