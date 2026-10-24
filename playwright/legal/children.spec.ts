import { test, expect, type Page } from '@playwright/test';

/**
 * A parent or guardian must confirm they are one before any child detail is collected, the
 * form says what is collected and why, and no form is aimed at a child.
 */

async function toChildStep(page: Page) {
  await page.goto('/school/book/full-year');
  await page.getByTestId('school-gate-continue').click();
  await page.locator('#parentFirst').fill('Dana');
  await page.locator('#parentLast').fill('Reed');
  await page.locator('#parentEmail').fill('dana@example.com');
  await page.locator('#parentPhone').fill('704-555-0188');
  await page.locator('input[name="home_address"]').fill('1200 Elizabeth Ave, Charlotte NC');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your child' })).toBeVisible();
}

test('Scholar wizard: guardian box is unticked, explained, and Continue stays off until it is ticked', async ({ page }) => {
  await toChildStep(page);

  const notice = page.getByTestId('child-data-notice');
  await expect(notice).toContainText('What we ask for, and why');
  await expect(notice).toContainText('A parent or guardian fills this in');

  const box = page.getByTestId('guardian-confirm');
  await expect(box).not.toBeChecked();
  await expect(page.getByText('I am the parent or legal guardian and I agree to Tassy using this information')).toBeVisible();

  // Fill everything else; Continue must still be blocked.
  await page.locator('#childFirst').fill('Sam');
  await page.locator('#childLast').fill('Reed');
  await page.getByRole('combobox', { name: /^School \(required\)$/ }).fill('Elizabeth Traditional');
  await page.locator('input[name="school_address"]').fill('1200 Lamar Ave, Charlotte NC');
  await page.locator('#ecName').fill('Alex Reed');
  await page.locator('#ecPhone').fill('704-555-0199');
  const next = page.getByRole('button', { name: 'Continue' });
  await expect(next).toBeDisabled();
  await box.check();
  await expect(next).toBeEnabled();
});

test('/request Scholar: the guardian question is required and says what it agrees to', async ({ page }) => {
  await page.goto('/request?service=scholar');
  const q = page.locator('#details-guardian_confirmed');
  await expect(q).toBeVisible();
  await expect(q).toHaveValue('');
  await expect(page.getByText('we never ask a student to', { exact: false })).toBeVisible();
});

test('household request: guardian wording, Privacy and Terms links, health-info warning', async ({ page }) => {
  await page.goto('/school/household-request');
  await expect(page.locator('label[for="hh-consent"]')).toContainText('parent or legal guardian');
  await expect(page.locator('#hh-consent')).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  await expect(page.getByText('Please do not include medical details, diagnoses or school records.')).toBeVisible();
});

test('no form on the Scholar pages asks for a child\'s own email, phone or login', async ({ page }) => {
  await toChildStep(page);
  const names = await page.locator('input, textarea, select').evaluateAll((els) =>
    els.map((e) => `${(e as HTMLInputElement).name} ${e.id}`.toLowerCase()),
  );
  for (const n of names) {
    expect(n, `unexpected child-contact field: ${n}`).not.toMatch(/child.*(email|phone|password|username)/);
  }
});
