import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { PLACES, blockPlaces, stubPlaces } from '../support/maps-stub';
import { NEEDS_PRICE_MARKER, PICK_ADDRESS_MESSAGE, PRICE_PENDING_MESSAGE } from '../../lib/price-fallback';

/**
 * A trip with no price.
 *
 * The bug: a Winnie ride was entered with the pickup TYPED ("1220 Tourmaline Rd, Apt 1910")
 * instead of picked from Google's suggestions. A typed address has no place id, no
 * coordinates and, here, no ZIP, so estimateTrip() returned null, the row was stored with
 * no estimate, and the customer saw "Request received" with no price and no reason.
 *
 * Two paths are pinned, because one is not enough:
 *   1. PREVENT IT. On every priced line, submit is blocked until both addresses are picked,
 *      the unit has its own field, and the message is plain.
 *   2. SURVIVE IT. When a price still cannot be computed (suggestions cannot load, or a
 *      script posts a typed address), the booking is still taken, the customer is told a
 *      dispatcher will confirm the price, and the row is marked for /ops.
 *
 * Runs on the 3947 rig (playwright.config.ts): a fake Google key, so the form loads
 * Places, and an in-memory Supabase on 3946. The specs answer Google's script request
 * themselves, so "tap a suggestion" is real. Phone width, with touch, because that is
 * where it was entered.
 */
test.use({ baseURL: 'http://localhost:3947', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const STUB_DB = 'http://127.0.0.1:3946';
const unique = (tag: string) => `pw-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.invalid`;

type Row = Record<string, unknown>;
async function rowFor(api: APIRequestContext, email: string): Promise<Row | undefined> {
  const res = await api.get(`${STUB_DB}/__rows/trip_requests`);
  const rows = (await res.json()) as Row[];
  return rows.find((r) => r.contact_email === email);
}

function whenValue() {
  const d = new Date(Date.now() + 3 * 86_400_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

/** Type into an address field, then TAP the suggestion, as a visitor does. */
async function pick(page: Page, field: 'pickupAddress' | 'dropoffAddress', query: string, name: RegExp) {
  const input = page.locator(`#${field}`);
  await input.tap();
  await input.pressSequentially(query);
  await page.getByRole('option', { name }).tap();
}

async function fillWinnieRest(page: Page, email: string) {
  await page.locator('#requestedAt').fill(whenValue());
  await page.locator('#details-pet_name').fill('Maple');
  await page.locator('#details-species').selectOption('dog');
  await page.locator('#details-rabies').selectOption('current');
  await page.locator('#details-carrier').selectOption('owner');
  await page.locator('#contactFirstName').fill('Pat');
  await page.locator('#contactLastName').fill('Tester');
  await page.locator('#contactPhone').fill('7045550142');
  await page.locator('#contactEmail').fill(email);
}

const send = (page: Page) => page.locator('form button[type=submit]');

test.describe('path 1: block the submit until both addresses are picked', () => {
  test.beforeEach(async ({ page }) => {
    await stubPlaces(page);
  });

  test('the reported case: a typed pickup is stopped with a plain message under that field', async ({ page, request }) => {
    const email = unique('typed');
    await page.goto('/request?service=winnie&utm_source=tassyops&utm_medium=staff');
    await page.locator('#pickupAddress').fill('1220 Tourmaline Rd, Apt 1910');
    await pick(page, 'dropoffAddress', '3106 Aransas', /3106 Aransas Rd/);
    await fillWinnieRest(page, email);

    await send(page).tap();

    await expect(page.locator('#pickupAddress-error')).toHaveText(PICK_ADDRESS_MESSAGE);
    // The picked destination is not nagged about.
    await expect(page.locator('#dropoffAddress-error')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Request received' })).toHaveCount(0);
    // Nothing was sent: no row.
    expect(await rowFor(request, email)).toBeUndefined();
  });

  test('picking the address clears the message, and the booking then goes through with a price', async ({ page, request }) => {
    const email = unique('picked');
    await page.goto('/request?service=winnie');
    await page.locator('#pickupAddress').fill('1220 Tourmaline Rd');
    await pick(page, 'dropoffAddress', '3106 Aransas', /3106 Aransas Rd/);
    await fillWinnieRest(page, email);
    await send(page).tap();
    await expect(page.locator('#pickupAddress-error')).toHaveText(PICK_ADDRESS_MESSAGE);

    await pick(page, 'pickupAddress', '1220 Tourmaline', /1220 Tourmaline Rd/);
    // Gone as soon as it is picked, not at the next submit.
    await expect(page.locator('#pickupAddress-error')).toHaveCount(0);

    // The door goes in its own box.
    await page.locator('#pickupUnit').fill('Apt 1910');
    await expect(page.locator('[data-testid=trip-estimate]')).toContainText('$');
    await send(page).tap();

    await expect(page.getByRole('heading', { name: 'Request received' })).toBeVisible();
    await expect(page.getByTestId('confirmed-price')).toBeVisible();
    await expect(page.getByTestId('price-pending')).toHaveCount(0);

    const row = (await rowFor(request, email))!;
    expect(row.pickup_place_id).toBe(PLACES.tourmaline.placeId);
    expect(row.pickup_lat).toBeCloseTo(PLACES.tourmaline.lat, 3);
    expect(row.estimate_low_cents).toBeGreaterThan(0);
    expect(row.estimate_high_cents).toBeGreaterThan(0);
    expect(row.estimate_shown).toBe(true);
    // Dispatch gets the door; the match and the price never saw it.
    expect(String(row.pickup_address)).toMatch(/1220 Tourmaline Rd.*, Apt 1910$/);
    expect(row.internal_notes ?? null).toBeNull();
  });

  test('apartment or unit is its own field, on both addresses, and does not touch the address text', async ({ page }) => {
    await page.goto('/request?service=winnie');
    await expect(page.locator('#pickupUnit')).toBeVisible();
    await expect(page.locator('#dropoffUnit')).toBeVisible();
    await page.locator('#pickupUnit').fill('Apt 1910');
    await expect(page.locator('#pickupAddress')).toHaveValue('');
  });

  for (const line of ['care', 'recovery', 'concierge', 'winnie']) {
    test(`${line}: submit is blocked while either address is typed, not picked`, async ({ page }) => {
      await page.goto(`/request?service=${line}`);
      await page.locator('#pickupAddress').fill('12 Somewhere Ln, Apt 4');
      await page.locator('#dropoffAddress').fill('99 Elsewhere Ave');
      await send(page).tap();
      await expect(page.locator('#pickupAddress-error')).toHaveText(PICK_ADDRESS_MESSAGE);
      await expect(page.locator('#dropoffAddress-error')).toHaveText(PICK_ADDRESS_MESSAGE);
    });
  }

  test('a line that is quoted by a person (Scholar) does not demand a pick: there is no price to show', async ({ page }) => {
    await page.goto('/request?service=scholar');
    await page.locator('#pickupAddress').fill('12 Somewhere Ln');
    await page.locator('#dropoffAddress').fill('99 Elsewhere Ave');
    await send(page).tap();
    // No error element at all: typed addresses are fine on a line that has no price to show.
    await expect(page.locator('#pickupAddress-error')).toHaveCount(0);
    await expect(page.locator('#dropoffAddress-error')).toHaveCount(0);
  });
});

test.describe('path 2: when a price still cannot be computed', () => {
  test('suggestions cannot load: the booking is still taken, the customer is told, the row is marked', async ({ page, request }) => {
    // The Maps script is blocked (an ad blocker, Google down): nothing can be picked, so
    // the form must not refuse the booking. The server cannot price it and says so.
    await blockPlaces(page);
    const email = unique('nosuggest');
    await page.goto('/request?service=winnie');
    await page.locator('#pickupAddress').fill('1220 Tourmaline Rd, Apt 1910');
    await page.locator('#dropoffAddress').fill('3106 Aransas Rd');
    await fillWinnieRest(page, email);
    // The form discards a submit that arrives under 3 seconds after it rendered (the bot
    // check). Nothing else in this test is slow, so wait like a person would.
    await page.waitForTimeout(3_200);
    await send(page).tap();

    await expect(page.getByRole('heading', { name: 'Request received' })).toBeVisible();
    await expect(page.getByTestId('price-pending')).toContainText(PRICE_PENDING_MESSAGE);
    await expect(page.getByTestId('confirmed-price')).toHaveCount(0);

    const row = (await rowFor(request, email))!;
    expect(row.estimate_low_cents ?? null).toBeNull();
    expect(row.estimate_shown).toBe(false);
    expect(String(row.internal_notes)).toContain(NEEDS_PRICE_MARKER);
    expect(String(row.internal_notes)).toContain('neither address was picked');
  });

  test('the API on its own: a typed address with no ZIP is accepted, flagged, and marked', async ({ request }) => {
    const email = unique('api-typed');
    const res = await request.post('/api/trip-request', { data: payload(email) });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.price).toBeNull();
    expect(json.priceUnavailable).toBe(true);

    const row = (await rowFor(request, email))!;
    expect(row.estimate_low_cents ?? null).toBeNull();
    expect(row.estimate_miles ?? null).toBeNull();
    expect(row.estimate_shown).toBe(false);
    expect(String(row.internal_notes).startsWith(NEEDS_PRICE_MARKER)).toBe(true);
  });

  test('the API: coordinates give a price, no flag and no mark; a ZIP alone still prices', async ({ request }) => {
    const withCoords = unique('api-coords');
    const a = await (
      await request.post('/api/trip-request', {
        data: payload(withCoords, {
          pickupPlaceId: PLACES.tourmaline.placeId,
          pickupLat: PLACES.tourmaline.lat,
          pickupLng: PLACES.tourmaline.lng,
          dropoffPlaceId: PLACES.aransas.placeId,
          dropoffLat: PLACES.aransas.lat,
          dropoffLng: PLACES.aransas.lng,
          estimateShown: true,
        }),
      })
    ).json();
    expect(a.price?.text).toMatch(/\$/);
    expect(a.priceUnavailable).toBe(false);
    expect((await rowFor(request, withCoords))!.internal_notes ?? null).toBeNull();

    const withZip = unique('api-zip');
    const b = await (
      await request.post('/api/trip-request', {
        data: payload(withZip, {
          pickupAddress: '1220 Tourmaline Rd, Charlotte, NC 28205',
          dropoffAddress: '3106 Aransas Rd, Charlotte, NC 28214',
        }),
      })
    ).json();
    expect(b.price?.text).toMatch(/\$/);
    expect(b.priceUnavailable).toBe(false);
  });

  test('a unit sent to the API is stored with the address and never changes the price', async ({ request }) => {
    const email = unique('api-unit');
    const coords = {
      pickupPlaceId: PLACES.tourmaline.placeId,
      pickupLat: PLACES.tourmaline.lat,
      pickupLng: PLACES.tourmaline.lng,
      dropoffPlaceId: PLACES.aransas.placeId,
      dropoffLat: PLACES.aransas.lat,
      dropoffLng: PLACES.aransas.lng,
    };
    const without = await (await request.post('/api/trip-request', { data: payload(unique('api-nounit'), coords) })).json();
    const withUnit = await (
      await request.post('/api/trip-request', { data: payload(email, { ...coords, pickupUnit: '1910' }) })
    ).json();
    expect(withUnit.price.text).toBe(without.price.text);
    expect(String((await rowFor(request, email))!.pickup_address)).toMatch(/, Unit 1910$/);
  });
});

/** A complete, valid Winnie request body, as the form would post it. */
function payload(email: string, over: Record<string, unknown> = {}) {
  return {
    serviceLine: 'winnie',
    pickupAddress: '1220 Tourmaline Rd, Apt 1910',
    dropoffAddress: '3106 Aransas Rd',
    requestedAt: whenValue(),
    returnTrip: false,
    passengers: 1,
    contactFirstName: 'Pat',
    contactLastName: 'Tester',
    contactPhone: '7045550142',
    contactEmail: email,
    preferredContact: 'phone',
    estimateShown: false,
    tripDetails: { pet_name: 'Maple', species: 'dog', rabies: 'current', carrier: 'owner' },
    hp_token: '',
    elapsedMs: 20_000,
    ...over,
  };
}
