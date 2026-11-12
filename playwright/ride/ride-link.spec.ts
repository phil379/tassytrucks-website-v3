import { expect, test } from '@playwright/test';

/**
 * "Where is my ride" (/ride/<token>) with RIDE_TRACKING_LINK_ENABLED off, which is how every test
 * server in playwright.config.ts runs. Any token, real-looking or not, gets the same neutral page,
 * never indexed and sent with no referrer. No database is touched with the flag off.
 */
test.skip(process.env.RIDE_TRACKING_LINK_ENABLED === 'true', 'built with the ride link on: see scripts/test-ride-link.ts');

const LOOKS_REAL = 'A'.repeat(43);

for (const token of [LOOKS_REAL, 'not-a-token']) {
  test(`flag off: /ride/${token.slice(0, 8)}... shows the neutral page`, async ({ page }) => {
    const res = await page.goto(`/ride/${token}`);
    expect(res?.status()).toBe(200);
    expect(res?.headers()['referrer-policy']).toBe('no-referrer');
    await expect(page.getByTestId('ride-neutral')).toBeVisible();
    await expect(page.getByTestId('ride-status')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
}
