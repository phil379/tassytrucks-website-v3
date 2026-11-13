import type { Page } from '@playwright/test';

/**
 * Fills the booking form's date and time from one "YYYY-MM-DDTHH:mm" value.
 * The form shows two fields (a typed MM/DD/YYYY date and a 15-minute time list) and posts them
 * as one value; see components/request/DateTimeField.tsx. The date is filled the way a rider
 * types it. Minutes are rounded down to the quarter hour.
 */
export async function fillWhen(page: Page, value: string, field = 'requestedAt') {
  const [date, time = '10:00'] = value.split('T');
  const [h = '10', m = '00'] = time.split(':');
  const quarter = String(Math.floor(Number(m) / 15) * 15).padStart(2, '0');
  const [y, mo, d] = date!.split('-');
  await page.locator(`#${field}`).fill(`${mo}/${d}/${y}`);
  await page.locator(`#${field}-time`).selectOption(`${h}:${quarter}`);
}
