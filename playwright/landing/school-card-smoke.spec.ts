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

test('/school loads with School in H1', async ({ page }) => {
  const res = await page.goto('/school');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText('School');
});

test('/school has no booking button or contact form (no-booking constraint)', async ({ page }) => {
  await page.goto('/school');
  const main = page.locator('main');
  // No links into the SaaS booking wizards
  expect(await main.locator('a[href*="/book/"]').count()).toBe(0);
  expect(await main.locator('a[href*="quick-book"]').count()).toBe(0);
  // No form elements
  expect(await main.locator('form, input, textarea').count()).toBe(0);
  // No "Book" button text within the page body (header's global Book a Ride is outside main)
  expect(await main.getByRole('link', { name: /^book\b/i }).count()).toBe(0);
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
