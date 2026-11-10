import { expect, test } from '@playwright/test';

// HOTEL_QR_CARDS_ENABLED is not set for the smoke servers, so both pages must be absent.
test('hotel card pages are off by default (flag unset -> 404)', async ({ request }) => {
  for (const path of ['/hotels', '/hotels/jw/card']) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(404);
  }
});

test('the hotel link still books as before: /airport?hotel=jw shows one flat price and no card', async ({ page }) => {
  await page.goto('/airport?hotel=jw');
  await expect(page.getByTestId('hotel-flat-price')).toBeVisible();
  await expect(page.getByTestId('hotel-card')).toHaveCount(0);
});
