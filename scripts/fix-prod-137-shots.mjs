import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "test-results/fix_prod_137_logo";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOT_BASE || "http://localhost:3137";
const VPS = [["375", 375, 812], ["768", 768, 1024], ["1440", 1440, 900]];
const b = await chromium.launch();
for (const [vn, w, h] of VPS) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(900);
  // header crop (top 120px)
  await p.screenshot({ path: `${OUT}/header_${vn}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(120, h) } });
  await p.close();
}
// founder tile comparison (desktop, scroll to #founder)
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`${BASE}/#founder`, { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(1200);
const f = await p.$("#founder");
if (f) await f.scrollIntoViewIfNeeded();
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/founder_compare_1440.png`, fullPage: false });
await p.close();
await b.close();
console.log("shots done");
