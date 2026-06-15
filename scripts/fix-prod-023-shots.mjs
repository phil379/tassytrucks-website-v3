import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = 'docs/FIX_PROD_023_SCREENSHOTS';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOT_BASE || 'http://localhost:3000';
const VPS = [['375', 375, 812], ['768', 768, 1024], ['1440', 1440, 900]];
const SURFACES = ['/', '/school', '/nemt', '/vip', '/winnie', '/recover', '/renew'];
const b = await chromium.launch();
for (const path of SURFACES) {
  for (const [name, w, h] of VPS) {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    const p = await c.newPage();
    await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await p.screenshot({ path: `${OUT}/${path === '/' ? 'home' : path.slice(1)}_${name}.png`, fullPage: true });
    await c.close();
  }
}
await b.close();
console.log('shots written to', OUT);
