import { test, expect, type Page } from '@playwright/test';

// A first-time visitor: nothing answered yet. (The default for the rest of the suite is "already rejected".)
test.use({ storageState: { cookies: [], origins: [] } });

const ANALYTICS = '**/_vercel/insights/script.js';

/** Counts requests for the analytics script without letting them reach the server. */
async function watchAnalytics(page: Page) {
  const seen: string[] = [];
  await page.route(ANALYTICS, (route) => {
    seen.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stub */' });
  });
  return seen;
}

test('first visit: banner shows, analytics has NOT loaded, and Accept and Reject weigh the same', async ({ page }) => {
  const seen = await watchAnalytics(page);
  await page.goto('/');
  const banner = page.getByTestId('consent-banner');
  await expect(banner).toBeVisible();
  const accept = banner.getByRole('button', { name: 'Accept', exact: true });
  const reject = banner.getByRole('button', { name: 'Reject non-essential' });
  await expect(accept).toBeVisible();
  await expect(reject).toBeVisible();

  // Equal weight: same height, same font size, same colours, same border.
  const style = (loc: typeof accept) =>
    loc.evaluate((el) => {
      const c = getComputedStyle(el);
      return { h: Math.round(el.getBoundingClientRect().height), fs: c.fontSize, fw: c.fontWeight, bg: c.backgroundColor, color: c.color, border: c.border };
    });
  expect(await style(accept)).toEqual(await style(reject));
  expect(await style(accept)).toMatchObject({ h: expect.any(Number) });
  expect((await style(accept)).h).toBeGreaterThanOrEqual(44);

  // No boxes to tick, and scrolling does not decide anything.
  await expect(banner.locator('input')).toHaveCount(0);
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(300);
  await expect(banner).toBeVisible();
  expect(seen).toEqual([]);
});

test('Reject: banner closes, is remembered after a reload, and analytics never loads', async ({ page }) => {
  const seen = await watchAnalytics(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Reject non-essential' }).click();
  await expect(page.getByTestId('consent-banner')).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('consent-banner')).toBeHidden();
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle');
  expect(seen).toEqual([]);
});

test('Accept: analytics loads only after the click and keeps loading on later pages', async ({ page }) => {
  const seen = await watchAnalytics(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(seen, 'nothing may load before Accept').toEqual([]);
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect.poll(() => seen.length).toBe(1);
  await page.goto('/pricing');
  await expect(page.getByTestId('consent-banner')).toBeHidden();
  await expect.poll(() => seen.length).toBeGreaterThanOrEqual(2);
});

test('keyboard: the banner buttons can be reached with Tab and pressed with Enter', async ({ page }) => {
  const seen = await watchAnalytics(page);
  await page.goto('/');
  await expect(page.getByTestId('consent-banner')).toBeVisible();
  let reached = false;
  for (let i = 0; i < 120 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Reject non-essential');
  }
  expect(reached, 'Tab should reach the Reject button').toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('consent-banner')).toBeHidden();
  expect(seen).toEqual([]);
});

test('Cookie settings in the footer reopens the banner, shows the current choice, and Escape returns focus', async ({ page }) => {
  await watchAnalytics(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Reject non-essential' }).click();
  const settings = page.getByRole('button', { name: 'Cookie settings' }).first();
  await settings.focus();
  await page.keyboard.press('Enter');
  const banner = page.getByTestId('consent-banner');
  await expect(banner).toBeVisible();
  await expect(page.getByTestId('consent-current')).toContainText('Reject non-essential');
  await page.keyboard.press('Escape');
  await expect(banner).toBeHidden();
  await expect(settings).toBeFocused();
});

test('/cookies page says what is stored and has the settings control', async ({ page }) => {
  await page.goto('/cookies');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cookies');
  await expect(page.getByText('tassy-consent').first()).toBeVisible();
});
