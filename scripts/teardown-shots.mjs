// MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN — Agent F visual verification.
// Runs against a local `next start` on :3000. Captures representative routes at
// 375 / 768 / 1440, plus the new mobile-nav open state, plus the branded 404.
// Usage: node scripts/teardown-shots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = 'artifacts/teardown';
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['home', '/'],
  ['nemt', '/nemt'],
  ['winnie', '/winnie'],
  ['pricing', '/pricing'],
  ['charlotte-pet', '/charlotte/pet-transport'],
  ['compare-health', '/compare/tassy-vs-uber-health-vs-lyft-healthcare'],
  ['partners', '/partners'],
  ['notfound', '/this-route-does-not-exist'],
];
const VIEWPORTS = [
  ['375', 375, 812],
  ['768', 768, 1024],
  ['1440', 1440, 900],
];

const consoleErrors = [];

const browser = await chromium.launch();
for (const [vp, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${vp}] ${page.url()} :: ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`[${vp}] PAGEERROR ${page.url()} :: ${e.message}`));

  for (const [name, path] of ROUTES) {
    const status = name === 'notfound' ? 404 : 200;
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'load', timeout: 20000 });
      const got = resp?.status();
      if (name !== 'notfound' && got !== status) {
        consoleErrors.push(`[${vp}] BAD STATUS ${path} → ${got}`);
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}-${vp}.png`, fullPage: true });
    } catch (e) {
      consoleErrors.push(`[${vp}] NAV FAIL ${path} :: ${e.message.split('\n')[0]}`);
    }
  }

  // Mobile-nav open state — only meaningful below lg (375 + 768).
  if (vp !== '1440') {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
    const summary = page.locator('summary[aria-label="Open navigation menu"]');
    if (await summary.count()) {
      await summary.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/home-mobilenav-open-${vp}.png`, fullPage: false });
    } else {
      consoleErrors.push(`[${vp}] mobile-nav summary NOT FOUND`);
    }
  }

  await ctx.close();
}
await browser.close();

if (consoleErrors.length) {
  console.log('=== CONSOLE / STATUS ISSUES ===');
  for (const e of consoleErrors) console.log(e);
} else {
  console.log('=== 0 console errors · 0 bad statuses across all routes/viewports ===');
}
console.log(`Screenshots → ${OUT}/`);
