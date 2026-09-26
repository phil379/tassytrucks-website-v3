import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { canBook } from '@/lib/facility';

/**
 * The four screens behind the magic link, plus the link exchange itself.
 *
 * These drive a REAL session: the spec mints a magic link with the service key
 * exactly as the signup route does, then visits /facility/confirm, which
 * verifies the token server-side and sets the session cookie. So the auth path
 * is under test, not stubbed — it is new code on a live site and the part most
 * worth proving.
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * IF THESE SPECS SUDDENLY ALL LAND ON /facility/link-expired, READ THIS FIRST.
 *
 * Each DB-backed spec here verifies one real magic link, so a full run spends
 * ~11 verifications against /auth/v1/verify from a single loopback IP. Supabase
 * Auth rate-limits that endpoint per IP (≈30 per 5 minutes) and the limit is
 * SUPABASE'S, not ours — no env var raises it, unlike TRIP_REQUEST_RATE_LIMIT
 * and FACILITY_SIGNUP_RATE_LIMIT in playwright.config.ts.
 *
 * One run is comfortably inside the limit. Running this file three or four times
 * back to back is not: the confirm route then logs
 * "[facility/confirm] rejected: Request rate limit reached" and redirects to the
 * expired page, exactly as a genuinely bad token would. The tests are not flaky
 * and the wizard is not broken — wait out the window rather than debugging it.
 * Verified 2026-09-26 against knllznbdpejoaiexmdea.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

const TEST_DOMAIN = 'pw-facility.invalid';
const h = () => ({ apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` });

function email(tag: string) {
  return `pw-wiz-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_DOMAIN}`;
}

/** Create the facility + user a magic link would land on, and return its link. */
/**
 * Auth users minted by THIS run, so afterAll can delete exactly those.
 *
 * generate_link creates the auth user as a side effect, and nothing here used
 * to remove it — 302 `@pw-facility.invalid` users had piled up in tassy-ops by
 * the time anyone looked. Scoped to this run's emails on purpose: a blanket
 * delete-by-domain would also sweep whatever an earlier run left behind, which
 * is a bulk delete against a live project and not this hook's decision to make.
 */
const mintedAuthUsers = new Set<string>();

async function seedAndLink(api: APIRequestContext, workEmail: string, rep: string | null = null) {
  const fac = await api.post(`${SUPABASE_URL}/rest/v1/facilities`, {
    headers: { ...h(), Prefer: 'return=representation' },
    data: {
      name: 'Pw Facility Wizard',
      status: 'pending',
      primary_contact_email: workEmail,
      referred_by_rep: rep,
      account_manager: rep,
    },
  });
  expect(fac.status(), 'seed facility').toBe(201);
  const facilityId = (await fac.json())[0].id;

  const user = await api.post(`${SUPABASE_URL}/rest/v1/facility_users`, {
    headers: { ...h(), Prefer: 'return=representation' },
    data: { facility_id: facilityId, email: workEmail, role: 'admin', status: 'invited' },
  });
  expect(user.status(), 'seed facility_user').toBe(201);

  // The same admin call generateFacilityMagicLink makes. A hashed_token, not an
  // action_link, because the session has to be established server-side.
  const link = await api.post(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    headers: { ...h(), 'Content-Type': 'application/json' },
    data: { type: 'magiclink', email: workEmail },
  });
  expect(link.status(), 'generate magic link').toBe(200);
  const body = await link.json();
  if (body.id) mintedAuthUsers.add(body.id as string);
  const tokenHash = body.hashed_token as string;
  expect(tokenHash, 'a hashed token came back').toBeTruthy();

  /**
   * Use the type Supabase minted, exactly as the signup route now does. Asking
   * for `magiclink` on an email with no auth user yields a `signup` token, and
   * presenting it as `magiclink` is a 403 — the bug this spec caught. Hardcoding
   * the type here would hide the same bug a second time.
   */
  const tokenType = (body.verification_type as string) ?? 'magiclink';

  return {
    facilityId,
    tokenHash,
    tokenType,
    confirmUrl: `/facility/confirm?token_hash=${tokenHash}&type=${tokenType}`,
  };
}

async function facilityRow(api: APIRequestContext, id: string) {
  const res = await api.get(
    `${SUPABASE_URL}/rest/v1/facilities?select=*&id=eq.${id}`,
    { headers: h() },
  );
  expect(res.status()).toBe(200);
  return (await res.json())[0];
}

/**
 * Open the wizard and prove we are actually on screen 1 before touching it.
 *
 * A bare goto() followed by a field interaction fails as an opaque 30s locator
 * timeout when the exchange lands on /facility/link-expired instead — which is
 * how the signup-token bug first presented, and what one flake here looked like.
 * Asserting the landing first turns that into "expected /facility/welcome,
 * received /facility/link-expired" on the line that actually went wrong.
 */
async function openWizard(page: Page, confirmUrl: string) {
  await page.goto(confirmUrl);
  await expect(page, 'the setup link opened the wizard').toHaveURL(/\/facility\/welcome/);
  await expect(page.getByRole('heading', { name: /^About /i })).toBeVisible();
}

/** Walk screen 1 so later screens are reachable. */
async function completeScreen1(page: Page) {
  await page.locator('#address').fill('1200 Elizabeth Ave, Charlotte NC');
  await page.locator('#phone').fill('704-555-0188');
  await page.locator('#primaryContactName').fill('Dana Reed');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Who books rides' })).toBeVisible();
}

test.afterAll(async ({ playwright }) => {
  if (!dbConfigured) return;
  const api = await playwright.request.newContext();
  const users = await api.get(
    `${SUPABASE_URL}/rest/v1/facility_users?select=facility_id&email=like.*@${TEST_DOMAIN}`,
    { headers: h() },
  );
  const ids: string[] = users.ok() ? (await users.json()).map((r: any) => r.facility_id) : [];
  await api.delete(`${SUPABASE_URL}/rest/v1/facility_users?email=like.*@${TEST_DOMAIN}`, { headers: h() });
  for (const id of [...new Set(ids)]) {
    await api.delete(`${SUPABASE_URL}/rest/v1/facilities?id=eq.${id}`, { headers: h() });
  }

  /**
   * Orphans: facilities reachable by NO facility_users row.
   *
   * The sweep above finds a facility only THROUGH its facility_users row, so a
   * run interrupted between seedAndLink's two inserts — Ctrl-C, a killed task, a
   * laptop that sleeps mid-suite — strands the facility where cleanup can never
   * see it again. Six of them had accumulated in tassy-ops that way. Deleting by
   * the contact email closes the gap, and the address is the same
   * RFC 2606 .invalid domain, so it cannot match a real partner.
   */
  await api.delete(
    `${SUPABASE_URL}/rest/v1/facilities?primary_contact_email=like.*@${TEST_DOMAIN}`,
    { headers: h() },
  );

  // The auth users generate_link created along the way. Without this they
  // accumulate in the project's auth table forever.
  for (const authId of mintedAuthUsers) {
    await api.delete(`${SUPABASE_URL}/auth/v1/admin/users/${authId}`, { headers: h() });
  }

  await api.dispose();
});

// ── The gate ─────────────────────────────────────────────────────────────────

test('the wizard is not reachable without a session', async ({ page }) => {
  await page.goto('/facility/welcome');
  await expect(page).toHaveURL(/\/facility\/link-expired/);
  await expect(page.getByRole('heading', { name: /link has expired/i })).toBeVisible();
});

test('confirm rejects a missing or bogus token without leaking why', async ({ page }) => {
  for (const url of [
    '/facility/confirm',
    '/facility/confirm?token_hash=not-a-real-token&type=magiclink',
    '/facility/confirm?token_hash=abc&type=signup',
  ]) {
    await page.goto(url);
    await expect(page, url).toHaveURL(/\/facility\/link-expired/);
    // The reason belongs in the log, not the URL or the page — and the page must
    // not say whether the address exists.
    expect(page.url()).not.toMatch(/error|otp|expired=/i);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toMatch(/no such|not found|unknown (account|email)/i);
  }
});

test('the wizard and the expired page are both noindex', async ({ page }) => {
  for (const url of ['/facility/welcome', '/facility/link-expired']) {
    await page.goto(url);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots ?? '', url).toContain('noindex');
  }
});

// ── The real session ─────────────────────────────────────────────────────────

/**
 * The regression lock for the bug that made every first arrival land on
 * /facility/link-expired.
 *
 * A facility signs up before it has an auth user, so generate_link{magiclink}
 * mints a token whose verification_type is `signup`. Presenting that token as
 * `magiclink` is a 403 from /auth/v1/verify, which the confirm route correctly
 * turns into the expired page — so the wizard was unreachable for 100% of real
 * first-time partners while working for anyone who had signed in before.
 *
 * Two things have to hold, and the first is why the second was ever wrong:
 * Supabase really does hand back `signup` here, and the link works anyway.
 */
test('a first-time facility gets a signup token and the link still works', async ({
  page,
  playwright,
}) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { tokenType, confirmUrl } = await seedAndLink(api, email('firsttime'));

  expect(tokenType, 'a brand-new email mints a signup token, not a magiclink').toBe('signup');

  await page.goto(confirmUrl);
  await expect(page, 'the signup-type token still opens the wizard').toHaveURL(
    /\/facility\/welcome/,
  );

  // And the type is not a free parameter: a flow we never mint is refused.
  await page.goto(`/facility/confirm?token_hash=${'a'.repeat(56)}&type=recovery`);
  await expect(page).toHaveURL(/\/facility\/link-expired/);

  await api.dispose();
});

test('a magic link opens the wizard on screen 1', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { confirmUrl } = await seedAndLink(api, email('open'), 'marcus-bell');

  await page.goto(confirmUrl);

  await expect(page, 'the exchange lands on the wizard').toHaveURL(/\/facility\/welcome/);
  await expect(page.getByRole('heading', { name: /About Pw Facility Wizard/i })).toBeVisible();
  // The token must not survive into the address bar.
  expect(page.url()).not.toContain('token_hash');
  await api.dispose();
});

test('screen 1 stores the facility type and its default service line', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { facilityId, confirmUrl } = await seedAndLink(api, email('kind'));

  await openWizard(page, confirmUrl);
  await page.locator('#kind').selectOption('veterinary');
  await completeScreen1(page);

  const row = await facilityRow(api, facilityId);
  expect(row.kind).toBe('veterinary');
  // A vet books Winnie by default — set from the type, never asked for.
  expect(row.service_lines).toEqual(['winnie']);
  expect(row.address).toContain('Elizabeth Ave');
  expect(row.primary_contact_name).toBe('Dana Reed');
  await api.dispose();
});

test('screen 2 offers only the two roles, and invites teammates', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { facilityId, confirmUrl } = await seedAndLink(api, email('invite'));

  await openWizard(page, confirmUrl);
  await completeScreen1(page);

  // `approver` is deprecated — there is no approval gate, so a role implying one
  // would be a lie. `billing` waits until an AP clerk asks.
  const roles = await page.locator('#invite-role-0 option').evaluateAll((o) =>
    o.map((x) => (x as HTMLOptionElement).value),
  );
  expect(roles).toEqual(['requester', 'admin']);

  const teammate = email('mate');
  await page.locator('#invite-email-0').fill(teammate);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'How you pay' })).toBeVisible();

  const users = await api.get(
    `${SUPABASE_URL}/rest/v1/facility_users?select=email,role,status&facility_id=eq.${facilityId}`,
    { headers: h() },
  );
  const rows = await users.json();
  const invited = rows.find((r: any) => r.email === teammate);
  expect(invited, 'the teammate exists').toBeTruthy();
  expect(invited.role).toBe('requester');
  expect(invited.status).toBe('invited');
  await api.dispose();
});

// ── Screen 3: the credit decision, and the bridge ────────────────────────────

test('screen 3 says weekly invoicing is approved by hand', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { confirmUrl } = await seedAndLink(api, email('copy'));

  await openWizard(page, confirmUrl);
  await completeScreen1(page);
  await page.getByRole('button', { name: 'Skip for now' }).click();

  // Phil's copy, verbatim. A facility must not finish onboarding believing it
  // can book on account today.
  await expect(
    page.getByText(
      'Weekly invoicing is a credit account, so we open it by hand. Phil reviews and approves — usually the same business day.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('I need to book before then — use passenger-pays in the meantime'),
  ).toBeVisible();
  await api.dispose();
});

test('weekly + bridge stores patient_card, stays pending, and can book', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { facilityId, confirmUrl } = await seedAndLink(api, email('bridge'));

  await openWizard(page, confirmUrl);
  await completeScreen1(page);
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await page.getByText('I need to book before then — use passenger-pays in the meantime').click();
  await page.locator('#billingEmail').fill(`ap-${Date.now()}@${TEST_DOMAIN}`);
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByRole('heading', { name: /is set up/i })).toBeVisible();

  const row = await facilityRow(api, facilityId);
  // patient_card is what lets canBook() through while the credit decision waits.
  expect(row.billing_mode).toBe('patient_card');
  expect(row.status, 'the credit decision is untouched').toBe('pending');
  // Recorded in a real column, so the approval queue is a predicate rather
  // than a substring search of free text.
  expect(row.requested_billing_mode).toBe('invoice_weekly');
  expect(row.notes, 'notes is left for humans').toBeNull();
  expect(canBook(row), 'they can book today').toBe(true);

  await expect(page.getByText(/book your first ride now/i)).toBeVisible();
  await api.dispose();
});

test('weekly without the bridge stays pending and cannot book yet', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { facilityId, confirmUrl } = await seedAndLink(api, email('weekly'));

  await openWizard(page, confirmUrl);
  await completeScreen1(page);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.locator('#billingEmail').fill(`ap2-${Date.now()}@${TEST_DOMAIN}`);
  await page.getByRole('button', { name: 'Finish setup' }).click();
  // Wait for screen 4 before reading the row. Clicking Finish setup only STARTS
  // the server action, and this spec's expected values are also the seeded
  // values — so without this wait it passes whether or not the write ever
  // happened. Screen 4 renders on success, so it is the completion signal.
  await expect(page.getByRole('heading', { name: /is set up/i })).toBeVisible();

  const row = await facilityRow(api, facilityId);
  expect(row.billing_mode).toBe('invoice_weekly');
  expect(row.status).toBe('pending');
  // No bridge, so nothing to disambiguate — the row already says weekly.
  expect(row.requested_billing_mode).toBeNull();
  expect(canBook(row), 'waiting on the credit decision').toBe(false);

  // And they are told, rather than left to discover it at booking.
  await expect(page.getByText(/email you the moment your account is open/i)).toBeVisible();
  await api.dispose();
});

test('passenger-pays needs no credit decision and opens immediately', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { facilityId, confirmUrl } = await seedAndLink(api, email('card'));

  await openWizard(page, confirmUrl);
  await completeScreen1(page);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByText('The passenger pays').click();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  // Same race as above, and here it actually bit: the row still read
  // invoice_weekly because it was read before the action had written.
  await expect(page.getByRole('heading', { name: /is set up/i })).toBeVisible();

  const row = await facilityRow(api, facilityId);
  expect(row.billing_mode).toBe('patient_card');
  expect(row.status, 'no credit extended, so nothing to approve').toBe('active');
  expect(canBook(row)).toBe(true);
  await api.dispose();
});

// ── Screen 4 ─────────────────────────────────────────────────────────────────

test('screen 4 names the account manager from the signup link', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { confirmUrl } = await seedAndLink(api, email('rep'), 'marcus-bell');

  await openWizard(page, confirmUrl);
  await completeScreen1(page);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByText('The passenger pays').click();
  await page.getByRole('button', { name: 'Finish setup' }).click();

  await expect(page.getByText('Marcus Bell')).toBeVisible();
  await api.dispose();
});

test('no rep means an honest placeholder, not a made-up name', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { confirmUrl } = await seedAndLink(api, email('norep'), null);

  await openWizard(page, confirmUrl);
  await completeScreen1(page);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByText('The passenger pays').click();
  await page.getByRole('button', { name: 'Finish setup' }).click();

  await expect(page.getByText(/assigning your account manager/i)).toBeVisible();
  await api.dispose();
});

// ── What the wizard never asks ───────────────────────────────────────────────

test('no screen asks for anything clinical', async ({ page, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api = await playwright.request.newContext();
  const { confirmUrl } = await seedAndLink(api, email('phi'));

  const forbidden =
    /diagnos|procedure|medication|condition|date of birth|insurance|member id|medical record/i;

  await openWizard(page, confirmUrl);

  // Screen 1, then 2, then 3 — checking each label and placeholder as we go.
  for (const advance of [
    async () => completeScreen1(page),
    async () => page.getByRole('button', { name: 'Skip for now' }).click(),
  ]) {
    const labels = await page.locator('label, [placeholder]').allTextContents();
    const joined = labels.join(' ');
    // The one legitimate mention is the promise that we never ask.
    const offending = joined.replace(/We never ask for[^.]*\./g, '');
    expect(offending, 'no clinical field').not.toMatch(forbidden);
    await advance();
  }

  const finalLabels = (await page.locator('label, [placeholder]').allTextContents()).join(' ');
  expect(finalLabels).not.toMatch(forbidden);
  await api.dispose();
});
