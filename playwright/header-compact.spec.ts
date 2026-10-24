import { expect, test, type Page } from '@playwright/test';

/**
 * The sticky header on a phone: full size at the top, compact once scrolled, compact in short
 * landscape, and never a layout shift. Tap targets stay at least 44px at every size.
 */
const header = (page: Page) => page.locator('header[data-site-chrome]');
const logo = (page: Page) => header(page).locator('a[aria-label="Tassy Transportation home"] > span').first();
const menuButton = (page: Page) => header(page).locator('summary[aria-label="Open navigation menu"]');
const rideButton = (page: Page) => header(page).getByRole('link', { name: /Request a Ride/ });

async function open(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(logo(page)).toBeVisible();
  // Let the font and the first paint settle so sizes are final.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

const box = async (page: Page, loc: ReturnType<typeof header>) => {
  // Retry briefly: a dev-server hot reload can swap the DOM under us for a moment.
  for (let i = 0; i < 20; i++) {
    const b = await loc.boundingBox();
    if (b) return b;
    await page.waitForTimeout(100);
  }
  throw new Error('element not visible');
};

async function expectTapTargets(page: Page) {
  for (const loc of [menuButton(page), rideButton(page)]) {
    const b = await box(page, loc);
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThanOrEqual(44);
  }
}

const settled = (page: Page, loc: ReturnType<typeof header>, max: number) =>
  expect.poll(async () => (await box(page, loc)).height, { timeout: 3000 }).toBeLessThanOrEqual(max);

for (const vp of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test.describe(`phone portrait ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp });

    test('full size at the top, compact when scrolled, nothing below it moves', async ({ page }) => {
      await open(page);
      // At the top the header is exactly as it was: 88px logo, 121px bar.
      expect((await box(page, logo(page))).height).toBe(88);
      expect((await box(page, header(page))).height).toBeCloseTo(121, 0);
      await expectTapTargets(page);

      const mainTop = () => page.evaluate(() => document.querySelector('main')!.getBoundingClientRect().top + window.scrollY);
      const docHeight = () => page.evaluate(() => document.documentElement.scrollHeight);
      const before = { mainTop: await mainTop(), docHeight: await docHeight() };

      await page.evaluate(() => window.scrollTo(0, 600));
      await settled(page, header(page), 72);
      expect((await box(page, logo(page))).height).toBe(48);
      await expectTapTargets(page);

      // No layout shift: the content below the header did not move, the page is the same height.
      expect(await mainTop()).toBe(before.mainTop);
      expect(await docHeight()).toBe(before.docHeight);

      // Back to the top restores the full header.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(async () => (await box(page, logo(page))).height, { timeout: 3000 }).toBe(88);
    });
  });
}

for (const vp of [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
]) {
  test.describe(`phone landscape ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp });

    test('compact from the first paint, with 44px tap targets', async ({ page }) => {
      await open(page);
      expect((await box(page, logo(page))).height).toBe(48);
      const h = (await box(page, header(page))).height;
      expect(h).toBeLessThanOrEqual(72);
      // The bar was 145px (32-37% of the screen); it is now well under a fifth.
      expect(h / vp.height).toBeLessThan(0.2);
      await expectTapTargets(page);

      // Scrolling changes nothing more: there is no second jump.
      await page.evaluate(() => window.scrollTo(0, 500));
      await settled(page, header(page), h + 0.5);
      expect((await box(page, header(page))).height).toBeCloseTo(h, 0);
    });
  });
}

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the header still compacts, with no transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    await settled(page, header(page), 72);
    const dur = await logo(page).evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(dur.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
  });
});

test.describe('desktop is untouched', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the 128px logo does not shrink on scroll', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(400);
    expect((await box(page, logo(page))).height).toBe(128);
  });
});
