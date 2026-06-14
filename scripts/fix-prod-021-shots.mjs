import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = 'docs/FIX_PROD_021_SHOTS';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOT_BASE || 'http://localhost:3000';
const VPS = [['375', 375, 812], ['768', 768, 1024], ['1440', 1440, 900]];
const PAGES = ['school', 'nemt', 'vip', 'winnie', 'recover', 'renew'];
const browser = await chromium.launch();
for (const slug of PAGES) {
  for (const [vp, w, h] of VPS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/${slug}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${slug}_${vp}.png`, fullPage: true });
    await ctx.close();
  }
}
// Footer band (bottom of homepage) at 1440
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1000);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/footer_1440.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
console.log('shots written to', OUT);
