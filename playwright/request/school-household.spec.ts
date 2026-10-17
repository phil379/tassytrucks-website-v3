import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  HOUSEHOLD_CONFIRMATION_BODY,
  HOUSEHOLD_CONFIRMATION_TITLE,
  HOUSEHOLD_PROMPT_BODY,
  HOUSEHOLD_PROMPT_TITLE,
  HOUSEHOLD_REQUEST_STATUS,
  NONSTANDARD_REASONS,
  classifyHousehold,
  householdRequestHref,
  householdRequestSchema,
  reasonsFromQuery,
} from '@/lib/school-household';
import { SCHOOL_PLANS, SCHOOL_POLICIES } from '@/lib/school-plans';

/**
 * Tassy Scholar -- the household gate and the Custom Household Request.
 *
 * What these specs pin down, in order:
 *   1. Anything beyond one child / one school / one address / a standard
 *      schedule leaves the standard booking for the custom request.
 *   2. The custom request stores a lead with status pending_review and nothing
 *      else: no student, standing order, trip, Stripe object or charge.
 *   3. The standard one-child flow is untouched.
 *   4. The retired claims (sibling discount, "same trusted driver", "locked
 *      schedule", fingerprinting, in-vehicle recording) do not appear on any
 *      Scholar page.
 *
 * The DB-backed specs need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Run them
 * against playwright/support/stub-supabase.mjs, not production.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);
const h = () => ({ apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` });

const TEST_DOMAIN = 'pw-household.invalid';
const uniqueEmail = (tag: string) => `pw-hh-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_DOMAIN}`;

function request(over: Record<string, unknown> = {}) {
  return {
    guardian_name: 'Dana Reed',
    email: uniqueEmail('api'),
    phone: '704-555-0188',
    home_address: '1200 Elizabeth Ave, Charlotte NC',
    child_count: 2,
    children: [
      { school_name: 'Elizabeth Traditional', grade_or_age: '3rd' },
      { school_name: 'Myers Park High', grade_or_age: '9th' },
    ],
    direction: 'round_trip',
    desired_start: '2026-11-02',
    schedule_notes: 'Elizabeth starts 8:00, dismisses 2:45. Myers Park starts 7:30, dismisses 3:15.',
    friday_differs: false,
    friday_schedule: null,
    extra_notes: null,
    reasons: ['multiple_children', 'multiple_schools'],
    plan_interest: 'full-year',
    consent_contact: true,
    hp_token: '',
    elapsedMs: 20_000,
    ...over,
  };
}

async function rows(api: import('@playwright/test').APIRequestContext, table: string) {
  const res = await api.get(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: h() });
  return (await res.json()) as Record<string, unknown>[];
}

/* ── unit: the decision itself ────────────────────────────────────────────── */

test('every nonstandard reason sends the family to the custom request', () => {
  for (const r of NONSTANDARD_REASONS) {
    expect(classifyHousehold([r.key]).path, r.key).toBe('custom');
  }
  expect(classifyHousehold(['multiple_children', 'multiple_schools']).path).toBe('custom');
});

test('no reasons is the standard path; junk is ignored, never promoted', () => {
  expect(classifyHousehold([]).path).toBe('standard');
  expect(classifyHousehold(undefined).path).toBe('standard');
  expect(classifyHousehold('multiple_children').path, 'a string is not a list').toBe('standard');
  expect(classifyHousehold(['made_up']).path, 'unknown values are dropped').toBe('standard');
  expect(classifyHousehold([42, null, {}]).path).toBe('standard');
});

test('the custom-request link carries reasons and plan, and round-trips', () => {
  const href = householdRequestHref(['multiple_children', 'different_days', 'bogus'], 'weekly');
  expect(href).toBe('/school/household-request?reasons=multiple_children%2Cdifferent_days&plan=weekly');
  const q = new URL(href, 'http://x').searchParams.get('reasons') ?? undefined;
  expect(reasonsFromQuery(q)).toEqual(['multiple_children', 'different_days']);
  expect(householdRequestHref([], null)).toBe('/school/household-request');
});

test('the request schema enforces contact info, address, child count, school data and direction', () => {
  const ok = householdRequestSchema.safeParse(request());
  expect(ok.success).toBe(true);

  const bad = (over: Record<string, unknown>) => householdRequestSchema.safeParse(request(over));
  expect(bad({ guardian_name: '' }).success, 'name').toBe(false);
  expect(bad({ email: 'not-an-email' }).success, 'email').toBe(false);
  expect(bad({ phone: '123' }).success, 'phone').toBe(false);
  expect(bad({ home_address: '' }).success, 'address').toBe(false);
  expect(bad({ child_count: 0 }).success, 'child count 0').toBe(false);
  expect(bad({ child_count: 9 }).success, 'child count 9').toBe(false);
  expect(bad({ child_count: 3 }).success, 'count must match the child rows').toBe(false);
  expect(
    bad({ children: [{ school_name: '', grade_or_age: '3rd' }, { school_name: 'X', grade_or_age: '1st' }] }).success,
    'school name',
  ).toBe(false);
  expect(
    bad({ children: [{ school_name: 'X', grade_or_age: '' }, { school_name: 'Y', grade_or_age: '1st' }] }).success,
    'grade',
  ).toBe(false);
  expect(bad({ direction: 'sideways' }).success, 'direction').toBe(false);
  expect(bad({ desired_start: 'soon' }).success, 'start date').toBe(false);
  expect(bad({ friday_differs: true, friday_schedule: '' }).success, 'friday detail').toBe(false);
  expect(bad({ consent_contact: false }).success, 'consent').toBe(false);
});

/* ── the gate (UI) ────────────────────────────────────────────────────────── */

async function watchBookingTraffic(page: Page) {
  const hits: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/\/api\/(school-booking|stripe|trip-request)|checkout|stripe\.com/i.test(u)) hits.push(`${r.method()} ${u}`);
  });
  return hits;
}

for (const plan of SCHOOL_PLANS) {
  test(`gate on ${plan.slug}: two children routes to the custom request, not to booking`, async ({ page }) => {
    const hits = await watchBookingTraffic(page);
    await page.goto(`/school/book/${plan.slug}`);
    await expect(page.getByTestId('school-eligibility-gate')).toBeVisible();

    await page.getByLabel('More than one child needs transportation').check();
    await expect(page.getByTestId('school-gate-continue')).toHaveText(/custom request/i);
    await page.getByTestId('school-gate-continue').click();

    await expect(page).toHaveURL(/\/school\/household-request\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('reasons')).toContain('multiple_children');
    expect(url.searchParams.get('plan')).toBe(plan.slug);
    // The booking wizard never mounted and nothing touched booking or Stripe.
    await expect(page.getByTestId('household-form')).toBeVisible();
    expect(hits, 'no booking, trip, Stripe or checkout request').toEqual([]);
  });
}

test('gate: more than one school routes to the custom request', async ({ page }) => {
  const hits = await watchBookingTraffic(page);
  await page.goto('/school/book/full-year');
  await page.getByLabel('My children attend more than one school').check();
  await page.getByTestId('school-gate-continue').click();
  await expect(page).toHaveURL(/reasons=multiple_schools/);
  await expect(page.getByTestId('household-form')).toBeVisible();
  expect(hits).toEqual([]);
});

test('gate: each other nonstandard answer also leaves the standard booking', async ({ page }) => {
  for (const r of NONSTANDARD_REASONS) {
    await page.goto('/school/book/full-year');
    await page.getByLabel(r.label, { exact: true }).check();
    await page.getByTestId('school-gate-continue').click();
    await expect(page, r.key).toHaveURL(new RegExp(`reasons=${r.key}`));
  }
});

test('gate: the standard one-child household still reaches the existing wizard', async ({ page }) => {
  await page.goto('/school/book/full-year');
  await expect(page.getByTestId('school-gate-continue')).toHaveText(/start booking/i);
  await page.getByTestId('school-gate-continue').click();
  await expect(page).toHaveURL(/\/school\/book\/full-year$/);
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
  await expect(page.locator('#parentFirst')).toBeVisible();
});

/* ── the custom request page (UI) ─────────────────────────────────────────── */

test('request page: a single child sees one short row; more children add rows', async ({ page }) => {
  await page.goto('/school/household-request');
  await expect(page.getByTestId('household-child-1')).toBeVisible();
  await expect(page.getByTestId('household-child-2')).toHaveCount(0);
  await expect(page.getByLabel('Fridays (or another day) are different')).not.toBeChecked();
  await expect(page.getByLabel('What is different?')).toHaveCount(0);

  await page.getByLabel('How many children need transportation?').selectOption('3');
  await expect(page.getByTestId('household-child-3')).toBeVisible();
  await page.getByLabel('Fridays (or another day) are different').check();
  await expect(page.getByLabel('What is different?')).toBeVisible();
});

test('request page: the prompt copy is Phil\'s, with no discount, bundle or sibling wording', async ({ page }) => {
  await page.goto('/school/household-request');
  const text = (await page.locator('#main').innerText()) ?? '';
  expect(text).toContain(HOUSEHOLD_PROMPT_TITLE);
  expect(text).toContain(HOUSEHOLD_PROMPT_BODY);
  expect(text).not.toMatch(/discount|bundle|shared route|sibling|% off|\$\d/i);
});

async function fillRequest(page: Page, { children = 2 } = {}) {
  await page.goto('/school/household-request?reasons=multiple_children,multiple_schools&plan=full-year');
  await page.locator('#hh-name').fill('Dana Reed');
  await page.locator('#hh-email').fill(uniqueEmail('ui'));
  await page.locator('#hh-phone').fill('704-555-0188');
  await page.locator('#hh-home').fill('1200 Elizabeth Ave, Charlotte NC');
  await page.getByLabel('How many children need transportation?').selectOption(String(children));
  for (let i = 0; i < children; i++) {
    await page.locator(`#hh-school-${i}`).fill(i === 0 ? 'Elizabeth Traditional' : 'Myers Park High');
    await page.locator(`#hh-grade-${i}`).fill(i === 0 ? '3rd' : '9th');
  }
  await page.locator('#hh-start').fill('2026-11-02');
  await page.locator('#hh-sched').fill('Different start and dismissal times at each school.');
  await page.locator('#hh-consent').check();
  // The form refuses anything faster than a person could type.
  await page.waitForTimeout(5200);
}

test('request page: a valid submit saves a pending_review lead and promises nothing', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (use the stub)');
  const hits = await watchBookingTraffic(page);
  await fillRequest(page);
  await page.getByRole('button', { name: 'Send request' }).click();

  const box = page.getByTestId('household-confirmation');
  await expect(box).toBeVisible();
  await expect(box).toContainText(HOUSEHOLD_CONFIRMATION_TITLE);
  await expect(box).toContainText(HOUSEHOLD_CONFIRMATION_BODY);
  const shown = await box.innerText();
  expect(shown, 'no price, driver, route, availability or start date is promised').not.toMatch(
    /\$\d|driver|route|reserved|confirmed|you are booked|start date/i,
  );

  // Only the household endpoint was called: nothing booked, charged or subscribed.
  expect(hits, 'no booking, trip, Stripe or checkout request').toEqual([]);

  const api = await playwright.request.newContext();
  const saved = (await rows(api, 'scholar_household_requests')).filter((r) => String(r.email).endsWith(`@${TEST_DOMAIN}`));
  expect(saved.length).toBe(1);
  expect(saved[0].status).toBe(HOUSEHOLD_REQUEST_STATUS);
  expect(saved[0].child_count).toBe(2);
  expect(saved[0].consent_contact).toBe(true);
  await api.dispose();
});

test('request page: a null-id reply (the bot filter) is shown as a failure, never as success', async ({ page }) => {
  await page.route('**/api/school-household-request', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: null, stored: false }) }),
  );
  await fillRequest(page);
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /could not save/i })).toBeVisible();
  await expect(page.getByTestId('household-confirmation')).toHaveCount(0);
});

test('request page: a missing consent box is refused with a message, nothing is sent as success', async ({ page }) => {
  await fillRequest(page);
  await page.locator('#hh-consent').uncheck();
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText(/confirm we may contact you/i)).toBeVisible();
  await expect(page.getByTestId('household-confirmation')).toHaveCount(0);
});

/* ── the request API ──────────────────────────────────────────────────────── */

test('API: a valid request is stored as pending_review and creates nothing else', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (use the stub)');
  const api = await playwright.request.newContext();
  const before = {
    students: (await rows(api, 'students')).length,
    standing_orders: (await rows(api, 'standing_orders')).length,
    trip_requests: (await rows(api, 'trip_requests')).length,
  };

  const body = request();
  const res = await api.post('/api/school-household-request', { data: body });
  expect(res.status(), await res.text()).toBe(200);
  const json = await res.json();
  expect(json.ok).toBe(true);
  expect(typeof json.id).toBe('string');
  expect(json.status).toBe('pending_review');
  // The response says nothing about price, driver, route or start date.
  expect(Object.keys(json).sort()).toEqual(['id', 'ok', 'status']);

  const saved = (await rows(api, 'scholar_household_requests')).find((r) => r.id === json.id)!;
  expect(saved.status).toBe('pending_review');
  expect(saved.guardian_name).toBe('Dana Reed');
  expect(saved.children).toEqual(body.children);
  expect(saved.reasons).toEqual(['multiple_children', 'multiple_schools']);

  const after = {
    students: (await rows(api, 'students')).length,
    standing_orders: (await rows(api, 'standing_orders')).length,
    trip_requests: (await rows(api, 'trip_requests')).length,
  };
  expect(after, 'no student, standing order or trip may be created').toEqual(before);
  await api.dispose();
});

test('API: invalid requests are refused with 400 and nothing is stored', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (use the stub)');
  const api = await playwright.request.newContext();
  const count = async () => (await rows(api, 'scholar_household_requests')).length;
  const start = await count();

  for (const [name, over] of Object.entries({
    'no email': { email: '' },
    'no phone': { phone: '' },
    'no address': { home_address: '' },
    'no child count': { child_count: 0 },
    'count/rows mismatch': { child_count: 4 },
    'no school': { children: [{ school_name: '', grade_or_age: '3rd' }, { school_name: 'X', grade_or_age: '4th' }] },
    'bad direction': { direction: 'none' },
    'no consent': { consent_contact: false },
  })) {
    const res = await api.post('/api/school-household-request', { data: request(over) });
    expect(res.status(), name).toBe(400);
    expect((await res.json()).ok, name).toBe(false);
  }
  expect(await count(), 'nothing stored by any refused request').toBe(start);
  await api.dispose();
});

test('API: bot guards answer 200 with a null id and store nothing', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (use the stub)');
  const api = await playwright.request.newContext();
  const start = (await rows(api, 'scholar_household_requests')).length;
  const trap = await api.post('/api/school-household-request', { data: request({ hp_token: 'bot' }) });
  expect((await trap.json()).id).toBeNull();
  const fast = await api.post('/api/school-household-request', { data: request({ elapsedMs: 800 }) });
  expect((await fast.json()).id).toBeNull();
  expect((await rows(api, 'scholar_household_requests')).length).toBe(start);
  await api.dispose();
});

test('API: a failed insert is a failure, never a success', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (use the stub)');
  const api = await playwright.request.newContext();
  const res = await api.post('/api/school-household-request', { data: request({ extra_notes: 'bad\u0000byte' }) });
  expect(res.status()).toBeGreaterThanOrEqual(400);
  const json = await res.json();
  expect(json.ok).toBe(false);
  expect(json.id ?? null).toBeNull();
  await api.dispose();
});

/* ── the booking API refuses nonstandard households ───────────────────────── */

function bookingPayload(over: Record<string, unknown> = {}) {
  const ts = new Date().toISOString();
  return {
    plan: 'full-year',
    parent: {
      first_name: 'Dana',
      last_name: 'Reed',
      email: uniqueEmail('book'),
      phone: '704-555-0188',
      home_address: '1200 Elizabeth Ave, Charlotte NC',
    },
    child: {
      first_name: 'Sam',
      last_name: 'Reed',
      grade: '3rd',
      school_name: 'Elizabeth Traditional',
      school_address: '1200 Lamar Ave, Charlotte NC',
      emergency_contact_name: 'Alex Reed',
      emergency_contact_phone: '704-555-0199',
    },
    schedule: { am: '6:45 AM', pm: '3:15 PM', days: [] },
    policies: Object.fromEntries(SCHOOL_POLICIES.map((p) => [p.key, { accepted: true, ts }])),
    starts_on: '2026-08-24',
    standard_household_confirmed: true,
    hp_token: '',
    elapsedMs: 9000,
    ...over,
  };
}

test('booking API: a request that names a nonstandard reason is refused (409) and stores nothing', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (use the stub)');
  const api = await playwright.request.newContext();
  const students = (await rows(api, 'students')).length;
  const trips = (await rows(api, 'trip_requests')).length;

  const res = await api.post('/api/school-booking', {
    data: bookingPayload({ household_reasons: ['multiple_children'] }),
  });
  expect(res.status()).toBe(409);
  const json = await res.json();
  expect(json.ok).toBe(false);
  expect(json.redirect).toContain('/school/household-request?reasons=multiple_children');

  expect((await rows(api, 'students')).length).toBe(students);
  expect((await rows(api, 'trip_requests')).length).toBe(trips);
  await api.dispose();
});

test('booking API: without the household confirmation the booking is refused (400)', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (use the stub)');
  const api = await playwright.request.newContext();
  const students = (await rows(api, 'students')).length;
  const { standard_household_confirmed: _drop, ...without } = bookingPayload();
  void _drop;
  const res = await api.post('/api/school-booking', { data: without });
  expect(res.status()).toBe(400);
  expect((await res.json()).fieldErrors?.standard_household_confirmed).toBeTruthy();
  expect((await rows(api, 'students')).length).toBe(students);
  await api.dispose();
});

/* ── the custom route is structurally incapable of billing ────────────────── */

test('the household route imports no Stripe code and writes no booking table', () => {
  const src = readFileSync(path.join(process.cwd(), 'app/api/school-household-request/route.ts'), 'utf8');
  // Strip comments: the header deliberately names what the route must never do.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  expect(code).not.toMatch(/stripe/i);
  expect(code).not.toMatch(/standing_orders|STANDING_ORDERS|TRIP_REQUESTS_TABLE|'students'|STUDENTS_TABLE/);
  expect(code).not.toMatch(/nextTripNumber|fireNotifications/);
  expect(code).toMatch(/HOUSEHOLD_REQUEST_STATUS/);
});

/* ── retired claims are gone ──────────────────────────────────────────────── */

const RETIRED = [
  /50% off/i,
  /second child/i,
  /sibling/i,
  /same trusted driver/i,
  /same friendly/i,
  /schedule locked/i,
  /locked (monthly )?schedule/i,
  /locked, predictable/i,
  /fingerprint/i,
  /in-vehicle recording/i,
  /recorded for safety/i,
  /every trip is recorded/i,
  /video and audio/i,
];

for (const route of ['/', '/school', '/school/book', '/school/book/full-year', '/school/household-request', '/pricing']) {
  test(`no retired claim appears on ${route}`, async ({ page }) => {
    await page.goto(route);
    const text = await page.locator('body').innerText();
    for (const re of RETIRED) {
      expect(text, `${route} still says ${re}`).not.toMatch(re);
    }
  });
}

test('the policy list the parent accepts no longer carries the retired claims', () => {
  const all = SCHOOL_POLICIES.map((p) => `${p.title} ${p.body}`).join('\n');
  for (const re of RETIRED) expect(all, String(re)).not.toMatch(re);
  expect(all).toContain('We aim to provide consistent driver assignments whenever operationally possible.');
  expect(all).toContain('Safety practices and vehicle procedures are designed to support a secure ride experience.');
});
