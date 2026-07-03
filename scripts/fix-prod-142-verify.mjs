// FIX_PROD_142 (SECURITY) verification — asserts the marketing site exposes NO
// public link to the SaaS login surface and no "Existing facility" text.
// Checks ALL anchors in the DOM (visible or not — a hidden crawlable link is still
// an exposure), including the opened mobile nav. Runs against `next start` on :3000.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = 'test-results/fix_prod_142';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [['375', 375, 812], ['768', 768, 1024], ['1440', 1440, 900]];
const failures = [];

const browser = await chromium.launch();
for (const [vp, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });

  // Open the mobile disclosure so its links are in the DOM tree we inspect.
  const summary = page.locator('summary[aria-label="Open navigation menu"]');
  if (await summary.count()) {
    await summary.click().catch(() => {});
    await page.waitForTimeout(150);
  }

  const hrefs = await page.$$eval('a[href]', (els) => els.map((e) => e.getAttribute('href')));
  const loginLinks = hrefs.filter((x) => x && /\/login(\?|#|$)/.test(x));
  const facilityLoginLinks = hrefs.filter((x) => x && /intent=facility/.test(x));
  const adminLinks = hrefs.filter((x) => x && /\/admin\/login/.test(x));
  if (loginLinks.length) failures.push(`[${vp}] SaaS /login href present: ${JSON.stringify(loginLinks)}`);
  if (facilityLoginLinks.length) failures.push(`[${vp}] facility-login href present: ${JSON.stringify(facilityLoginLinks)}`);
  if (adminLinks.length) failures.push(`[${vp}] /admin/login href present: ${JSON.stringify(adminLinks)}`);

  const bodyText = await page.locator('body').innerText();
  if (/existing facility/i.test(bodyText)) failures.push(`[${vp}] "Existing facility" text present in DOM`);

  await page.screenshot({ path: `${OUT}/home-${vp}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();

if (failures.length) {
  console.log('FAIL:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('PASS · 0 SaaS-login links · 0 facility-login links · 0 "Existing facility" text · 375/768/1440');
