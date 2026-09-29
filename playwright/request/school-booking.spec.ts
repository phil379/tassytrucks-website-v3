import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { FORBIDDEN_CLINICAL_KEYS, SCHOOL_PLANS, SCHOOL_POLICIES, restoreStep, to24h } from '@/lib/school-plans';

/**
 * Tassy Scholar — the wizard ported from TassyOps 2026-09-29.
 *
 * The centre of gravity here is the regression guard: the route this was ported
 * from returned { ok: true } from its catch block on EVERY failure, so a parent
 * finished six steps, accepted seven policies and saw "You're all set." while
 * nothing reached an operational table. Several specs below exist purely so
 * that cannot come back — at the API and at the UI, because the 2026-09-25
 * silent drop was a client that turned a failure into success.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

const TEST_DOMAIN = 'pw-school.invalid';
const h = () => ({ apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` });

function email(tag: string) {
  return `pw-sch-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_DOMAIN}`;
}

/** A complete, valid payload. Individual specs break one thing at a time. */
function payload(over: Record<string, unknown> = {}) {
  const ts = new Date().toISOString();
  return {
    plan: 'full-year',
    parent: {
      first_name: 'Dana',
      last_name: 'Reed',
      email: email('api'),
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
      safety_note: 'Gets anxious in heavy traffic.',
    },
    schedule: { am: '6:45 AM', pm: '3:15 PM', days: [] },
    policies: Object.fromEntries(SCHOOL_POLICIES.map((p) => [p.key, { accepted: true, ts }])),
    starts_on: '2026-08-24',
    hp_token: '',
    elapsedMs: 9000,
    ...over,
  };
}

async function cleanup(api: APIRequestContext) {
  // students cascades to standing_orders via student_id ON DELETE CASCADE.
  await api.delete(`${SUPABASE_URL}/rest/v1/students?parent_email=like.*@${TEST_DOMAIN}`, { headers: h() });
  await api.delete(`${SUPABASE_URL}/rest/v1/trip_requests?contact_email=like.*@${TEST_DOMAIN}`, { headers: h() });
}

test.afterAll(async ({ playwright }) => {
  if (!dbConfigured) return;
  const api = await playwright.request.newContext();
  await cleanup(api);
  await api.dispose();
});

/* ── routing ──────────────────────────────────────────────────────────────── */

test('each of the three plan slugs resolves', async ({ page }) => {
  for (const plan of SCHOOL_PLANS) {
    const res = await page.goto(`/school/book/${plan.slug}`);
    expect(res?.status(), plan.slug).toBe(200);
    await expect(page.getByRole('heading', { name: plan.planLabel })).toBeVisible();
  }
});

test('an unknown slug redirects to the plans, it does not 404', async ({ page }) => {
  await page.goto('/school/book/not-a-real-plan');
  await expect(page).toHaveURL(/\/school\/book$/);
  await expect(page.getByRole('heading', { name: /Daily school transport/i })).toBeVisible();
});

test('a legacy ?plan= link still resolves to the wizard', async ({ page }) => {
  await page.goto('/request?service=scholar&plan=full-year');
  /**
   * Assert the PATH. Next forwards the original query string through a
   * redirect, so the landing URL keeps ?service=scholar&plan=full-year. The
   * wizard ignores both, and keeping them means the referrer still carries the
   * attribution the link was written with — so this is the behaviour to pin,
   * not a bug to paper over.
   */
  await expect(page, 'links already in the wild must not break').toHaveURL(
    /\/school\/book\/full-year(\?|$)/,
  );
  expect(new URL(page.url()).pathname).toBe('/school/book/full-year');
  // And a bare ?service=scholar still reaches the one-off request form.
  await page.goto('/request?service=scholar');
  await expect(page).toHaveURL(/\/request\?service=scholar$/);
});

/* ── the wizard ───────────────────────────────────────────────────────────── */

async function fillStep1(page: Page, addr = '1200 Elizabeth Ave, Charlotte NC') {
  await page.locator('#parentFirst').fill('Dana');
  await page.locator('#parentLast').fill('Reed');
  await page.locator('#parentEmail').fill(email('ui'));
  await page.locator('#parentPhone').fill('704-555-0188');
  await page.locator('input[name="home_address"]').fill(addr);
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function fillStep2(page: Page) {
  await page.locator('#childFirst').fill('Sam');
  await page.locator('#childLast').fill('Reed');
  // The school is a picker now, not a text box. Typed free-hand here on
  // purpose: "can't find your school" has to keep working, and this proves the
  // wizard still completes without a resolved id.
  // Exact name: the wizard's "School address" autocomplete is also a combobox,
  // so /School/i matches two fields.
  await page.getByRole('combobox', { name: /^School \(required\)$/ }).fill('Elizabeth Traditional');
  await page.locator('input[name="school_address"]').fill('1200 Lamar Ave, Charlotte NC');
  await page.locator('#ecName').fill('Alex Reed');
  await page.locator('#ecPhone').fill('704-555-0199');
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function fillStep3FullYear(page: Page) {
  await page.getByRole('button', { name: '6:45 AM' }).click();
  await page.getByRole('button', { name: '3:15 PM' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

test('all seven policies must be accepted before step 5 unlocks', async ({ page }) => {
  await page.goto('/school/book/full-year');
  await fillStep1(page);
  await fillStep2(page);
  await fillStep3FullYear(page);

  await expect(page.getByRole('heading', { name: 'Our standards' })).toBeVisible();
  const boxes = page.locator('input[type="checkbox"]');
  await expect(boxes).toHaveCount(SCHOOL_POLICIES.length);

  const continueBtn = page.getByRole('button', { name: 'Continue' });
  // Six of seven is not enough — the gate is every one of them.
  for (let i = 0; i < SCHOOL_POLICIES.length - 1; i++) {
    await boxes.nth(i).check();
    await expect(continueBtn, `after ${i + 1} of ${SCHOOL_POLICIES.length}`).toBeDisabled();
  }
  await boxes.nth(SCHOOL_POLICIES.length - 1).check();
  await expect(continueBtn).toBeEnabled();
});

test('sessionStorage resumes steps 1-5 and never step 6', async ({ page }) => {
  await page.goto('/school/book/full-year');
  await fillStep1(page);
  await fillStep2(page);
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();

  // A refresh mid-wizard returns to step 3, not step 1.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();

  // Step 6 is post-submit and must never reopen.
  await page.evaluate(() => {
    const key = 'tassy-school-setup:full_year';
    const raw = window.sessionStorage.getItem(key);
    const snap = raw ? JSON.parse(raw) : {};
    window.sessionStorage.setItem(key, JSON.stringify({ ...snap, step: 6 }));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
  await expect(page.getByText(/You.re all set/i)).toHaveCount(0);
});

test('restoreStep never returns a submitted or invalid step', () => {
  expect(restoreStep({ step: 3 })).toBe(3);
  expect(restoreStep({ step: 5 })).toBe(5);
  expect(restoreStep({ step: 6 }), 'Done must not reopen').toBe(1);
  expect(restoreStep({ step: 0 })).toBe(1);
  expect(restoreStep({ step: '3' })).toBe(1);
  expect(restoreStep(null)).toBe(1);
  expect(restoreStep({})).toBe(1);
});

/* ── THE regression guard ─────────────────────────────────────────────────── */

test('a failed booking never says "You\'re all set"', async ({ page }) => {
  await page.goto('/school/book/full-year');

  /**
   * Reply with the EXACT shape the TassyOps route returned on failure:
   * HTTP 200, ok:true, and no stored row. If the wizard trusts `ok` instead of
   * a real id, this is the moment a parent is told they have a booking that
   * does not exist.
   */
  await page.route('**/api/school-booking', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, mode: 'dormant', reference: 'TASSY-SCHOOL-FY-0001' }),
    }),
  );

  await fillStep1(page);
  await fillStep2(page);
  await fillStep3FullYear(page);
  for (let i = 0; i < SCHOOL_POLICIES.length; i++) {
    await page.locator('input[type="checkbox"]').nth(i).check();
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Confirm commitment' }).click();

  /**
   * Scoped by text: Next renders its own <div role="alert"
   * id="__next-route-announcer__"> for client navigations, so a bare
   * getByRole('alert') is ambiguous under strict mode and fails for a reason
   * that has nothing to do with the behaviour under test. Asserting the role
   * AND the content still proves the failure is announced to a screen reader.
   */
  await expect(page.getByRole('alert').filter({ hasText: /nothing has been booked/i })).toBeVisible();
  await expect(page.getByText(/You.re all set/i), 'a success screen for a booking that was never stored').toHaveCount(0);
  await expect(page.getByText(/nothing has been booked/i)).toBeVisible();
});

/* ── the API ──────────────────────────────────────────────────────────────── */

test('happy path stores a student, a standing order and a trip', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const body = payload();

  const res = await api.post('/api/school-booking', { data: body });
  expect(res.status(), await res.text()).toBe(200);
  const json = await res.json();
  expect(json.ok).toBe(true);
  expect(typeof json.id, 'a real trip id is the only proof a booking exists').toBe('string');
  expect(json.reference).toMatch(/^TASSY-SCHOOL-FY-\d{4}$/);

  const student = await api.get(
    `${SUPABASE_URL}/rest/v1/students?select=*&id=eq.${json.studentId}`,
    { headers: h() },
  );
  const srow = (await student.json())[0];
  expect(srow.last_name, 'students.last_name is NOT NULL — the wizard must ask').toBe('Reed');
  expect(srow.parent_name).toBe('Dana Reed');
  expect(srow.notes).toContain('anxious');
  expect(srow.authorized_adults[0].phone).toBe('704-555-0199');

  const order = await api.get(
    `${SUPABASE_URL}/rest/v1/standing_orders?select=*&id=eq.${json.standingOrderId}`,
    { headers: h() },
  );
  const orow = (await order.json())[0];
  expect(orow.payer, "the column defaults to 'facility', which is wrong for a parent").toBe('passenger');
  expect(orow.facility_id, 'standing_orders_owner_ck: exactly one owner').toBeNull();
  expect(orow.created_by, 'created_by FKs facility_users — a parent has none').toBeNull();
  expect(orow.days_of_week, 'ISO 1=Mon..5=Fri for a full year').toEqual([1, 2, 3, 4, 5]);
  expect(orow.pickup_time).toBe('06:45:00');
  expect(orow.return_time).toBe('15:15:00');

  const trip = await api.get(`${SUPABASE_URL}/rest/v1/trip_requests?select=*&id=eq.${json.id}`, { headers: h() });
  const trow = (await trip.json())[0];
  expect(trow.service_line).toBe('scholar');
  expect(trow.trip_details.plan).toBe('full-year');
  expect(trow.trip_details.policy_version, 'an acknowledgement means nothing without the text version').toBeTruthy();
  for (const p of SCHOOL_POLICIES) {
    expect(trow.trip_details.policies[p.key].accepted, p.key).toBe(true);
  }
  await api.dispose();
});

test('a failed insert returns a failure, not a success', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();

  // A NUL byte is valid JSON and valid per the schema, and Postgres refuses it
  // in a text column. So the request reaches the insert and the insert fails —
  // which is exactly the path that used to answer { ok: true }.
  const res = await api.post('/api/school-booking', {
    data: payload({ child: { ...payload().child, first_name: 'Sam\u0000Reed' } }),
  });

  expect(res.status(), 'a failed write must not be a 2xx').toBeGreaterThanOrEqual(400);
  const json = await res.json();
  expect(json.ok).toBe(false);
  expect(json.id ?? null, 'no id may come back from a failed write').toBeNull();
  expect(json.error).toMatch(/nothing has been booked/i);
  await api.dispose();
});

test('bot guards reject without telling a script why', async ({ playwright }) => {
  const api = await playwright.request.newContext();

  const honeypot = await api.post('/api/school-booking', { data: payload({ hp_token: 'i am a bot' }) });
  expect(honeypot.status()).toBe(200);
  expect((await honeypot.json()).id, 'a null id is the client-side failure signal').toBeNull();

  const tooFast = await api.post('/api/school-booking', { data: payload({ elapsedMs: 500 }) });
  expect(tooFast.status()).toBe(200);
  expect((await tooFast.json()).id).toBeNull();
  await api.dispose();
});

/* ── no clinical data, anywhere ───────────────────────────────────────────── */

test('the payload accepts no medication, diagnosis or condition field', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();

  // Send every retired health field. Zod strips unknown keys, so the assertion
  // is that NONE of them reaches the row — not that the request is refused.
  const clinical = Object.fromEntries(FORBIDDEN_CLINICAL_KEYS.map((k) => [k, 'peanut allergy, carries an EpiPen']));
  const res = await api.post('/api/school-booking', {
    data: payload({ child: { ...payload().child, ...clinical } }),
  });
  expect(res.status()).toBe(200);
  const json = await res.json();

  const student = await api.get(`${SUPABASE_URL}/rest/v1/students?select=*&id=eq.${json.studentId}`, { headers: h() });
  const row = (await student.json())[0];
  const serialised = JSON.stringify(row);
  expect(serialised, 'a stripped field must not reappear in the row').not.toMatch(/EpiPen/i);
  for (const key of FORBIDDEN_CLINICAL_KEYS) {
    expect(Object.keys(row), key).not.toContain(key);
  }
  await api.dispose();
});

test('the wizard asks for nothing clinical', async ({ page }) => {
  const clinical = /allerg|medication|diagnos|condition|IEP|504|prescription/i;
  await page.goto('/school/book/full-year');
  await fillStep1(page);

  // The layout owns the page's single <main id="main"> landmark, so scope to it
  // explicitly rather than by tag — a bare locator('main') is ambiguous the
  // moment any page nests a second one.
  const body = (await page.locator('#main').textContent()) ?? '';
  // The safety field's own hint names "medical" on purpose — to steer parents
  // AWAY from it — so assert on the input surface, not the prose.
  const labels = await page.locator('label').allTextContents();
  const offending = labels.filter((l) => clinical.test(l) && !/keep your child safe/i.test(l));
  expect(offending, 'no field may invite clinical text').toEqual([]);
  expect(body).toContain("Anything your driver should know");
});

/* ── unit-ish ─────────────────────────────────────────────────────────────── */

test('to24h converts the chips and refuses anything it cannot parse', () => {
  expect(to24h('6:45 AM')).toBe('06:45');
  expect(to24h('3:15 PM')).toBe('15:15');
  expect(to24h('12:00 AM')).toBe('00:00');
  expect(to24h('12:30 PM')).toBe('12:30');
  // Refusing beats guessing: a silent 00:00 is a child collected at midnight.
  expect(to24h('half past three')).toBeNull();
  expect(to24h('25:00 AM')).toBeNull();
  expect(to24h('')).toBeNull();
  expect(to24h(null)).toBeNull();
});
