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

test('6th card is Tassy School with EverDriven context', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#services a.card-tile').nth(5);
  await expect(card).toContainText('Tassy School');
  await expect(card).toContainText('EverDriven');
  await expect(card).toContainText('2022');
  await expect(card).toContainText('5 metros');
  await expect(card).toContainText('Our school transport story');
  await expect(card).toHaveAttribute('href', '/school');
});

test('/school loads with the parent-direct hero', async ({ page }) => {
  const res = await page.goto('/school');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText('Daily school transport');
});

// FIX_PROD_021 — the no-booking constraint was REVERSED. The SaaS now ships the
// parent-direct subscription, so /school deep-links to /book/school + the three
// plan-setup wizards. This test guards the NEW contract.
test('/school deep-links to the parent-direct booking wizards', async ({ page }) => {
  await page.goto('/school');
  const main = page.locator('main');
  // Hero CTA + the three plan cards all link into the SaaS booking surface.
  expect(await main.locator('a[href*="/book/school"]').count()).toBeGreaterThanOrEqual(4);
  for (const slug of ['full-year', 'weekly', 'after-school']) {
    expect(await main.locator(`a[href*="/book/school/${slug}/setup"]`).count()).toBeGreaterThanOrEqual(1);
  }
  // Every CTA carries the analytics source param.
  const firstBook = await main.locator('a[href*="/book/school"]').first().getAttribute('href');
  expect(firstBook).toContain('source=web');
  // The old "we don't take direct bookings" disclaimer is gone.
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
  expect(joined).toContain('Tassy School — Alternative student transportation');
  expect(joined).toContain('https://www.tassytrucks.com/school');
});
