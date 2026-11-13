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
    await expect(date).toHaveValue(f.slash);
    await page.locator('#requestedAt-time').selectOption('10:00');
    await expect(page.getByTestId('requestedAt-value')).toHaveValue(`${f.iso}T10:00`);
  });

  // Muse item 22 (re-test): the native date field still took "11/14/0261". The box is now plain
  // text that stops at eight digits, so no browser's year segment is involved.
  test('the date box is plain text, takes the slashes a rider types, and says what is wrong', async ({ page }) => {
    await page.goto('/request?service=care');
    const date = page.locator('#requestedAt');
    await expect(date).toHaveAttribute('type', 'text');
    const f = far();
    await date.pressSequentially(f.slash);
    await expect(date).toHaveValue(f.slash);
    await date.fill('');
    await date.pressSequentially('11140261'); // eight digits, wrong year
    await page.locator('#contactFirstName').click();
    await expect(page.getByTestId('requestedAt-date-error')).toContainText('Enter a valid date, for example');
    await page.locator('#requestedAt-time').selectOption('10:00');
    await expect(page.getByTestId('requestedAt-value')).toHaveValue('');
    await date.fill('');
    await date.pressSequentially('01/02/2020');
    await page.locator('#contactFirstName').click();
    await expect(page.getByTestId('requestedAt-date-error')).toHaveText('That date has passed. Pick a date from today on.');
    await date.fill('');
    await date.pressSequentially(f.slash);
    await expect(page.getByTestId('requestedAt-date-error')).toHaveCount(0);
    await expect(page.getByTestId('requestedAt-value')).toHaveValue(`${f.iso}T10:00`);
  });

  test('the calendar button fills the same box', async ({ page }) => {
    await page.goto('/request?service=care');
    const f = far();
    await page.getByTestId('requestedAt-calendar').fill(f.iso);
    await expect(page.locator('#requestedAt')).toHaveValue(f.slash);
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
      await expect(page.locator('#requestedAt')).toHaveValue(f.slash);
      await page.locator('#requestedAt').fill('');
    }
  });

  test('picking sets one posted value; nothing is posted until both halves are chosen', async ({ page }) => {
    await page.goto('/request?service=care');
    const f = far();
    await page.locator('#requestedAt').fill(f.slash);
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

  // Muse item 24 (re-test): "2513 Pruitt St" with no city never priced, on either address.
  test('item 24: a street address typed with no city prices the trip, on pickup and destination', async ({ page }) => {
    for (const service of ['care', 'recovery', 'winnie', 'concierge']) {
      await page.goto(`/request?service=${service}`);
      await page.locator('#pickupAddress').pressSequentially(PLACES.tourmaline!.main, { delay: 5 });
      await page.keyboard.press('Tab');
      await page.locator('#dropoffAddress').pressSequentially(PLACES.aransas!.main, { delay: 5 });
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name=pickupAddressPlaceId]'), service).toHaveValue(PLACES.tourmaline!.placeId);
      await expect(page.locator('input[name=dropoffAddressPlaceId]'), service).toHaveValue(PLACES.aransas!.placeId);
      await expect(page.locator('[data-testid=trip-estimate]'), service).toContainText('$');
    }
  });

  test('item 24: an apartment typed in the address box still prices, and moves to the Apt box', async ({ page }) => {
    await page.goto('/request?service=care');
    await page.locator('#pickupAddress').fill(`${PLACES.tourmaline!.main} Apt 200`);
    await page.locator('#contactFirstName').click();
    await expect(page.locator('input[name=pickupAddressPlaceId]')).toHaveValue(PLACES.tourmaline!.placeId);
    await expect(page.locator('#pickupUnit')).toHaveValue('Apt 200');
  });

  // Muse item 25: "Charlotte" alone showed five suggestions and no instruction.
  test('item 25: the tap line shows while typing, and nothing is picked for the rider', async ({ page }) => {
    await page.goto('/request?service=care');
    await page.locator('#pickupAddress').pressSequentially('1220', { delay: 20 });
    await expect(page.getByTestId('pickupAddress-pick-hint')).toContainText('Tap your address in the list so we can price your trip.');
    await page.locator('#contactFirstName').click();
    await expect(page.getByTestId('pickupAddress-pick-hint')).toHaveText(
      'Tap your address in the list so we can price your trip. Click back into the box to see the list.',
    );
    await expect(page.locator('input[name=pickupAddressPlaceId]')).toHaveValue('');
  });

  // Muse item 28: a Saturday with no time still showed the weekday price.
  test('item 28: a Saturday on its own adds the weekend charge before a time is chosen', async ({ page }) => {
    const sat = new Date(Date.now() + 5 * 86_400_000);
    while (sat.getDay() !== 6) sat.setDate(sat.getDate() + 1);
    const p = (n: number) => String(n).padStart(2, '0');
    const typed = `${p(sat.getMonth() + 1)}/${p(sat.getDate())}/${sat.getFullYear()}`;
    for (const service of ['care', 'concierge']) {
      await page.goto(`/request?service=${service}`);
      await page.locator('#pickupAddress').fill(`${PLACES.tourmaline!.main}, Charlotte, NC`);
      await page.locator('#dropoffAddress').fill(`${PLACES.aransas!.main}, Charlotte, NC`);
      await page.locator('#contactFirstName').click();
      const panel = page.locator('[data-testid=trip-estimate]');
      await expect(panel).toContainText('$');
      const dollars = async () => Number(/\$(\d+)/.exec((await panel.textContent()) ?? '')![1]);
      const weekday = await dollars();
      await page.locator('#requestedAt').pressSequentially(typed);
      await expect(page.getByTestId('untimed-note')).toContainText('Daytime price for that date.');
      await expect(page.getByTestId('undated-note')).toHaveCount(0);
      expect(await dollars(), service).toBe(weekday + 20);
      // Concierge has no early or late charge (Phil, Oct 14): its line must not mention one.
      if (service === 'concierge') await expect(page.getByTestId('untimed-note')).not.toContainText('Early morning');
      else await expect(page.getByTestId('untimed-note')).toContainText('Early morning and evening pickups add $25.');
    }
  });

  test('F19: with no date the estimate says it is the weekday price; with a date the line goes', async ({ page }) => {
    await page.goto('/request?service=care');
    await page.locator('#pickupAddress').fill(`${PLACES.tourmaline!.main}, Charlotte, NC`);
    await page.locator('#dropoffAddress').fill(`${PLACES.aransas!.main}, Charlotte, NC`);
    await page.locator('#contactFirstName').click();
    await expect(page.getByTestId('undated-note')).toContainText('Weekday daytime price');
    await expect(page.getByTestId('undated-note')).toContainText('Weekends add $20');
    await page.locator('#requestedAt').fill(far().slash);
    await page.locator('#requestedAt-time').selectOption('10:00');
    await expect(page.getByTestId('undated-note')).toHaveCount(0);
    await expect(page.getByTestId('untimed-note')).toHaveCount(0);
  });
});

test('Winnie: a second pet brings up a box for the other pets, and one pet hides it again', async ({ page }) => {
  await page.goto('/request?service=winnie');
  await expect(page.locator('#details-other_pets')).toHaveCount(0);
  await page.locator('#passengers').fill('2');
  await expect(page.locator('#details-other_pets')).toBeVisible();
  await expect(page.locator('label[for=details-other_pets]')).toContainText('Your other pets');
  await page.locator('#passengers').fill('1');
  await expect(page.locator('#details-other_pets')).toHaveCount(0);
  // Not a Winnie question: Care with two riders never shows it.
  await page.goto('/request?service=care');
  await page.locator('#passengers').fill('2');
  await expect(page.locator('#details-other_pets')).toHaveCount(0);
});

test('F20: every booking form says how the ride is paid', async ({ page }) => {
  for (const service of ['recovery', 'winnie', 'concierge', 'scholar']) {
    await page.goto(`/request?service=${service}`);
    await expect(page.getByTestId('how-you-pay'), service).toContainText('No card is taken on this form.');
    // Muse item 29: Scholar says it in the same words as the others, plus its monthly fact.
    await expect(page.getByTestId('how-you-pay'), service).toContainText('first, then send a secure link to pay.');
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
