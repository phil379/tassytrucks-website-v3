import { test, expect, type APIRequestContext } from '@playwright/test';
import { hotelBySlug } from '../../lib/hotel-price';

/**
 * /airport?hotel=<slug>: ONE price, always.
 *
 * Found on 2026-11-01: the page printed the hotel price ($99) in the hero card AND, in the form
 * panel, the normal ladder's price for the same trip ($109, "about 8.1 miles") in the server HTML
 * and until the page hydrated. A guest must never see a second price, not even for a moment.
 * These tests sample the server HTML and then the live page from the first byte.
 *
 * Runs on the 3947 rig (playwright.config.ts): an in-memory Supabase on 3946.
 */
test.use({ baseURL: 'http://localhost:3947', viewport: { width: 390, height: 844 } });

const STUB_DB = 'http://127.0.0.1:3946';
const amounts = (text: string) =>
  [...text.replace(/\s+/g, ' ').matchAll(/\$\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0]);
const dollars = (cents: number) => `$${Math.round(cents / 100)}`;

test.describe('a hotel page shows one price', () => {
  for (const slug of ['jw', 'ac-southpark', 'sheraton-airport']) {
    test(`${slug}: the server HTML carries the hotel price and no other dollar amount`, async ({ request }) => {
      const html = await (await request.get(`/airport?hotel=${slug}`)).text();
      const visible = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
      const found = amounts(visible);
      expect(found.length, 'the hotel price is printed').toBeGreaterThan(0);
      expect(new Set(found).size, `only one distinct amount, saw ${JSON.stringify(found)}`).toBe(1);
    });

    test(`${slug}: from the first byte until the form settles, every amount on screen is the hotel price`, async ({ page }) => {
      await page.goto(`/airport?hotel=${slug}`, { waitUntil: 'commit' });
      const seen: string[][] = [];
      for (let i = 0; i < 40; i++) {
        const body = await page.evaluate(() => (document.body ? document.body.innerText : ''));
        seen.push(amounts(body));
        await page.waitForTimeout(100);
      }
      const hero = amounts(await page.getByTestId('hotel-flat-price').innerText());
      expect(hero.length).toBe(1);
      for (const sample of seen) {
        for (const a of sample) expect(a, `saw ${JSON.stringify(sample)}`).toBe(hero[0]);
      }
      // The form panel itself, once settled, shows the same price.
      await expect(page.locator('[data-testid=trip-estimate]')).toContainText(hero[0]!);
      await expect(page.getByTestId('hotel-price-pending')).toHaveCount(0);
    });
  }

  test('ticking a return trip shows the hotel round trip (double), never a ladder price', async ({ page }) => {
    await page.goto('/airport?hotel=jw');
    const hero = amounts(await page.getByTestId('hotel-flat-price').innerText())[0]!;
    const oneWay = Number(hero.slice(1));
    await expect(page.locator('[data-testid=trip-estimate]')).toContainText(hero);
    await page.locator('input[name=returnTrip]').check();
    await expect(page.locator('[data-testid=trip-estimate]')).toContainText(`$${oneWay * 2}`);
    const panel = amounts(await page.locator('[data-testid=trip-estimate]').innerText());
    expect(panel).toEqual([`$${oneWay * 2}`]);
  });
});

test.describe('a smoke-test hotel booking is test data', () => {
  type Row = Record<string, unknown>;
  async function rowFor(api: APIRequestContext, email: string): Promise<Row | undefined> {
    const rows = (await (await api.get(`${STUB_DB}/__rows/trip_requests`)).json()) as Row[];
    return rows.find((r) => r.contact_email === email);
  }
  const when = () => {
    const d = new Date(Date.now() + 3 * 86_400_000);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
  };
  async function book(api: APIRequestContext, email: string) {
    const jw = hotelBySlug('jw')!;
    const res = await api.post('/api/trip-request', {
      data: {
        serviceLine: 'concierge', mobility: 'ambulatory', returnTrip: false, passengers: 1,
        pickupAddress: jw.address, pickupPlaceId: jw.placeId, pickupLat: jw.lat, pickupLng: jw.lng,
        dropoffAddress: '5501 Josh Birmingham Pkwy, Charlotte, NC 28208', dropoffPlaceId: 'ChIJidRKt32YVogRN6fEPG9Kuho',
        dropoffLat: 35.2162994, dropoffLng: -80.9539428,
        requestedAt: when(), contactFirstName: 'Pat', contactLastName: 'Tester', contactPhone: '7045550142',
        contactEmail: email, preferredContact: 'phone', estimateShown: true, hp_token: '', elapsedMs: 20_000,
        tripDetails: { occasion: 'airport' },
      },
    });
    expect(res.status(), await res.text()).toBe(200);
  }

  test('a plus-tagged smoke-test address is stored as test data, a real guest address is not', async ({ request }) => {
    const smoke = `phil+smoke-hotel${Date.now()}@tassytrucks.com`;
    const guest = `guest${Date.now()}@hotel-guest.com`;
    await book(request, smoke);
    await book(request, guest);
    const a = (await rowFor(request, smoke))!;
    const b = (await rowFor(request, guest))!;
    expect(a.hotel_zone).toBe('uptown');
    expect(a.is_test_data, 'the smoke booking must not start the intro clock or count toward the cap').toBe(true);
    expect(b.is_test_data).toBe(false);
  });
});
