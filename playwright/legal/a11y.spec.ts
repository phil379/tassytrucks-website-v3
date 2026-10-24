import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated accessibility checks (axe-core) on the main public pages. A failure here means a page
 * gained an accessibility problem it did not have before. axe finds roughly a third of real
 * problems, so this is a safety net, not proof of conformance.
 *
 * Rules listed in KNOWN are problems we have already seen and not yet fixed; each is listed in
 * docs/legal/accessibility-2026-10-24.md. A rule not in a page's KNOWN list must have zero hits.
 * When one is fixed, delete it from the list so it cannot come back.
 */
const PAGES: Array<{ path: string; known?: string[] }> = [
  { path: '/' },
  { path: '/request' },
  { path: '/request?service=winnie' },
  { path: '/request?service=care' },
  { path: '/pricing' },
  { path: '/winnie' },
  { path: '/nemt' },
  { path: '/recover' },
  { path: '/vip' },
  { path: '/school' },
  { path: '/school/household-request' },
  { path: '/partners' },
  { path: '/partners/signup' },
  { path: '/careers' },
  { path: '/privacy' },
  { path: '/privacy/request' },
  { path: '/terms' },
  { path: '/refunds' },
  { path: '/cookies' },
  { path: '/accessibility' },
  { path: '/charlotte/nemt-rides' },
];

for (const { path, known = [] } of PAGES) {
  test(`axe: ${path} has no new accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const fresh = results.violations.filter((v) => !known.includes(v.id));
    const summary = fresh.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} element(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
    expect(summary, `new accessibility violations on ${path}`).toEqual([]);
  });
}

/* ── phone-sized screens ─────────────────────────────────────────────────── */
test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  for (const path of ['/', '/request', '/school', '/privacy/request', '/refunds']) {
    test(`axe (phone): ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
    });
  }
});

/* ── a form with errors showing ──────────────────────────────────────────── */
test('axe: the request form with its error messages showing', async ({ page }) => {
  await page.goto('/request?service=winnie');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Request a Ride' }).click();
  await expect(page.locator('[role="alert"]').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
});

/* ── keyboard ────────────────────────────────────────────────────────────── */
test('skip link is the first Tab stop and moves focus to the main content', async ({ page }) => {
  await page.goto('/pricing');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('Services menu opens on keyboard focus, reports its state, and Escape closes it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const trigger = page.getByRole('link', { name: 'Services', exact: true }).first();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.focus();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Dialysis transport' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('link', { name: 'Dialysis transport' })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('keyboard focus is visible on the choice pills (Who pays / Preferred contact)', async ({ page }) => {
  await page.goto('/request?service=care');
  const pill = page.locator('label:has(input[name="preferredContact"])').first();
  await page.locator('input[name="preferredContact"]').first().focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const outline = await pill.evaluate((el) => {
    const c = getComputedStyle(el);
    return { style: c.outlineStyle, width: parseFloat(c.outlineWidth) };
  });
  expect(outline.style, 'a focused pill must show an outline').not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});

test('footer links and the legal row are at least 44px tall', async ({ page }) => {
  await page.goto('/pricing');
  const links = page.locator('footer a, footer button');
  const count = await links.count();
  expect(count).toBeGreaterThan(10);
  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox();
    if (!box) continue; // hidden at this size
    expect(box.height, `footer control #${i} (${await links.nth(i).innerText()}) is ${Math.round(box.height)}px tall`).toBeGreaterThanOrEqual(43.5);
  }
});

test('the page has one main landmark and decorative images have empty alt text', async ({ page }) => {
  for (const path of ['/', '/partners/signup', '/pricing']) {
    await page.goto(path);
    await expect(page.locator('main')).toHaveCount(1);
  }
  await page.goto('/');
  const imgs = await page.locator('img').evaluateAll((els) => els.map((e) => ({ alt: e.getAttribute('alt'), src: e.getAttribute('src') ?? '' })));
  for (const i of imgs) expect(i.alt, `img ${i.src} must have an alt attribute`).not.toBeNull();
  // Mascots sit inside cards whose text names the service, so they must be silent.
  for (const i of imgs.filter((x) => /mascot/.test(x.src))) expect(i.alt, `${i.src} is decorative`).toBe('');
});
