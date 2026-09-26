import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * app/api/facility-signup/route.ts — the facility front door.
 *
 * Phase 1 shipped with no specs at all, and this is a SECOND public write path
 * into the same database as /api/trip-request — the exact route class that
 * produced the 2026-09-25 silent drop, where the server stored nothing and the
 * UI said "received". These are the assertions from the wizard spec's
 * "Specs required before it ships" list.
 *
 * Cleanup: every facility this file creates uses an @pw-facility.invalid email
 * and a `Pw Facility` name prefix. The afterAll removes exactly those, by
 * facility_users first (it has the FK) and then facilities.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

const TEST_DOMAIN = 'pw-facility.invalid';

function h() {
  return { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` };
}

/** A unique work email per test, so runs never collide on the unique index. */
function email(tag: string): string {
  return `pw-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_DOMAIN}`;
}

function payload(workEmail: string, extra: Record<string, unknown> = {}) {
  return {
    facilityName: 'Pw Facility Lakeside',
    workEmail,
    hp_token: '',
    // Above MIN_FILL_MS (3s), or the bot check discards it.
    elapsedMs: 30_000,
    source: 'pw-spec',
    ...extra,
  };
}

async function facilityFor(api: APIRequestContext, workEmail: string) {
  const users = await api.get(
    `${SUPABASE_URL}/rest/v1/facility_users?select=id,facility_id,email,role,status&email=eq.${encodeURIComponent(workEmail)}`,
    { headers: h() },
  );
  expect(users.status(), 'facility_users read').toBe(200);
  const rows = await users.json();
  if (rows.length === 0) return null;

  const fac = await api.get(
    `${SUPABASE_URL}/rest/v1/facilities?select=id,name,status,referred_by_rep,account_manager,referral_source&id=eq.${rows[0].facility_id}`,
    { headers: h() },
  );
  expect(fac.status(), 'facilities read').toBe(200);
  return { user: rows[0], facility: (await fac.json())[0] };
}

test.afterAll(async ({ playwright }) => {
  if (!dbConfigured) return;
  const api = await playwright.request.newContext();

  // facility_users first — it holds the FK onto facilities.
  const users = await api.get(
    `${SUPABASE_URL}/rest/v1/facility_users?select=facility_id&email=like.*@${TEST_DOMAIN}`,
    { headers: h() },
  );
  const ids: string[] = users.ok() ? (await users.json()).map((r: any) => r.facility_id) : [];

  await api.delete(`${SUPABASE_URL}/rest/v1/facility_users?email=like.*@${TEST_DOMAIN}`, { headers: h() });

  for (const id of [...new Set(ids)]) {
    const res = await api.delete(`${SUPABASE_URL}/rest/v1/facilities?id=eq.${id}`, { headers: h() });
    if (!res.ok()) console.warn(`[cleanup] facility ${id} not removed (${res.status()})`);
  }
  await api.dispose();
});

// ── The silent-drop assertion ────────────────────────────────────────────────

test('a failed insert does NOT return success', async ({ request }) => {
  // The shape of the bug is valid input plus a failed write. A NUL byte gets
  // there honestly: zod sees an ordinary string, Postgres cannot store \u0000
  // in a text column, so the INSERT fails after validation passed. (A very long
  // email does NOT work — the column is unbounded text and stores it happily.)
  const res = await request.post('/api/facility-signup', {
    data: payload(email('boom'), { facilityName: 'Pw Facility\u0000 Lakeside' }),
  });

  expect(res.status(), 'a write that failed is not a success').not.toBe(200);
  const body = await res.json();
  expect(body.ok, 'ok is false').toBe(false);
  expect(body.id ?? null, 'no id is handed back').toBeNull();
});

test('the client contract: success requires an id, not just ok', async ({ page }) => {
  // The 2026-09-25 drop was `setDone(json.id ?? "received")` on the booking
  // form. This asserts the facility form does not repeat it.
  await page.route('**/api/facility-signup', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, id: null, stored: false }),
    }),
  );

  await page.goto('/partners/signup');
  await page.locator('#facilityName').fill('Pw Facility Lakeside');
  await page.locator('#workEmail').fill(`pw-ui@${TEST_DOMAIN}`);
  await page.getByRole('button', { name: /get started|request|continue/i }).first().click();

  // No success screen for a signup that was never stored.
  await expect(page.getByText(/check your (email|inbox)/i)).toHaveCount(0);
});

// ── Bot checks ───────────────────────────────────────────────────────────────

test('hp_token filled is rejected and stores nothing', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const workEmail = email('honeypot');
  const res = await request.post('/api/facility-signup', {
    data: payload(workEmail, { hp_token: 'spam-bot' }),
  });

  expect(res.status(), 'a script learns nothing from the status').toBe(200);
  const body = await res.json();
  expect(body.id, 'nothing was stored').toBeNull();
  expect(body.stored).toBe(false);

  const api = await playwright.request.newContext();
  expect(await facilityFor(api, workEmail), 'no facility exists').toBeNull();
  await api.dispose();
});

test('a submit under MIN_FILL_MS is rejected and stores nothing', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const workEmail = email('toofast');
  const res = await request.post('/api/facility-signup', {
    data: payload(workEmail, { elapsedMs: 40 }),
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.id).toBeNull();
  expect(body.stored).toBe(false);

  const api = await playwright.request.newContext();
  expect(await facilityFor(api, workEmail), 'no facility exists').toBeNull();
  await api.dispose();
});

// ── Happy path, idempotency, attribution ─────────────────────────────────────

test('the happy path stores a facility and returns its id', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const workEmail = email('happy');
  const res = await request.post('/api/facility-signup', { data: payload(workEmail) });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.id, 'an id comes back').toBeTruthy();
  expect(body.stored).toBe(true);
  expect(body.created, 'a new account').toBe(true);

  const api = await playwright.request.newContext();
  const found = await facilityFor(api, workEmail);
  expect(found, 'the row is really there').not.toBeNull();
  expect(found!.facility.id).toBe(body.id);
  expect(found!.facility.name).toBe('Pw Facility Lakeside');
  // The signer manages the account: `admin`, not the column default
  // `requester`. They invite the ride-bookers on Screen 2.
  expect(found!.user.role, 'the signer manages the account').toBe('admin');
  await api.dispose();
});

test('a duplicate email is idempotent — no second facility', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const workEmail = email('dupe');

  const first = await request.post('/api/facility-signup', { data: payload(workEmail) });
  expect(first.status()).toBe(200);
  const firstBody = await first.json();
  expect(firstBody.created).toBe(true);

  // Someone clicks twice, or signs up again a week later having lost the email.
  const second = await request.post('/api/facility-signup', {
    data: payload(workEmail, { facilityName: 'Pw Facility Lakeside Renamed' }),
  });
  expect(second.status(), 'a second attempt is not an error').toBe(200);
  const secondBody = await second.json();

  expect(secondBody.id, 'same facility comes back').toBe(firstBody.id);
  expect(secondBody.created, 'nothing new was created').toBe(false);

  const api = await playwright.request.newContext();
  const users = await api.get(
    `${SUPABASE_URL}/rest/v1/facility_users?select=id&email=eq.${encodeURIComponent(workEmail)}`,
    { headers: h() },
  );
  expect((await users.json()).length, 'exactly one user row').toBe(1);
  await api.dispose();
});

test('?rep= sets BOTH referred_by_rep and account_manager', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const workEmail = email('rep');
  const res = await request.post('/api/facility-signup', {
    data: payload(workEmail, { rep: 'marcus-bell' }),
  });
  expect(res.status()).toBe(200);

  const api = await playwright.request.newContext();
  const found = await facilityFor(api, workEmail);
  expect(found).not.toBeNull();

  // referred_by_rep is permanent and drives residual commission.
  expect(found!.facility.referred_by_rep, 'the seller').toBe('marcus-bell');
  // account_manager services the account today and may later be reassigned.
  expect(found!.facility.account_manager, 'the servicer').toBe('marcus-bell');
  await api.dispose();
});

test('no rep param leaves both null and does not crash', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const workEmail = email('norep');
  const res = await request.post('/api/facility-signup', { data: payload(workEmail) });

  expect(res.status(), 'an unattributed signup is still a signup').toBe(200);
  expect((await res.json()).id).toBeTruthy();

  const api = await playwright.request.newContext();
  const found = await facilityFor(api, workEmail);
  expect(found!.facility.referred_by_rep, 'nobody credited').toBeNull();
  expect(found!.facility.account_manager, 'awaiting manual assignment').toBeNull();
  await api.dispose();
});

test('a malformed rep slug is refused rather than written', async ({ request }) => {
  // This value lands in the column that drives commission payments, so it is
  // validated rather than trusted.
  const res = await request.post('/api/facility-signup', {
    data: payload(email('badrep'), { rep: 'Robert"); DROP TABLE facilities;--' }),
  });

  expect(res.status(), 'junk attribution is a 400').toBe(400);
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(JSON.stringify(body.fieldErrors ?? {})).toContain('referral link');
});
