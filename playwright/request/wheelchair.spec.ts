import { test, expect, type APIRequestContext } from '@playwright/test';
import { PLACES, stubPlaces } from '../support/maps-stub';
import { NEEDS_PRICE_MARKER, PRICE_PENDING_MESSAGE } from '../../lib/price-fallback';
import { WAV_PARTNER_LINE } from '../../lib/wav';

/**
 * Wheelchair rides while the Tassy Care WAV switch (lib/wav.ts, NEXT_PUBLIC_WAV_LIVE) is OFF,
 * which is how CI builds the app. The booking is still taken, no price is printed, and the row
 * is marked for a dispatcher. The ON state is covered by scripts/test-wav-switch.ts, because the
 * flag is read at build time and this rig is built once.
 *
 * Runs on the 3947 rig (playwright.config.ts): an in-memory Supabase on 3946.
 */
test.skip(process.env.NEXT_PUBLIC_WAV_LIVE === 'true', 'built with the WAV switch on: see scripts/test-wav-switch.ts');
test.use({ baseURL: 'http://localhost:3947', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const STUB_DB = 'http://127.0.0.1:3946';
const unique = (tag: string) => `pw-wav-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.invalid`;

type Row = Record<string, unknown>;
async function rowFor(api: APIRequestContext, email: string): Promise<Row | undefined> {
  const rows = (await (await api.get(`${STUB_DB}/__rows/trip_requests`)).json()) as Row[];
  return rows.find((r) => r.contact_email === email);
}

function whenValue() {
  const d = new Date(Date.now() + 3 * 86_400_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

const DETAILS: Record<string, Record<string, string>> = {
  care: { rider_is: 'self', assistance: 'door' },
  recovery: { patient_is: 'self', responsible_adult: 'me', support_to_car: 'wheelchair' },
  concierge: { occasion: 'airport' },
};

function payload(serviceLine: string, email: string) {
  return {
    serviceLine,
    mobility: 'wheelchair',
    pickupAddress: '1220 Tourmaline Rd, Charlotte, NC 28213',
    dropoffAddress: '3106 Aransas Rd, Charlotte, NC 28208',
    pickupPlaceId: PLACES.tourmaline.placeId,
    pickupLat: PLACES.tourmaline.lat,
    pickupLng: PLACES.tourmaline.lng,
    dropoffPlaceId: PLACES.aransas.placeId,
    dropoffLat: PLACES.aransas.lat,
    dropoffLng: PLACES.aransas.lng,
    requestedAt: whenValue(),
    returnTrip: false,
    passengers: 1,
    contactFirstName: 'Pat',
    contactLastName: 'Tester',
    contactPhone: '7045550142',
    contactEmail: email,
    preferredContact: 'phone',
    estimateShown: false,
    tripDetails: DETAILS[serviceLine],
    hp_token: '',
    elapsedMs: 20_000,
  };
}

test.describe('switch OFF: wheelchair is booked, priced by a dispatcher', () => {
  for (const line of ['care', 'recovery', 'concierge']) {
    test(`${line}: the booking is taken, carries no price, and is marked for a dispatcher`, async ({ request }) => {
      const email = unique(line);
      const res = await request.post('/api/trip-request', { data: payload(line, email) });
      expect(res.status(), await res.text()).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.price).toBeNull();
      expect(json.priceUnavailable).toBe(true);

      const row = (await rowFor(request, email))!;
      expect(row.mobility).toBe('wheelchair');
      expect(row.estimate_low_cents ?? null).toBeNull();
      expect(row.estimate_shown).toBe(false);
      expect(String(row.internal_notes).startsWith(NEEDS_PRICE_MARKER)).toBe(true);
      expect(String(row.internal_notes)).toContain('wheelchair');
    });
  }

  test('the form says who runs the ride and prints no price', async ({ page }) => {
    await stubPlaces(page);
    await page.goto('/request?service=care&mobility=wheelchair');
    await expect(page.locator('#mobility')).toHaveValue('wheelchair');
    const panel = page.locator('[data-testid=trip-estimate]');
    await expect(panel).toContainText(WAV_PARTNER_LINE);
    await expect(panel).not.toContainText('$');
  });

  test('the confirmation tells the guest a dispatcher will confirm the price', async ({ page, request }) => {
    await stubPlaces(page);
    const email = unique('ui');
    await page.goto('/request?service=care&mobility=wheelchair');
    await page.locator('#pickupAddress').tap();
    await page.locator('#pickupAddress').pressSequentially('1220 Tourmaline');
    await page.getByRole('option', { name: /1220 Tourmaline Rd/ }).tap();
    await page.locator('#dropoffAddress').tap();
    await page.locator('#dropoffAddress').pressSequentially('3106 Aransas');
    await page.getByRole('option', { name: /3106 Aransas Rd/ }).tap();
    await page.locator('#requestedAt').fill(whenValue());
    await page.locator('#details-rider_is').selectOption('self');
    await page.locator('#details-assistance').selectOption('door');
    await page.locator('#careIntake-dob').fill('1950-03-02');
    await page.locator('#contactFirstName').fill('Pat');
    await page.locator('#contactLastName').fill('Tester');
    await page.locator('#contactPhone').fill('7045550142');
    await page.locator('#contactEmail').fill(email);
    await page.waitForTimeout(3_200); // the form discards a submit that arrives under 3 seconds after it rendered
    await page.locator('form button[type=submit]').tap();

    await expect(page.getByRole('heading', { name: 'Request received' })).toBeVisible();
    await expect(page.getByTestId('price-pending')).toContainText(PRICE_PENDING_MESSAGE);
    expect(((await rowFor(request, email))!).mobility).toBe('wheelchair');
  });
});
