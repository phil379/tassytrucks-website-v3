import { expect, test, type Page } from '@playwright/test';

/**
 * The French bulldog photo on /charlotte/pet-transport: it must be reserved in the layout before
 * it loads (no shift), lazy, labelled, and never cause sideways scroll, at every width the page
 * is used at, in light and dark, and at 200% zoom.
 */
const PATH = '/charlotte/pet-transport';
const ALT = 'French bulldog resting on a cream pet bed';
const photo = (page: Page) => page.locator(`img[alt="${ALT}"]`);

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440];

async function noSidewaysScroll(page: Page) {
  const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  expect(w.doc, `document ${w.doc}px wider than the ${w.win}px window`).toBeLessThanOrEqual(w.win);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const width of WIDTHS) {
      test(`${width}px: one photo, labelled, sized, lazy, inside the screen, no sideways scroll`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(PATH);
        await expect(photo(page)).toHaveCount(1);
        const img = photo(page);
        await expect(img).toHaveAttribute('width', '1125');
        await expect(img).toHaveAttribute('height', '1406');
        await expect(img).toHaveAttribute('loading', 'lazy');
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
        const b = await img.boundingBox();
        expect(b).not.toBeNull();
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(width + 0.5);
        // Drawn at the page's 4:5 shape, not stretched.
        expect(b!.height / b!.width).toBeGreaterThan(1406 / 1125 - 0.01);
        expect(b!.height / b!.width).toBeLessThan(1406 / 1125 + 0.01);
        await noSidewaysScroll(page);
      });
    }

    // 200% zoom is the same as a window half as wide in CSS pixels: 1280 -> 640 and 640 -> 320.
    for (const css of [640, 320]) {
      test(`200% zoom (${css} CSS px wide): no sideways scroll, photo inside the screen`, async ({ page }) => {
        await page.setViewportSize({ width: css, height: 450 });
        await page.goto(PATH);
        await photo(page).scrollIntoViewIfNeeded();
        const b = await photo(page).boundingBox();
        expect(b!.x + b!.width).toBeLessThanOrEqual(css + 0.5);
        await noSidewaysScroll(page);
      });
    }
  });
}

test('the photo box is reserved before the file loads, and nothing below it moves when it arrives', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Hold every photo request until we say so, to look at the page while the image is "still loading".
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/photos/**', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(PATH, { waitUntil: 'domcontentloaded' });
  const img = photo(page);
  await expect(img).toHaveCount(1);
  await img.scrollIntoViewIfNeeded();
  const heading = page.locator('article h2').first();
  const before = { img: await img.boundingBox(), h2: await heading.boundingBox() };
  expect(before.img!.height).toBeGreaterThan(300); // a real box exists already
  release();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  const after = { img: await img.boundingBox(), h2: await heading.boundingBox() };
  expect(Math.abs(after.img!.height - before.img!.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.h2!.y - before.h2!.y)).toBeLessThanOrEqual(1);
});

test('serves WebP to a browser that accepts it, with a JPEG fallback in the markup', async ({ page }) => {
  await page.goto(PATH);
  const html = await page.content();
  expect(html).toMatch(/<source[^>]+type="image\/webp"[^>]+pet-transport-french-bulldog-480\.webp 480w/);
  expect(html).toMatch(/<img[^>]+pet-transport-french-bulldog-1125\.jpg/);
  const current = await photo(page).evaluate((el: HTMLImageElement) => el.currentSrc);
  expect(current).toMatch(/\.webp$/);
});

test('everything else on the page is where it was: one h1, same sections', async ({ page }) => {
  await page.goto(PATH);
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.locator('article section').count()).toBeGreaterThanOrEqual(5);
});
