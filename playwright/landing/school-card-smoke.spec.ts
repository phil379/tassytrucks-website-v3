import { test, expect } from '@playwright/test';

test('home renders 6 cards in the service grid', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('#services .grid.md\\:grid-cols-2');
  await expect(grid.locator('a.card-tile')).toHaveCount(6);
});

test('heading reads Six lines of care', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('#services h2').first(),
  ).toContainText('Six lines of care');
});

test('6th card is Tassy Scholar with EverDriven context', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#services a.card-tile').nth(5);
  await expect(card).toContainText('Tassy Scholar');
  await expect(card).toContainText('EverDriven');
  await expect(card).toContainText('2022');
  await expect(card).toContainText('5 metros');
  await expect(card).toContainText('Get a route quote');
  await expect(card).toHaveAttribute('href', '/school');
});

test('/school loads with the parent-direct hero', async ({ page }) => {
  const res = await page.goto('/school');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText('Daily school transport');
});

// The SaaS parent-direct subscription wizard (/book/school/<plan>/setup) is part
// of the booking flow that has never worked — a parent trying to pay hit a dead
// end there. /school now routes to the in-repo request pipeline, carrying the
// chosen plan so dispatch can quote it. This test guards THAT contract.
test('/school routes every plan into the request pipeline', async ({ page }) => {
  await page.goto('/school');
  const main = page.locator('main');

  // Hero CTA + the three plan cards.
  expect(await main.locator('a[href*="/request?service=scholar"]').count()).toBeGreaterThanOrEqual(4);

  for (const plan of ['full-year', 'weekly', 'after-school']) {
    expect(
      await main.locator(`a[href*="plan=${plan}"]`).count(),
      `${plan} plan links to the request form`,
    ).toBeGreaterThanOrEqual(1);
  }

  // And nothing on the page still points at the dead SaaS booking surface.
  const deadLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.includes('/book/school')),
  );
  expect(deadLinks, 'no SaaS school booking links remain').toEqual([]);

  await expect(main).not.toContainText('do not currently take direct parent bookings');
});

test('/sitemap.xml includes /school', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain('https://www.tassytrucks.com/school');
});

test('LocalBusiness JSON-LD on / includes the school offer', async ({ page }) => {
  await page.goto('/');
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const joined = ld.join(' ');
  expect(joined).toContain('Tassy Scholar — Alternative student transportation');
  expect(joined).toContain('https://www.tassytrucks.com/school');
});
