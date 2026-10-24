import { test, expect } from '@playwright/test';

test('footer on every page links to the data request page', async ({ page }) => {
  for (const path of ['/', '/pricing', '/privacy']) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: /Do not sell or share my info/ })).toHaveAttribute('href', '/privacy/request');
  }
});

test('the form explains identity checks and shows field errors tied to their fields', async ({ page }) => {
  await page.goto('/privacy/request');
  await expect(page.getByText('check that you are the person the information is about').first()).toBeVisible();
  await page.waitForTimeout(3300); // the server rejects forms filled faster than a person can
  await page.getByRole('button', { name: 'Send request' }).click();
  const name = page.locator('#pr-name');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAttribute('aria-describedby', 'pr-name-error');
  await expect(page.locator('#pr-name-error')).toBeVisible();
  await expect(page.locator('#pr-type')).toHaveAttribute('aria-describedby', 'pr-requestType-error');
});

test('a successful request shows the reference number and the promise, and deletes nothing', async ({ page }) => {
  await page.route('**/api/privacy-request', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reference: 'PR-TEST2345', responseDays: 30, receiptEmailed: true }) }),
  );
  await page.goto('/privacy/request');
  await page.locator('#pr-name').fill('Dana Reed');
  await page.locator('#pr-email').fill('dana@example.test');
  await page.locator('#pr-type').selectOption('delete');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByTestId('privacy-reference')).toHaveText('PR-TEST2345');
  await expect(page.getByTestId('privacy-request-done')).toContainText('within 30 days');
  await expect(page.getByTestId('privacy-request-done')).toContainText('Nothing has been changed or deleted yet');
});

test('a null reference from the server (the bot filter) is not shown as success', async ({ page }) => {
  await page.route('**/api/privacy-request', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reference: null }) }),
  );
  await page.goto('/privacy/request');
  await page.locator('#pr-name').fill('Dana Reed');
  await page.locator('#pr-email').fill('dana@example.test');
  await page.locator('#pr-type').selectOption('access');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('could not send');
  await expect(page.getByTestId('privacy-request-done')).toHaveCount(0);
});
