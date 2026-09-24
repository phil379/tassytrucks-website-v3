import { test, expect } from '@playwright/test';
import {
  PASSENGER_MOBILITY_OPTIONS,
  PET_MOBILITY_OPTIONS,
  defaultMobilityFor,
  mobilityLabel,
  mobilityLabelFor,
  mobilityOptionsFor,
  passengerLabelFor,
  tripRequestSchema,
} from '../../lib/trip-request';

/**
 * Three changes to the request form: address autocomplete, split name fields,
 * and a mobility question that matches who is actually travelling.
 */

// ── The mobility question belongs to the passenger ───────────────────────────

test.describe('mobility options follow the service line', () => {
  test('a pet transport never offers a walker or a cane', () => {
    const values = mobilityOptionsFor('pet').map((m) => m.value as string);
    expect(values).not.toContain('walker');
    expect(values).not.toContain('wheelchair');
    expect(values).not.toContain('ambulatory');
    expect(values).toContain('pet_carrier');
  });

  test('a medical transport never offers a pet carrier', () => {
    for (const line of ['care', 'recovery', 'wellness', 'scholar']) {
      const values = mobilityOptionsFor(line).map((m) => m.value as string);
      expect(values, `${line} offers no pet options`).not.toContain('pet_carrier');
      expect(values, `${line} offers no pet options`).not.toContain('pet_leash');
      expect(values, `${line} offers ambulatory`).toContain('ambulatory');
    }
  });

  test('the question itself changes, not just the options', () => {
    expect(mobilityLabelFor('pet')).toBe('How does your pet travel?');
    expect(mobilityLabelFor('care')).toBe('Mobility');
    expect(passengerLabelFor('pet')).toBe('Pets');
    expect(passengerLabelFor('care')).toBe('Passengers');
  });

  test('each line defaults to an option that line actually offers', () => {
    for (const line of ['care', 'recovery', 'wellness', 'pet', 'scholar']) {
      const values = mobilityOptionsFor(line).map((m) => m.value as string);
      expect(values, `${line} default is in its own list`).toContain(defaultMobilityFor(line));
    }
  });

  test('"other" is the escape hatch in both lists', () => {
    expect(PASSENGER_MOBILITY_OPTIONS.map((m) => m.value as string)).toContain('other');
    expect(PET_MOBILITY_OPTIONS.map((m) => m.value as string)).toContain('other');
  });

  test('every stored value resolves to a readable label for /ops', () => {
    expect(mobilityLabel('pet_carrier')).toBe('Travels in a carrier or crate');
    expect(mobilityLabel('wheelchair')).toBe('Wheelchair');
    expect(mobilityLabel(null)).toBe('—');
    // An unknown legacy value renders as itself rather than blanking the row.
    expect(mobilityLabel('legacy_value')).toBe('legacy_value');
  });
});

// ── The server enforces it too ───────────────────────────────────────────────

const base = {
  pickupAddress: '100 Test Ave, Charlotte, NC',
  dropoffAddress: '200 Sample Blvd, Charlotte, NC',
  requestedAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
  returnTrip: false,
  passengers: 1,
  contactFirstName: 'Maria',
  contactLastName: 'Santos',
  contactPhone: '704-555-0142',
  preferredContact: 'phone',
};

test.describe('a hand-crafted POST cannot mismatch the passenger', () => {
  test('pet + wheelchair is rejected', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      serviceLine: 'pet',
      mobility: 'wheelchair',
    });
    expect(result.success, 'a dog does not use a wheelchair').toBe(false);
  });

  test('care + pet_carrier is rejected', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      serviceLine: 'care',
      mobility: 'pet_carrier',
    });
    expect(result.success).toBe(false);
  });

  test('the matching pairs are accepted', () => {
    for (const [serviceLine, mobility] of [
      ['pet', 'pet_carrier'],
      ['pet', 'other'],
      ['care', 'wheelchair'],
      ['care', 'other'],
    ] as const) {
      const result = tripRequestSchema.safeParse({ ...base, serviceLine, mobility });
      expect(result.success, `${serviceLine} + ${mobility}`).toBe(true);
    }
  });
});

// ── Names ────────────────────────────────────────────────────────────────────

test.describe('first and last name', () => {
  test('both are required', () => {
    expect(tripRequestSchema.safeParse({ ...base, serviceLine: 'care', contactLastName: '' }).success).toBe(false);
    expect(tripRequestSchema.safeParse({ ...base, serviceLine: 'care', contactFirstName: '' }).success).toBe(false);
  });

  test('a legacy single contactName is still accepted and split', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      serviceLine: 'care',
      contactFirstName: undefined,
      contactLastName: undefined,
      contactName: 'Maria Santos Garcia',
    });
    expect(result.success, 'the old API shape still works').toBe(true);
    if (result.success) {
      expect(result.data.contactFirstName).toBe('Maria');
      // Everything after the first space, so a compound surname survives.
      expect(result.data.contactLastName).toBe('Santos Garcia');
    }
  });

  test('a legacy one-word name fails rather than duplicating itself', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      serviceLine: 'care',
      contactFirstName: undefined,
      contactLastName: undefined,
      contactName: 'Cher',
    });
    expect(result.success, 'no surname is a missing surname, not "Cher Cher"').toBe(false);
  });
});

// ── Coordinates ──────────────────────────────────────────────────────────────

test.describe('resolved place data', () => {
  test('a request with no coordinates is still valid', () => {
    const result = tripRequestSchema.safeParse({ ...base, serviceLine: 'care' });
    expect(result.success, 'a typed address is a real request').toBe(true);
  });

  test('null coordinates do not become the equator', () => {
    // z.coerce.number() turns null into 0. A pickup at 0,0 is in the Atlantic.
    const result = tripRequestSchema.safeParse({
      ...base,
      serviceLine: 'care',
      pickupLat: null,
      pickupLng: null,
      pickupPlaceId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pickupLat ?? undefined).toBeUndefined();
      expect(result.data.pickupLng ?? undefined).toBeUndefined();
    }
  });

  test('empty strings from an untouched hidden input are treated as absent', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      serviceLine: 'care',
      pickupLat: '',
      pickupLng: '',
      pickupPlaceId: '',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pickupLat ?? undefined).toBeUndefined();
  });

  test('real coordinates come through as numbers', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      serviceLine: 'care',
      pickupLat: '35.2271',
      pickupLng: '-80.8431',
      pickupPlaceId: 'ChIJgRo4_MQfVIgRZNFDv-ZQRog',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pickupLat).toBeCloseTo(35.2271, 4);
      expect(result.data.pickupLng).toBeCloseTo(-80.8431, 4);
    }
  });

  test('a nonsense coordinate is rejected', () => {
    expect(
      tripRequestSchema.safeParse({ ...base, serviceLine: 'care', pickupLat: '999' }).success,
    ).toBe(false);
  });
});

// ── The form in a browser ────────────────────────────────────────────────────

test.describe('the rendered form', () => {
  test('switching to Winnie Ride swaps the whole question', async ({ page }) => {
    await page.goto('/request?service=care');

    await expect(page.locator('label[for="mobility"]')).toHaveText(/Mobility/);
    await expect(page.locator('#mobility option[value="walker"]')).toHaveCount(1);

    await page.locator('#serviceLine').selectOption('pet');

    await expect(page.locator('label[for="mobility"]')).toHaveText(/How does your pet travel\?/);
    await expect(page.locator('#mobility option[value="walker"]')).toHaveCount(0);
    await expect(page.locator('#mobility option[value="pet_carrier"]')).toHaveCount(1);
    await expect(page.locator('label[for="passengers"]')).toHaveText(/Pets/);
  });

  test('switching back restores the passenger question', async ({ page }) => {
    await page.goto('/request?service=pet');
    await expect(page.locator('#mobility option[value="pet_carrier"]')).toHaveCount(1);

    await page.locator('#serviceLine').selectOption('care');
    await expect(page.locator('#mobility option[value="pet_carrier"]')).toHaveCount(0);
    await expect(page.locator('#mobility option[value="wheelchair"]')).toHaveCount(1);
  });

  test('the wheelchair landing page deep-link preselects wheelchair', async ({ page }) => {
    // /charlotte/wheelchair-transport sends mobility=wheelchair. Before this the
    // form ignored it and defaulted to "walks unaided" — the page promised a
    // preselection it never made.
    await page.goto('/request?service=care&mobility=wheelchair');
    await expect(page.locator('#mobility')).toHaveValue('wheelchair');
  });

  test('a bogus ?mobility= falls back instead of breaking the select', async ({ page }) => {
    await page.goto('/request?service=care&mobility=teleportation');
    await expect(page.locator('#mobility')).toHaveValue('ambulatory');
  });

  test('the address fields work as plain text inputs with no API key', async ({ page }) => {
    // The suite runs without GOOGLE_MAPS_API_KEY, which is the exact state a
    // visitor hits if the key is missing, Google is down, or an ad blocker eats
    // the script. The field must still accept an address and submit.
    await page.goto('/request');

    const pickup = page.locator('#pickupAddress');
    await expect(pickup).toBeVisible();
    await pickup.fill('2513 Pruitt St, Charlotte NC');
    await expect(pickup).toHaveValue('2513 Pruitt St, Charlotte NC');

    // No suggestion was picked, so nothing claims to be resolved.
    await expect(page.locator('input[name="pickupAddressPlaceId"]')).toHaveValue('');
    await expect(page.locator('input[name="pickupAddressLat"]')).toHaveValue('');
  });

  test('the address field is a labelled combobox', async ({ page }) => {
    await page.goto('/request');
    const pickup = page.locator('#pickupAddress');
    await expect(pickup).toHaveAttribute('role', 'combobox');
    await expect(pickup).toHaveAttribute('aria-expanded', 'false');
    await expect(pickup).toHaveAttribute('aria-autocomplete', 'list');
    await expect(page.locator('label[for="pickupAddress"]')).toContainText('Pickup address');
  });

  test('first and last name are separate, labelled, and thumb-sized', async ({ page }) => {
    await page.goto('/request');
    for (const id of ['contactFirstName', 'contactLastName']) {
      await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
      const box = await page.locator(`#${id}`).boundingBox();
      expect(box!.height, `${id} is at least 44px tall`).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('#contactFirstName')).toHaveAttribute('autocomplete', 'given-name');
    await expect(page.locator('#contactLastName')).toHaveAttribute('autocomplete', 'family-name');
    // The old single field is gone.
    await expect(page.locator('#contactName')).toHaveCount(0);
  });
});

// ── Operator diagnostic ──────────────────────────────────────────────────────

test.describe('?debug_maps=1 explains why suggestions are off', () => {
  test('a customer is never told anything is wrong', async ({ page }) => {
    await page.goto('/request');
    await expect(page.getByTestId('pickupAddress-maps-status')).toHaveCount(0);
  });

  test('the operator gets the actual reason', async ({ page }) => {
    // CI runs without GOOGLE_MAPS_API_KEY, which is also the state production
    // was in when Phil reported no suggestions.
    await page.goto('/request?debug_maps=1');
    await expect(page.getByTestId('pickupAddress-maps-status')).toContainText(
      'GOOGLE_MAPS_API_KEY is not set',
    );
    await expect(page.getByTestId('dropoffAddress-maps-status')).toBeVisible();
  });

  test('the field still works while the diagnostic is showing', async ({ page }) => {
    await page.goto('/request?debug_maps=1');
    await page.locator('#pickupAddress').fill('3106 Aransas Rd, Charlotte NC');
    await expect(page.locator('#pickupAddress')).toHaveValue('3106 Aransas Rd, Charlotte NC');
  });
});
