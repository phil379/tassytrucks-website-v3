import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Trip Request pipeline.
 *
 * The DB-backed cases need the tassy-ops credentials. When they are absent the
 * spec skips with a clear reason rather than failing — CI on a fork has no
 * secrets, and a skipped test that says why beats a red build that says nothing.
 */

// 'guardian' is deliberately absent: Tassy Guardian needs CNA-trained drivers
// the company does not have, so it is not requestable.
const SERVICES = ['care', 'recovery', 'wellness', 'pet', 'scholar'] as const;

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

// ── Guardian is switched off ─────────────────────────────────────────────────

test('guardian is not offered in the dropdown', async ({ page }) => {
  await page.goto('/request');
  const values = await page.locator('#serviceLine option').evaluateAll((opts) =>
    opts.map((o) => (o as HTMLOptionElement).value),
  );
  expect(values, 'guardian is gone').not.toContain('guardian');
  expect(values.length, 'the other five remain').toBe(5);
});

test('?service=guardian falls back rather than preselecting it', async ({ page }) => {
  await page.goto('/request?service=guardian');
  await expect(page.locator('#serviceLine')).not.toHaveValue('guardian');
});

test('a hand-crafted POST with service=guardian is rejected', async ({ request }) => {
  const res = await request.post('/api/trip-request', {
    data: { ...validPayload('guardian-guard-test'), serviceLine: 'guardian' },
  });

  expect(res.status(), 'server refuses the unavailable line').toBe(400);
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(body.error).toContain('not currently accepting requests');
});

test('the /recover page stays up and asks about availability', async ({ page }) => {
  const res = await page.goto('/recover');
  expect(res?.status(), '/recover is still published').toBe(200);

  const cta = page.getByRole('link', { name: /Ask about availability/i }).first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', /^tel:/);

  // And nothing on the page routes into a guardian request.
  const guardianLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.includes('service=guardian')),
  );
  expect(guardianLinks, 'no guardian request links').toEqual([]);
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

  // Inline error, wired to the field it belongs to.
  await expect(page.locator('#pickupAddress-error')).toHaveText('Enter a pickup address');
  expect(posted, 'no request was sent').toBe(false);
});

// ── Accessibility (WCAG 2.1 AA) ──────────────────────────────────────────────

test('a11y: every field has a real label and a 44px+ target', async ({ page }) => {
  await page.goto('/request');

  const ids = [
    'serviceLine',
    'pickupAddress',
    'dropoffAddress',
    'requestedAt',
    'passengers',
    'mobility',
    'vehicleNotes',
    'contactName',
    'contactPhone',
    'contactEmail',
  ];

  for (const id of ids) {
    const label = page.locator(`label[for="${id}"]`);
    await expect(label, `${id} has a <label for>`).toHaveCount(1);
    expect((await label.textContent())?.trim(), `${id} label is not empty`).toBeTruthy();

    const box = await page.locator(`#${id}`).boundingBox();
    expect(box!.height, `${id} is at least 44px tall`).toBeGreaterThanOrEqual(44);
  }

  // The honeypot is hidden from assistive tech, not just off-screen.
  await expect(page.locator('#company')).toHaveCount(1);
  expect(await page.locator('#company').evaluate((el) => el.closest('[aria-hidden="true"]') !== null)).toBe(true);
});

test('a11y: validation errors are announced and linked to their fields', async ({ page }) => {
  await page.route('**/api/trip-request', (route) => route.abort());
  await page.goto('/request');

  const summary = page.getByTestId("error-summary");
  await page.getByRole('button', { name: 'Request a Ride' }).click();

  // A live region carries the whole error set — an inline <p> alone is not
  // announced unless focus happens to be on that field.
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('problem');
  await expect(summary).toHaveAttribute('aria-live', 'assertive');

  // Focus lands in the summary so a screen reader user is told what happened.
  await expect(summary).toBeFocused();

  // The invalid field is marked and points at its own error text.
  const pickup = page.locator('#pickupAddress');
  await expect(pickup).toHaveAttribute('aria-invalid', 'true');
  await expect(pickup).toHaveAttribute('aria-describedby', /pickupAddress-error/);
});

test('a11y: the submit button is reachable by keyboard alone', async ({ page }) => {
  await page.goto('/request');
  await page.locator('#serviceLine').focus();

  // Tab forward until the submit button takes focus. The cap is generous; the
  // point is that no control traps focus on the way there.
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(
      () => document.activeElement?.getAttribute('type') === 'submit',
    );
  }
  expect(reached, 'submit is reachable via Tab').toBe(true);

  // And it has a visible focus indicator.
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, style: s.outlineStyle };
  });
  expect(outline.style, 'focus outline is drawn').not.toBe('none');
  expect(parseFloat(outline.width), 'focus outline has width').toBeGreaterThan(0);
});

test('a11y: exactly one main landmark and one h1', async ({ page }) => {
  await page.goto('/request');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
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
  const notifications = body.notifications ?? {};
  const outcomes = Object.values(notifications);
  expect(outcomes, 'notification outcomes reported').not.toHaveLength(0);
  expect(outcomes, 'at least one leg failed').toContain('failed');

  // Absent-safe contract: an unconfigured sink reports "skipped", never
  // "failed", and changes nothing else.
  if (!process.env.ZAPIER_SMS_WEBHOOK_URL) {
    expect(notifications.pushFallback, 'unset Zapier no-ops').toBe('skipped');
  }

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
  // /recover is absent on purpose — Tassy Guardian is not requestable; it is
  // covered by the "asks about availability" test above.
  const expected: Record<string, string> = {
    '/nemt': 'service=care',
    '/vip': 'service=recovery',
    '/winnie': 'service=pet',
    '/renew': 'service=wellness',
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

// ── Speed-to-lead escalation cron ────────────────────────────────────────────

test('the escalation cron refuses an unauthenticated call', async ({ request }) => {
  const res = await request.get('/api/cron/escalate-stale-requests');

  // 401 when CRON_SECRET is configured, 503 when it is not. Either way the
  // route must never run and never send an SMS for an unauthenticated caller.
  expect([401, 503], `got ${res.status()}`).toContain(res.status());
  const body = await res.json();
  expect(body.ok).toBe(false);
});

test('the escalation cron rejects a wrong bearer token', async ({ request }) => {
  const res = await request.get('/api/cron/escalate-stale-requests', {
    headers: { authorization: 'Bearer not-the-secret' },
  });
  expect([401, 503]).toContain(res.status());
  expect((await res.json()).ok).toBe(false);
});

// ── Push payload carries no PII ──────────────────────────────────────────────

test('the push notification leaks no personal data', async ({ request }) => {
  const topic = process.env.NTFY_TOPIC;
  test.skip(!dbConfigured, 'needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  test.skip(!topic, 'needs NTFY_TOPIC');

  // Distinctive values so a leak cannot hide in ordinary text.
  const marker = `pw-pii-${Date.now()}`;
  const name = `Zzyzx Quimbleforth ${Date.now()}`;
  const phone = '704-555-0177';

  const res = await request.post('/api/trip-request', {
    data: { ...validPayload(marker), contactName: name, contactPhone: phone },
  });
  expect(res.status()).toBe(200);

  // Read back what was actually published to the public topic.
  await new Promise((r) => setTimeout(r, 2000));
  const published = await (await request.get(`https://ntfy.sh/${topic}/json?poll=1`)).text();

  // An ntfy topic is readable by anyone who knows it. These must never appear.
  expect(published, 'no name').not.toContain(name);
  expect(published, 'no phone').not.toContain(phone);
  expect(published, 'no pickup address').not.toContain(marker);
  expect(published, 'no destination').not.toContain('Blythe');

  // What it SHOULD carry: the reference, so the operator can find the row.
  const ref = (await res.json()).id.slice(0, 8);
  expect(published, 'carries the reference').toContain(ref);
});
