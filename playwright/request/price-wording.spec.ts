import { test, expect, type Page } from '@playwright/test';
import { PLACES, blockPlaces, stubPlaces } from '../support/maps-stub';
import { PICK_ADDRESS_MESSAGE, PICK_TO_SEE_PRICE, PRICE_RANGE_NOTE } from '../../lib/price-fallback';

/**
 * Price wording, the error summary and the consent links, at phone width.
 *
 *   1. While address suggestions work, no ZIP-based price is shown on any line: the panel says
 *      "Pick your address to see your price". (With suggestions off, the ZIP estimate stays.)
 *   2. A price RANGE is never called "Your price" or "the price you saw when you booked", on
 *      screen or in the email. It reads "Estimated price $89–$99. A dispatcher will confirm
 *      the exact price before you’re charged."
 *   3. The error summary shows each problem once, led by the name of its field.
 *   4. The Privacy and Terms links in the text-message consent are at least 44px tall.
 *
 * The email wording is pinned in scripts/test-price-wording.ts (it needs no browser).
 * Runs on the 3947 rig (playwright.config.ts): a fake Maps key and an in-memory Supabase.
 */
test.use({ baseURL: 'http://localhost:3947', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const STUB_DB = 'http://127.0.0.1:3946';
const LINES = ['care', 'recovery', 'concierge', 'winnie'] as const;
const unique = (tag: string) => `pw-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.invalid`;

const ZIP = {
  pickup: '1220 Tourmaline Rd, Charlotte, NC 28205',
  dropoff: '3106 Aransas Rd, Charlotte, NC 28214',
};

function whenValue() {
  const d = new Date(Date.now() + 3 * 86_400_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

async function typeAddress(page: Page, field: 'pickupAddress' | 'dropoffAddress', text: string) {
  await page.locator(`#${field}`).fill(text);
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
}

async function pick(page: Page, field: 'pickupAddress' | 'dropoffAddress', query: string, name: RegExp) {
  const input = page.locator(`#${field}`);
  await input.tap();
  await input.fill('');
  await input.pressSequentially(query);
  await page.getByRole('option', { name }).first().tap();
}
const pickBoth = async (page: Page) => {
  await pick(page, 'pickupAddress', '1220 Tourmaline', /1220 Tourmaline Rd/);
  await pick(page, 'dropoffAddress', '3106 Aransas', /3106 Aransas Rd/);
};

const panel = (page: Page) => page.locator('[data-testid=trip-estimate]');
const panelText = async (page: Page) => (await panel(page).innerText()).replace(/\s+/g, ' ').trim();

async function fillContact(page: Page, email: string) {
  await page.locator('#requestedAt').fill(whenValue());
  await page.locator('#contactFirstName').fill('Pat');
  await page.locator('#contactLastName').fill('Tester');
  await page.locator('#contactPhone').fill('7045550142');
  await page.locator('#contactEmail').fill(email);
}
async function fillWinnie(page: Page, email: string) {
  await fillContact(page, email);
  await page.locator('#details-pet_name').fill('Maple');
  await page.locator('#details-species').selectOption('dog');
  await page.locator('#details-rabies').selectOption('current');
  await page.locator('#details-carrier').selectOption('owner');
}
async function fillConcierge(page: Page, email: string) {
  await fillContact(page, email);
  await page.locator('#details-occasion').selectOption('other');
}
const send = (page: Page) => page.locator('form button[type=submit]');

test.describe('1. no ZIP-based price while suggestions work', () => {
  for (const line of LINES) {
    test(`${line}: typed ZIP codes show no price; picking the addresses does`, async ({ page }) => {
      await stubPlaces(page);
      await page.goto(`/request?service=${line}`);
      await page.locator('#pickupAddress').waitFor();
      await page.waitForTimeout(700); // let the Places stand-in finish loading

      await typeAddress(page, 'pickupAddress', ZIP.pickup);
      await typeAddress(page, 'dropoffAddress', ZIP.dropoff);
      await expect(panel(page)).toContainText(PICK_TO_SEE_PRICE);
      expect(await panelText(page)).not.toContain('$');

      await pickBoth(page);
      await expect(panel(page)).toContainText('$');
      expect(await panelText(page)).not.toContain(PICK_TO_SEE_PRICE);
    });
  }

  test('one end picked, the other typed with a ZIP: still no price', async ({ page }) => {
    await stubPlaces(page);
    await page.goto('/request?service=winnie');
    await page.waitForTimeout(700);
    await typeAddress(page, 'pickupAddress', ZIP.pickup);
    await pick(page, 'dropoffAddress', '3106 Aransas', /3106 Aransas Rd/);
    await expect(panel(page)).toContainText(PICK_TO_SEE_PRICE);
    expect(await panelText(page)).not.toContain('$');
  });

  test('with suggestions off (Maps blocked) the ZIP estimate is still shown: nothing else could price the trip', async ({ page }) => {
    await blockPlaces(page);
    await page.goto('/request?service=care');
    await page.waitForTimeout(1000);
    await typeAddress(page, 'pickupAddress', ZIP.pickup);
    await typeAddress(page, 'dropoffAddress', ZIP.dropoff);
    await expect(panel(page)).toContainText('$');
    expect(await panelText(page)).not.toContain(PICK_TO_SEE_PRICE);
  });
});

test.describe('2. a range is never "Your price"', () => {
  test('panel: two picked addresses that straddle a band read "Estimated price $a–$b" and the dispatcher note', async ({ page }) => {
    await stubPlaces(page);
    await page.goto('/request?service=winnie');
    await page.waitForTimeout(700);
    await pickBoth(page);

    await expect(panel(page)).toContainText('Estimated price');
    const text = await panelText(page);
    expect(text).toMatch(/Estimated price \$\d+–\$\d+/); // en dash, no spaces
    expect(text).not.toMatch(/\$\d+ – \$\d+/);
    expect(text).not.toContain('Your price');
    expect(text).not.toContain('This is your price');
    await expect(page.getByTestId('price-note')).toHaveText(PRICE_RANGE_NOTE);
  });

  test('confirmation screen: the same range, the same words, never "Your price"', async ({ page }) => {
    await stubPlaces(page);
    await page.goto('/request?service=winnie');
    await page.waitForTimeout(700);
    await pickBoth(page);
    await fillWinnie(page, unique('range'));
    await page.waitForTimeout(3_300); // the form discards a submit under 3s after render (bot check)
    await send(page).tap();

    await expect(page.getByRole('heading', { name: 'Request received' })).toBeVisible();
    const box = page.getByTestId('confirmed-price');
    await expect(box).toBeVisible();
    const text = (await box.innerText()).replace(/\s+/g, ' ');
    expect(text).toMatch(/Estimated price \$\d+–\$\d+/);
    expect(text).toContain(PRICE_RANGE_NOTE);
    expect(text).not.toContain('Your price');
    expect(text).not.toContain('you saw when you booked');
  });

  test('a single price from two picked addresses is still "Your price", on screen and on the confirmation', async ({ page }) => {
    await stubPlaces(page);
    await page.goto('/request?service=concierge');
    await page.waitForTimeout(700);
    await pickBoth(page);
    await expect(panel(page)).toContainText('Your price');
    expect(await panelText(page)).toMatch(/Your price \$\d+(?!–)/);
    expect(await panelText(page)).not.toMatch(/\$\d+–\$\d+/);

    await fillConcierge(page, unique('firm'));
    await page.waitForTimeout(3_300);
    await send(page).tap();
    const box = page.getByTestId('confirmed-price');
    await expect(box).toBeVisible();
    const text = (await box.innerText()).replace(/\s+/g, ' ');
    expect(text).toContain('Your price');
    expect(text).toContain('This is the price you saw when you booked.');
    expect(text).not.toContain(PRICE_RANGE_NOTE);
  });

  test('the API labels it: a range is not exact and says so, a single price from picked addresses is exact', async ({ request }) => {
    const coords = {
      pickupPlaceId: PLACES.tourmaline.placeId,
      pickupLat: PLACES.tourmaline.lat,
      pickupLng: PLACES.tourmaline.lng,
      dropoffPlaceId: PLACES.aransas.placeId,
      dropoffLat: PLACES.aransas.lat,
      dropoffLng: PLACES.aransas.lng,
      estimateShown: true,
    };
    const base = {
      returnTrip: false,
      passengers: 1,
      requestedAt: whenValue(),
      contactFirstName: 'Pat',
      contactLastName: 'Tester',
      contactPhone: '7045550142',
      preferredContact: 'phone',
      pickupAddress: '1220 Tourmaline Rd',
      dropoffAddress: '3106 Aransas Rd',
      hp_token: '',
      elapsedMs: 20_000,
      ...coords,
    };
    const winnie = await (
      await request.post('/api/trip-request', {
        data: { ...base, serviceLine: 'winnie', contactEmail: unique('api-w'), tripDetails: { pet_name: 'Maple', species: 'dog', rabies: 'current', carrier: 'owner' } },
      })
    ).json();
    expect(winnie.price.range).toBe(true);
    expect(winnie.price.exact).toBe(false);
    expect(winnie.price.text).toMatch(/^\$\d+–\$\d+$/);

    const concierge = await (
      await request.post('/api/trip-request', {
        data: { ...base, serviceLine: 'concierge', contactEmail: unique('api-c'), tripDetails: { occasion: 'other' } },
      })
    ).json();
    expect(concierge.price.range).toBe(false);
    expect(concierge.price.exact).toBe(true);
    expect(concierge.price.text).toMatch(/^\$\d+$/);
  });
});

test.describe('3. the error summary names each field, once', () => {
  async function summaryItems(page: Page) {
    const summary = page.getByTestId('error-summary');
    await expect(summary.locator('li').first()).toBeVisible();
    const items = (await summary.locator('li').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    const heading = (await summary.locator('p').first().innerText()).replace(/\s+/g, ' ');
    return { items, heading };
  }

  test('two typed addresses give two DIFFERENT lines, each led by its field name', async ({ page }) => {
    await stubPlaces(page);
    await page.goto('/request?service=winnie');
    await page.waitForTimeout(700);
    await typeAddress(page, 'pickupAddress', '1220 Tourmaline Rd, Apt 1910');
    await typeAddress(page, 'dropoffAddress', '3106 Aransas Rd');
    await fillWinnie(page, unique('summary'));
    await send(page).tap();

    const { items, heading } = await summaryItems(page);
    expect(items).toEqual([
      `Pickup address: ${PICK_ADDRESS_MESSAGE}`,
      `Destination: ${PICK_ADDRESS_MESSAGE}`,
    ]);
    expect(heading).toContain('There are 2 problems');
    expect(new Set(items).size).toBe(items.length);
  });

  test('a blank form lists every problem once, and the count matches the list', async ({ page }) => {
    await page.goto('/request?service=winnie');
    await send(page).tap();
    const { items, heading } = await summaryItems(page);
    expect(items.length).toBeGreaterThan(3);
    expect(new Set(items).size).toBe(items.length); // none repeated
    expect(heading).toContain(`There are ${items.length} problems`);
    // Every line starts with the name of the field it is about, as the page labels it.
    const FIELDS = /^(Date & time|First name|Last name|Phone|Pickup address|Destination|Pet's name|Species|Rabies vaccination|Carrier or crate)\b/;
    for (const item of items) expect(item, item).toMatch(FIELDS);
    expect(items).toContain('Pickup address: Enter a pickup address');
    expect(items).toContain('Destination: Enter a destination');
    expect(items).toContain('First name: Enter your first name');
    // The service's own questions use their labels, and are not doubled ("Species: Species is required").
    expect(items).toContain("Pet's name is required");
    expect(items).toContain('Species is required');
    for (const item of items) expect(item, item).not.toMatch(/^(.{2,40}): \1 /);
  });

  test('each summary link still goes to its field', async ({ page }) => {
    await page.goto('/request?service=winnie');
    await send(page).tap();
    const link = page.getByTestId('error-summary').locator('li a').first();
    await expect(link).toHaveAttribute('href', '#pickupAddress');
  });
});

test.describe('4. Privacy and Terms in the text-message consent are tappable', () => {
  for (const line of ['care', 'winnie']) {
    test(`${line}: both links are at least 44px by 44px and still point at the right pages`, async ({ page }) => {
      await page.goto(`/request?service=${line}`);
      const consent = page.locator('label', { hasText: 'Text me updates about this ride' });
      for (const [name, href] of [['Privacy', '/privacy'], ['Terms', '/terms']] as const) {
        const link = consent.getByRole('link', { name, exact: true });
        await link.scrollIntoViewIfNeeded();
        const box = (await link.boundingBox())!;
        expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44);
        expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
        await expect(link).toHaveAttribute('href', href);
      }
    });
  }

  test('tapping a link opens the page and does not tick the consent box', async ({ page }) => {
    await page.goto('/request?service=care');
    const box = page.locator('input[name=smsConsent]');
    await expect(box).not.toBeChecked();
    await page.locator('label', { hasText: 'Text me updates about this ride' }).getByRole('link', { name: 'Privacy', exact: true }).tap();
    await expect(page).toHaveURL(/\/privacy$/);
  });
});
