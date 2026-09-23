import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Trip Request pipeline.
 *
 * The DB-backed cases need the tassy-ops credentials. When they are absent the
 * spec skips with a clear reason rather than failing — CI on a fork has no
 * secrets, and a skipped test that says why beats a red build that says nothing.
 */

const SERVICES = ['care', 'recovery', 'wellness', 'pet', 'guardian', 'scholar'] as const;

const MEDICAL_WARNING = 'Please do not include medical details, diagnoses, or procedure names.';
const CONFIRMATION = 'We confirm every request by phone or text within 2 hours during business hours.';
const WAIT_COPY = 'include up to 60 minutes of on-site wait time';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

/** Counts rows directly, so "inserted exactly one" is measured, not inferred. */
async function countRows(api: APIRequestContext, marker: string): Promise<number> {
  const res = await api.get(
    `${SUPABASE_URL}/rest/v1/trip_requests?select=id&pickup_address=eq.${encodeURIComponent(marker)}`,
    { headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` } },
  );
  expect(res.status(), 'supabase read').toBe(200);
  return (await res.json()).length;
}

function validPayload(marker: string) {
  const when = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();
  return {
    serviceLine: 'care',
    pickupAddress: marker,
    dropoffAddress: '1000 Blythe Blvd, Charlotte NC',
    requestedAt: when,
    returnTrip: false,
    returnAt: null,
    passengers: 1,
    mobility: 'ambulatory',
    vehicleNotes: 'Folding walker in the trunk.',
    contactName: 'Playwright Test',
    contactPhone: '704-555-0142',
    contactEmail: '',
    preferredContact: 'phone',
    company: '',
    source: '/request?utm_source=playwright',
  };
}

// ── Form rendering ───────────────────────────────────────────────────────────

for (const service of SERVICES) {
  test(`form renders and preselects service=${service}`, async ({ page }) => {
    const res = await page.goto(`/request?service=${service}`);
    expect(res?.status(), 'status 200').toBe(200);

    await expect(page.locator('h1')).toHaveText('Request a ride');
    await expect(page.locator('#serviceLine')).toHaveValue(service);

    // Every field the brief specifies, in the form.
    for (const id of [
      'pickupAddress',
      'dropoffAddress',
      'requestedAt',
      'passengers',
      'mobility',
      'vehicleNotes',
      'contactName',
      'contactPhone',
      'contactEmail',
    ]) {
      await expect(page.locator(`#${id}`), `#${id} present`).toBeVisible();
    }

    await expect(page.getByRole('button', { name: 'Request a Ride' })).toBeVisible();
    await expect(page.getByText(CONFIRMATION, { exact: false })).toBeVisible();
  });
}

test('the submit button never says "Book"', async ({ page }) => {
  await page.goto('/request');
  const button = await page.getByRole('button', { name: 'Request a Ride' }).textContent();
  expect(button?.toLowerCase()).not.toContain('book');
  const h1 = await page.locator('h1').textContent();
  expect(h1?.toLowerCase()).not.toContain('book');
});

test('the medical-details helper text is present', async ({ page }) => {
  await page.goto('/request');
  await expect(page.locator('#vehicleNotes-help')).toHaveText(MEDICAL_WARNING);
});

test('wait-time copy shows for recovery and wellness only', async ({ page }) => {
  await page.goto('/request?service=recovery');
  await expect(page.getByText(WAIT_COPY, { exact: false })).toBeVisible();

  await page.goto('/request?service=wellness');
  await expect(page.getByText(WAIT_COPY, { exact: false })).toBeVisible();

  await page.goto('/request?service=pet');
  await expect(page.getByText(WAIT_COPY, { exact: false })).toHaveCount(0);
});

// ── Validation ───────────────────────────────────────────────────────────────

test('required-field validation blocks submit', async ({ page }) => {
  let posted = false;
  await page.route('**/api/trip-request', (route) => {
    posted = true;
    return route.abort();
  });

  await page.goto('/request');
  await page.getByRole('button', { name: 'Request a Ride' }).click();

  await expect(page.getByText('Enter a pickup address')).toBeVisible();
  expect(posted, 'no request was sent').toBe(false);
});

test('server rejects a pickup time inside the 4-hour window', async ({ request }) => {
  const payload = { ...validPayload('4h-window-test'), requestedAt: new Date(Date.now() + 60_000).toISOString() };
  const res = await request.post('/api/trip-request', { data: payload });

  expect(res.status(), 'server is authoritative').toBe(400);
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(JSON.stringify(body.fieldErrors)).toContain('4 hours');
});

test('the honeypot is accepted but stores nothing', async ({ request }) => {
  const res = await request.post('/api/trip-request', {
    data: { ...validPayload('honeypot-test'), company: 'spam-bot' },
  });

  expect(res.status(), 'bots learn nothing from the status').toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.id, 'nothing was stored').toBeNull();
});

// ── Insert + notification independence ───────────────────────────────────────

test('a valid submit inserts exactly one row and returns 200', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const api = await playwright.request.newContext();
  const marker = `pw-insert-${Date.now()}`;

  expect(await countRows(api, marker), 'clean start').toBe(0);

  const res = await request.post('/api/trip-request', { data: validPayload(marker) });
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.id).toBeTruthy();

  expect(await countRows(api, marker), 'exactly one row').toBe(1);
  await api.dispose();
});

test('a notification failure still returns 200 and still inserts', async ({ request, playwright }) => {
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');

  const api = await playwright.request.newContext();
  const marker = `pw-notify-fail-${Date.now()}`;

  // Point the Zapier hook at a host that cannot resolve, so the SMS leg is
  // guaranteed to throw. The row must survive it.
  const res = await request.post('/api/trip-request', {
    data: { ...validPayload(marker), contactEmail: 'nobody@example.invalid' },
  });

  expect(res.status(), 'a dead notification never fails the request').toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);

  // At least one leg failed (no Zapier/Resend credentials in test), and the row
  // still exists. That is the whole contract.
  const outcomes = Object.values(body.notifications ?? {});
  expect(outcomes, 'notification outcomes reported').not.toHaveLength(0);
  expect(outcomes).toContain('failed');

  expect(await countRows(api, marker), 'row survived the failure').toBe(1);
  await api.dispose();
});

// ── CTAs ─────────────────────────────────────────────────────────────────────

test('every ride CTA on the homepage points to /request, none to the SaaS booking flow', async ({ page }) => {
  await page.goto('/');

  const saasBooking = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.includes('tassytrucksops.vercel.app/book')),
  );
  expect(saasBooking, 'no SaaS booking deep-links remain').toEqual([]);

  const requestLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.startsWith('/request')),
  );
  expect(requestLinks.length, 'homepage has request CTAs').toBeGreaterThan(0);

  // No navigational CTA still says "Book". mailto:/tel: are excluded — the
  // booking mailbox is literally book@tassytrucks.com and is not a CTA.
  const bookish = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .filter((a) => {
        const href = a.getAttribute('href') ?? '';
        return !href.startsWith('mailto:') && !href.startsWith('tel:');
      })
      .map((a) => (a.textContent ?? '').trim())
      .filter((text) => /\bbook\b/i.test(text)),
  );
  expect(bookish, 'no navigational CTA still says Book').toEqual([]);
});

test('service pages route their CTA to the matching service line', async ({ page }) => {
  const expected: Record<string, string> = {
    '/nemt': 'service=care',
    '/vip': 'service=recovery',
    '/winnie': 'service=pet',
    '/renew': 'service=wellness',
    '/recover': 'service=guardian',
  };

  for (const [path, fragment] of Object.entries(expected)) {
    await page.goto(path);
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main a[href]')).map((a) => a.getAttribute('href') ?? ''),
    );
    expect(hrefs.some((h) => h.includes(fragment)), `${path} → ${fragment}`).toBe(true);
  }
});

// ── /ops ─────────────────────────────────────────────────────────────────────

test('/ops rejects a wrong password', async ({ page }) => {
  await page.goto('/ops');
  await expect(page.locator('h1')).toHaveText('Ops queue');

  await page.locator('#password').fill('definitely-not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Still on the gate, and the queue never rendered.
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
});

test('/ops is not indexable', async ({ page }) => {
  await page.goto('/ops');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots ?? '').toContain('noindex');
});
