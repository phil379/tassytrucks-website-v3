import { test, expect, type Page } from '@playwright/test';

/**
 * The breed field on a Winnie Ride request, at phone width.
 *
 * The bug: it was a native <datalist>. On a phone a staff user chose Dog, typed "F",
 * and was never offered French Bulldog, because the suggestion UI belongs to the
 * browser and is not reliable on mobile. The field is now BreedCombobox, whose list is
 * ordinary page markup, so these tests can see it, tap it and drive it from the keyboard.
 *
 * 390px wide with touch, because that is where it broke.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function chooseDog(page: Page) {
  await page.goto('/request?service=pet');
  await page.locator('#details-species').selectOption('dog');
  const breed = page.locator('#details-breed');
  await breed.scrollIntoViewIfNeeded();
  return breed;
}

test('typing "F" after choosing Dog offers French Bulldog, and tapping it fills the field', async ({ page }) => {
  const breed = await chooseDog(page);
  await breed.tap();
  await breed.pressSequentially('F');

  const list = page.getByRole('listbox', { name: 'Breed suggestions' });
  await expect(list).toBeVisible();
  const option = list.getByRole('option', { name: 'French Bulldog', exact: true });
  await expect(option).toBeVisible();
  await option.tap();

  await expect(breed).toHaveValue('French Bulldog');
  await expect(list).toBeHidden();
  // The submitted value is the plain text, under the same field name as before.
  await expect(breed).toHaveAttribute('name', 'details-breed');
});

test('the options sit under the field, inside the phone screen, and are big enough to tap', async ({ page }) => {
  const breed = await chooseDog(page);
  await breed.tap();
  await breed.pressSequentially('F');
  const first = page.getByRole('listbox').getByRole('option').first();
  await expect(first).toBeVisible();
  const input = (await breed.boundingBox())!;
  const row = (await first.boundingBox())!;
  expect(row.y).toBeGreaterThanOrEqual(input.y + input.height - 1);
  expect(row.x + row.width).toBeLessThanOrEqual(390);
  expect(row.height).toBeGreaterThanOrEqual(40);
});

test('"bull" finds French Bulldog: it matches the start of any word, not just the first', async ({ page }) => {
  const breed = await chooseDog(page);
  await breed.pressSequentially('bull');
  const list = page.getByRole('listbox');
  await expect(list.getByRole('option', { name: 'French Bulldog', exact: true })).toBeVisible();
  await expect(list.getByRole('option', { name: 'Bulldog', exact: true })).toBeVisible();
  // Names that start with "bull" come first.
  await expect(page.getByRole('listbox').getByRole('option').first()).toHaveText(/^Bull/);
});

test('arrow keys move through the options, Enter picks, Escape closes and keeps the typed text', async ({ page }) => {
  const breed = await chooseDog(page);
  await breed.pressSequentially('french');

  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  await expect(breed).toHaveAttribute('aria-expanded', 'true');

  await breed.press('ArrowDown');
  const first = page.getByRole('listbox').getByRole('option').first();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(breed).toHaveAttribute('aria-activedescendant', (await first.getAttribute('id'))!);

  await breed.press('ArrowDown');
  await expect(page.getByRole('listbox').getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await breed.press('ArrowUp');
  await expect(first).toHaveAttribute('aria-selected', 'true');

  await breed.press('Escape');
  await expect(list).toBeHidden();
  await expect(breed).toHaveValue('french');
  await expect(breed).toHaveAttribute('aria-expanded', 'false');

  // ArrowDown reopens it; Enter picks the highlighted breed.
  await breed.press('ArrowDown');
  await expect(list).toBeVisible();
  const picked = (await page.getByRole('listbox').getByRole('option').first().textContent())!;
  await breed.press('Enter');
  await expect(breed).toHaveValue(picked);
  await expect(list).toBeHidden();
});

test('a breed that is not on the list is accepted as typed', async ({ page }) => {
  const breed = await chooseDog(page);
  await breed.pressSequentially('Zzyzx Hound');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(breed).toHaveValue('Zzyzx Hound');
  // Picking something and then editing it is plain text again, not a locked choice.
  await breed.fill('');
  await breed.pressSequentially('French');
  await page.getByRole('option', { name: 'French Bulldog', exact: true }).tap();
  await breed.press('End');
  await breed.pressSequentially(' mix');
  await expect(breed).toHaveValue('French Bulldog mix');
});

test('the suggestions follow the species, and Other has none', async ({ page }) => {
  const breed = await chooseDog(page);
  await breed.pressSequentially('Siam');
  await expect(page.getByRole('listbox')).toBeHidden(); // a cat breed, not offered for a dog

  await page.locator('#details-species').selectOption('cat');
  await breed.fill('');
  await breed.pressSequentially('Siam');
  await expect(page.getByRole('option', { name: 'Siamese', exact: true })).toBeVisible();

  await page.locator('#details-species').selectOption('other');
  await breed.fill('');
  await breed.pressSequentially('F');
  await expect(page.getByRole('listbox')).toBeHidden();
});

test('no native datalist is left on the page', async ({ page }) => {
  const breed = await chooseDog(page);
  await expect(breed).not.toHaveAttribute('list', /.+/);
  await expect(page.locator('datalist')).toHaveCount(0);
});
