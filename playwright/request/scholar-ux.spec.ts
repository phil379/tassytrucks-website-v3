import { test, expect, type APIRequestContext } from '@playwright/test';
import { detailsFor } from '@/lib/trip-details';

/**
 * The three Scholar UX fixes (docs/scholar-ux-fixes-2026-09-29.md).
 *
 * The school list is the one with teeth. The request form promises "routes are
 * quoted by the run", and a run is several children going to the SAME school —
 * so a free-typed name is not untidy, it is unbuildable. These specs pin both
 * halves: the list resolves, AND a school missing from it still books.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);
const h = () => ({ apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` });

/* ── 1. the service selector states the decision ──────────────────────────── */

test('arriving with ?service= states the choice instead of re-offering it', async ({ page }) => {
  await page.goto('/request?service=scholar');

  // Scoped to the decided line: "Tassy Scholar" is also the nav/footer link.
  const decided = page.locator('p', { hasText: 'Booking:' }).first();
  await expect(decided).toBeVisible();
  await expect(decided.getByRole('strong')).toHaveText('Tassy Scholar');
  await expect(decided).toContainText('school and after-school');
  // The picker is not merely visually hidden — it is not there to tab into.
  await expect(page.locator('select#serviceLine')).toHaveCount(0);
  // ...but the value still submits.
  await expect(page.locator('input[type="hidden"][name="serviceLine"]')).toHaveValue('scholar');
});

test('"change" reveals the full selector', async ({ page }) => {
  await page.goto('/request?service=scholar');
  await page.getByRole('button', { name: 'change' }).click();

  const select = page.locator('select#serviceLine');
  await expect(select).toBeVisible();
  await expect(select).toHaveValue('scholar');
  // The escape hatch is the whole point: a parent who needs Care for a
  // grandparent must be able to get there.
  await expect(select.locator('option[value="care"]')).toHaveCount(1);
});

test('arriving with no ?service= still shows the picker', async ({ page }) => {
  await page.goto('/request');
  await expect(page.locator('select#serviceLine')).toBeVisible();
  await expect(page.getByText('Booking:')).toHaveCount(0);
});

test('a stale ?plan= never reaches a non-scholar trip', async ({ page }) => {
  // scholar + plan redirects to the wizard, so a plan can only linger on a
  // line that does not understand it. Same class as the pet/winnie defect:
  // a value carried into a context with no meaning for it.
  await page.goto('/request?service=care&plan=full-year');
  await expect(page).toHaveURL(/\/request\?service=care&plan=full-year$/);

  const html = await page.content();
  expect(html, 'no input may carry the plan onto the payload').not.toMatch(
    /name="[^"]*plan[^"]*"/i,
  );
  await expect(page.locator('[name="plan"]')).toHaveCount(0);
});

/* ── 2. student last name ─────────────────────────────────────────────────── */

test('the student last name is asked for, and required', async ({ page }) => {
  await page.goto('/request?service=scholar');
  const last = page.locator('#details-student_last_name');
  await expect(last).toBeVisible();
  await expect(page.locator('#details-student_first_name')).toBeVisible();
});

test('the scholar section declares last name required', () => {
  const section = detailsFor('scholar');
  const field = section?.fields.find((f) => f.key === 'student_last_name');
  expect(field, 'students.last_name is NOT NULL — the form has to ask').toBeTruthy();
  expect(field?.required).toBe(true);
});

/* ── 3. the school list ───────────────────────────────────────────────────── */

test('the schools table is seeded and searchable', async ({ playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  const api: APIRequestContext = await playwright.request.newContext();

  const res = await api.get(`${SUPABASE_URL}/rest/v1/schools?select=id&limit=1`, { headers: h() });
  expect(res.status()).toBe(200);
  const all = await api.get(`${SUPABASE_URL}/rest/v1/schools?select=id`, { headers: h() });
  expect((await all.json()).length, 'seed did not run').toBeGreaterThan(100);
  await api.dispose();
});

test('the type-ahead resolves a real school', async ({ request }) => {
  test.skip(!dbConfigured, 'needs a seeded schools table');
  const res = await request.get('/api/schools?q=elementary');
  expect(res.status()).toBe(200);
  const { schools } = await res.json();
  expect(schools.length).toBeGreaterThan(0);
  expect(schools[0]).toHaveProperty('id');
  expect(schools[0]).toHaveProperty('name');
  expect(schools.length, 'the list is capped so the dropdown stays usable').toBeLessThanOrEqual(8);
});

test('the lookup degrades to empty rather than erroring', async ({ request }) => {
  // A reference list must never be able to break the form. Short, empty and
  // hostile inputs all answer 200 with a list.
  for (const q of ['', 'a', '%', '*', "'); drop table schools;--", '()']) {
    const res = await request.get(`/api/schools?q=${encodeURIComponent(q)}`);
    expect(res.status(), JSON.stringify(q)).toBe(200);
    expect(Array.isArray((await res.json()).schools), JSON.stringify(q)).toBe(true);
  }
});

test('the school field is a picker, not a free-text box', () => {
  const section = detailsFor('scholar');
  const field = section?.fields.find((f) => f.key === 'school_name');
  expect(field?.type, 'a run cannot be built from a typed string').toBe('school');
});

test('the picker offers a way out, and it never blocks the booking', async ({ page }) => {
  await page.goto('/request?service=scholar');
  const input = page.getByRole('combobox', { name: /School/i });
  await expect(input).toBeVisible();

  await expect(page.getByRole('button', { name: /Can.t find your school/i })).toBeVisible();
  await page.getByRole('button', { name: /Can.t find your school/i }).click();
  await input.fill('A School That Is Not In The List');

  // The typed name is what submits; the id stays empty, which is the review flag.
  await expect(page.locator('input[type="hidden"][name$="-name"]')).toHaveValue(
    'A School That Is Not In The List',
  );
  await expect(page.locator('input[type="hidden"][name$="-id"]')).toHaveValue('');
});

test('picking from the list resolves an id', async ({ page }) => {
  test.skip(!dbConfigured, 'needs a seeded schools table');
  await page.goto('/request?service=scholar');
  const input = page.getByRole('combobox', { name: /School/i });
  await input.fill('elementary');

  // Scoped to the picker's listbox — a bare getByRole('option') also matches
  // every <option> in the mobility <select>.
  const option = page.getByRole('listbox').getByRole('option').first();
  await expect(option).toBeVisible();
  await option.click();

  await expect(page.locator('input[type="hidden"][name$="-id"]')).not.toHaveValue('');
  await expect(page.getByText(/group your child.s ride with that run/i)).toBeVisible();
});
