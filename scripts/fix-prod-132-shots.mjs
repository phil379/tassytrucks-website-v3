import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "test-results/fix_prod_132_service_icons";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOT_BASE || "http://localhost:3132";
const VPS = [["375", 375, 812], ["768", 768, 1024], ["1440", 1440, 900]];
const b = await chromium.launch();
for (const [vn, w, h] of VPS) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${BASE}/#services`, { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(1000);
  // Services grid: scroll to it
  const svc = await p.$("#services");
  if (svc) await svc.scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/services_${vn}.png`, fullPage: false });
  await p.close();
}
await b.close();
console.log("shots done");
