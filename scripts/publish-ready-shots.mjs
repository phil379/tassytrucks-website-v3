// MEGA_TASSY_PUBLISH_READY — 375/768/1440 shots of home + /pricing + /nemt.
// Usage: npx next start -p 4321 & node scripts/publish-ready-shots.mjs [outDir]
import { chromium } from '@playwright/test';
const OUT = process.argv[2] ?? 'docs/PUBLISH_READY_SHOTS';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const pages = [['home', '/'], ['pricing', '/pricing'], ['nemt', '/nemt']];
const browser = await chromium.launch();
for (const [name, path] of pages) {
  for (const w of [375, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto('http://localhost:4321' + path, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
    await page.close();
  }
}
await browser.close();
console.log('done →', OUT);
