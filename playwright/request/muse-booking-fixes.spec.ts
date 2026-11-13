import { test, expect } from '@playwright/test';
import { PLACES, stubPlaces } from '../support/maps-stub';

/**
 * The booking-flow findings from Muse's v3 testing report (2026-11-13), pinned.
 *
 *   Date picker   typing a date corrupted the year ("111320") in three of five bookings.
 *   F17           a corrected phone number kept its red error until the next submit.
 *   F19           the price showed before a date was picked, with no word that weekends cost more.
 *   F20           only Care said how the ride is paid.
 *   F21           a fully typed address never priced the trip; only a tapped suggestion did.
 *   F22           the Scholar form showed no price, even for the published $850 plan.
 *   Cookie banner covered the hero buttons on first paint.
 *
 * Same 3947 rig as address-pricing.spec.ts: fake Google key, Places answered by the spec.
 */
test.use({ baseURL: 'http://localhost:3947' });

const far = () => {
  const d = new Date(Date.now() + 5 * 86_400_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return { iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, mdy: `${p(d.getMonth() + 1)}${p(d.getDate())}${d.getFullYear()}`, slash: `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}` };
};

test.describe('date and time', () => {
  test('typing the date keeps a four-digit year, and extra digits cannot corrupt it', async ({ page }) => {
    await page.goto('/request?service=care');
    const date = page.locator('#requestedAt');
    const f = far();
    await date.click();
    // Month, day, year, then two stray digits: the old field turned these into a six-digit year.
    await date.pressSequentially(`${f.mdy}20`);
    await expect(date).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await page.locator('#requestedAt-time').selectOption('10:00');
    await expect(page.getByTestId('requestedAt-value')).toHaveValue(/^\d{4}-\d{2}-\d{2}T10:00$/);
  });

  test('pasting a date works, in the shapes people paste', async ({ page }) => {
    await page.goto('/request?service=care');
    const f = far();
    for (const text of [f.slash, f.iso]) {
      await page.locator('#requestedAt').evaluate((el, t) => {
        const data = new DataTransfer();
        data.setData('text', t);
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }, text);
      await expect(page.locator('#requestedAt')).toHaveValue(f.iso);
    }
  });

  test('picking sets one posted value; nothing is posted until both halves are chosen', async ({ page }) => {
    await page.goto('/request?service=care');
    const f = far();
    await page.locator('#requestedAt').fill(f.iso);
    await expect(page.getByTestId('requestedAt-value')).toHaveValue('');
    await page.locator('#requestedAt-time').selectOption('14:30');
    await expect(page.getByTestId('requestedAt-value')).toHaveValue(`${f.iso}T14:30`);
  });
});

test('F17: a flagged phone number clears as soon as it is corrected', async ({ page }) => {
  await page.goto('/request?service=care');
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('#contactPhone-error')).toBeVisible();
  await page.locator('#contactPhone').fill('704555');
  await expect(page.locator('#contactPhone-error')).toBeVisible(); // still not a number we can call
  await page.locator('#contactPhone').fill('7045550142');
  await expect(page.locator('#contactPhone-error')).toHaveCount(0);
});

test.describe('with address suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await stubPlaces(page);
  });

  test('F21: a complete typed address prices the trip without tapping a suggestion', async ({ page }) => {
    await page.goto('/request?service=winnie');
    await page.locator('#pickupAddress').fill(`${PLACES.tourmaline!.main}, Charlotte, NC 28213`);
    await page.locator('#dropoffAddress').fill(`${PLACES.aransas!.main}, Charlotte, NC`);
    await page.locator('#contactFirstName').click(); // leave the field, as a typist does
    await expect(page.locator('[data-testid=trip-estimate]')).toContainText('$');
    await expect(page.locator('input[name=pickupAddressPlaceId]')).toHaveValue(PLACES.tourmaline!.placeId);
  });

  test('F21: a partial typed address is not guessed at; the rider is told to tap it', async ({ page }) => {
    await page.goto('/request?service=winnie');
    await page.locator('#pickupAddress').fill('1220 Tourmaline');
    await page.locator('#contactFirstName').click();
    await expect(page.getByTestId('pickupAddress-pick-hint')).toBeVisible();
    await expect(page.locator('input[name=pickupAddressPlaceId]')).toHaveValue('');
  });

  test('F19: with no date the estimate says it is the weekday price; with a date the line goes', async ({ page }) => {
    await page.goto('/request?service=care');
    await page.locator('#pickupAddress').fill(`${PLACES.tourmaline!.main}, Charlotte, NC`);
    await page.locator('#dropoffAddress').fill(`${PLACES.aransas!.main}, Charlotte, NC`);
    await page.locator('#contactFirstName').click();
    await expect(page.getByTestId('undated-note')).toContainText('Weekday daytime price');
    await expect(page.getByTestId('undated-note')).toContainText('Weekends add $20');
    await page.locator('#requestedAt').fill(far().iso);
    await page.locator('#requestedAt-time').selectOption('10:00');
    await expect(page.getByTestId('undated-note')).toHaveCount(0);
  });
});

test('F20: every booking form says how the ride is paid', async ({ page }) => {
  for (const service of ['recovery', 'winnie', 'concierge', 'scholar']) {
    await page.goto(`/request?service=${service}`);
    await expect(page.getByTestId('how-you-pay'), service).toContainText('No card is taken on this form.');
  }
  await page.goto('/request?service=care');
  await expect(page.locator('form')).toContainText('No card is taken on this form.');
});

test('F22: Scholar shows a price before the first question, on the plan page and on the form', async ({ page }) => {
  await page.goto('/school/book/full-year');
  await expect(page.getByTestId('scholar-plan-price')).toContainText('$850 / month');
  await page.goto('/school/book/weekly');
  await expect(page.getByTestId('scholar-plan-price')).toContainText('Priced per route');
  await page.goto('/request?service=scholar');
  await expect(page.getByTestId('scholar-plan-price')).toContainText('$850 / month');
});
