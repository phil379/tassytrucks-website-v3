import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "test-results/fix_prod_131_home_polish";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOT_BASE || "http://localhost:3131";
const VPS = [["375", 375, 812], ["768", 768, 1024], ["1440", 1440, 900]];
const b = await chromium.launch();
for (const [vn, w, h] of VPS) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/home_${vn}.png`, fullPage: true });
  // hero-only crop for nav/hero inspection
  await p.screenshot({ path: `${OUT}/hero_${vn}.png`, fullPage: false });
  await p.close();
}
await b.close();
console.log("shots done");
