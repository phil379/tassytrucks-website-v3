import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'seo-2026-06-11');

type PageSpec = {
  path: string;
  h1: string; // lowercase fragment that must appear in the h1
  cta: string[]; // substrings that must all appear in the primary CTA href
  winnie?: boolean; // paw icon + vaccine/liability checks
  table?: boolean; // comparison table + published date checks
};

const PAGES: PageSpec[] = [
  // MEGA_SEO_001
  { path: '/partners', h1: 'partner with tassy trucks', cta: ['facility/intake', 'source=partners-page'] },
  { path: '/charlotte/nemt-rides', h1: 'nemt in charlotte', cta: ['book/nemt', 'source=seo-nemt'] },
  { path: '/charlotte/dialysis-transport', h1: 'dialysis transport in charlotte', cta: ['book/nemt', 'source=seo-dialysis', 'recurring=1'] },
  { path: '/charlotte/post-surgery-transport', h1: 'post-surgery transport in charlotte', cta: ['book/vip', 'source=seo-postop', 'tier=recovery'] },
  { path: '/charlotte/wheelchair-transport', h1: 'wheelchair transport in charlotte', cta: ['book/nemt', 'source=seo-wc', 'mobility=wheelchair'] },
  { path: '/charlotte/veteran-transport', h1: 'veteran medical transport in charlotte', cta: ['book/nemt', 'source=seo-veteran', 'payer=va'] },
  { path: '/charlotte/concierge-medical-transport', h1: 'concierge medical transport in charlotte', cta: ['book/vip', 'source=seo-concierge'] },
  { path: '/charlotte/best-nemt-providers', h1: 'best nemt providers in charlotte', cta: ['book/nemt', 'source=seo-best'] },
  { path: '/charlotte/family-medical-rides', h1: 'book a medical ride for someone else', cta: ['book/nemt', 'source=seo-family'] },
  { path: '/compare/tassy-vs-uber-health-vs-lyft-healthcare', h1: 'uber health', cta: ['book/nemt', 'source=seo-compare'], table: true },
  // MEGA_SEO_002
  { path: '/partners/veterinary', h1: 'partner with winnie ride', cta: ['facility/intake', 'source=vet-partners', 'type=veterinary'], winnie: true },
  { path: '/charlotte/pet-transport', h1: 'pet transport in charlotte', cta: ['book/winnie', 'source=seo-pet'], winnie: true },
  { path: '/charlotte/vet-appointment-rides', h1: 'rides to the vet in charlotte', cta: ['book/winnie', 'source=seo-vet', 'purpose=vet'], winnie: true },
  { path: '/charlotte/post-surgery-pet-transport', h1: 'post-surgery pet transport in charlotte', cta: ['book/winnie', 'source=seo-postop', 'sedated=1'], winnie: true },
  { path: '/charlotte/pet-boarding-transport', h1: 'pet boarding', cta: ['book/winnie', 'source=seo-boarding'], winnie: true },
  { path: '/charlotte/calm-pet-transport', h1: 'calm pet transport in charlotte', cta: ['book/winnie', 'source=seo-calm', 'temperament=anxious'], winnie: true },
  { path: '/charlotte/dog-grooming-pickup', h1: 'dog grooming pickup service in charlotte', cta: ['book/winnie', 'source=seo-grooming'], winnie: true },
  { path: '/compare/winnie-vs-uber-pet-vs-lyft-pet', h1: 'uber pet', cta: ['book/winnie', 'source=seo-compare-pet'], winnie: true, table: true },
];

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

for (const spec of PAGES) {
  const slug = spec.path.split('/').filter(Boolean).join('--');

  test.describe(spec.path, () => {
    test('desktop checks', async ({ page }) => {
      const res = await page.goto(spec.path);
      expect(res?.status(), 'status 200').toBe(200);

      // H1 contains primary keyword
      const h1 = await page.locator('h1').first().textContent();
      expect(h1?.toLowerCase().replace(/\s+/g, ' ')).toContain(spec.h1);

      // Meta description exists, <=160 chars
      const desc = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(desc, 'meta description present').toBeTruthy();
      expect(desc!.length).toBeLessThanOrEqual(160);

      // Canonical
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href');
      expect(canonical, 'canonical present').toBeTruthy();
      expect(canonical).toContain(spec.path);

      // JSON-LD: Service + FAQPage somewhere on the page
      const ld = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      const joined = ld.join(' ');
      expect(joined).toContain('"Service"');
      expect(joined).toContain('"FAQPage"');

      // Phone visible in DOM
      await expect(page.getByText('(704) 941-8508').first()).toBeVisible();

      // Primary CTA href
      const href = await page
        .locator('[data-testid="primary-cta"]')
        .getAttribute('href');
      expect(href).toContain('https://tassytrucksops.vercel.app');
      for (const fragment of spec.cta) {
        expect(href, `CTA contains ${fragment}`).toContain(fragment);
      }

      if (spec.winnie) {
        // Paw icon present
        expect(
          await page.locator('[data-testid="paw-icon"]').count(),
        ).toBeGreaterThan(0);
        // Differentiator language present
        const body = (await page.locator('body').textContent())?.toLowerCase() ?? '';
        expect(/vaccine|liability/.test(body), 'mentions vaccine or liability').toBe(true);
      }

      if (spec.table) {
        const table = page.locator('[data-testid="comparison-table"] tbody tr');
        expect(await table.count(), 'comparison table has 3+ rows').toBeGreaterThanOrEqual(3);
        await expect(page.getByText('Published June 11, 2026')).toBeVisible();
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${slug}--desktop.png`),
        fullPage: false,
      });
    });

    test('mobile 375px: no overflow, CTA reachable', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(spec.path);

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(scrollWidth, 'no horizontal overflow').toBeLessThanOrEqual(375);

      await expect(
        page.locator('[data-testid="primary-cta"]'),
      ).toHaveCount(1);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${slug}--mobile.png`),
        fullPage: false,
      });
    });
  });
}

test('sitemap.xml includes all 18 new routes', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const spec of PAGES) {
    expect(xml, `sitemap has ${spec.path}`).toContain(
      `https://www.tassytrucks.com${spec.path}`,
    );
  }
});

test('robots.txt allows all and points to sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toContain('Allow: /');
  expect(txt).toContain('sitemap.xml');
});

test('/winnie hub links to all 6 Charlotte Winnie pages', async ({ page }) => {
  await page.goto('/winnie');
  for (const target of [
    '/charlotte/pet-transport',
    '/charlotte/vet-appointment-rides',
    '/charlotte/post-surgery-pet-transport',
    '/charlotte/calm-pet-transport',
    '/charlotte/dog-grooming-pickup',
    '/charlotte/pet-boarding-transport',
  ]) {
    expect(
      await page.locator(`a[href="${target}"]`).count(),
      `/winnie links to ${target}`,
    ).toBeGreaterThan(0);
  }
});

test('OG image route renders', async ({ request }) => {
  const res = await request.get('/og-image/nemt-rides');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
});

test('internal links between new pages resolve (no 404)', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const spec of PAGES) {
    await page.goto(spec.path);
    const hrefs = await page
      .locator('main a[href^="/"]')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!));
    for (const href of hrefs) {
      const clean = href.split('#')[0];
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      const res = await request.get(clean);
      expect(res.status(), `${clean} (linked from ${spec.path})`).toBe(200);
    }
  }
});
