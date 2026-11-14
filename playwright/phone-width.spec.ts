import { test, expect, devices, type Page } from '@playwright/test';

/**
 * Phone-width checks, run on every change (Phil, 2026-11-14: "so this never has to be checked by
 * hand again"). Two real phone sizes, touch on:
 *   iPhone 13  390 x 664 visible (Safari with its bars)
 *   Pixel 7    412 x 839 visible
 *
 *   1. Every sitemap page, every booking form and partner signup: no sideways scrolling, no tap
 *      target under 24 x 24 px (WCAG 2.2, 2.5.8; links inside a sentence are exempt), and no
 *      form field under 16px text (iOS zooms the whole page when one is tapped).
 *   2. First visit: the cookie banner is short, both buttons are 44px and on screen, it never
 *      covers the header's Request a Ride, and it stays gone after a choice.
 *   3. With the on-screen keyboard up (the visible area shrinks to about 340px on the iPhone and
 *      480px on the Pixel), every booking field can be scrolled to and tapped, uncovered, and
 *      the calendar fits the screen.
 */

// Playwright's iPhone profile asks for WebKit; CI installs Chromium only. Size and touch are kept.
const phone = (name: 'iPhone 13' | 'Pixel 7') => {
  const { defaultBrowserType: _ignored, ...d } = devices[name];
  return d;
};
const PHONES = [
  { label: 'iPhone 390px', device: phone('iPhone 13'), keyboardHeight: 340 },
  { label: 'Android 412px', device: phone('Pixel 7'), keyboardHeight: 480 },
] as const;

const SERVICES = ['care', 'recovery', 'concierge', 'scholar', 'winnie'] as const;
const EXTRA_PATHS = [...SERVICES.map((s) => `/request?service=${s}`), '/partners/signup'];

/** What a phone visitor would trip over on the current page. Empty means the page passes. */
async function phoneProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const W = window.innerWidth;
    const shown = (e: Element) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < W && s.visibility !== 'hidden' && !e.closest('[aria-hidden="true"], .sr-only');
    };
    const name = (e: Element) => {
      const el = e as HTMLElement & { value?: string };
      return `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''} "${(el.innerText || e.getAttribute('aria-label') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
    };
    const out: string[] = [];
    const over = document.documentElement.scrollWidth - W;
    if (over > 0) out.push(`scrolls sideways by ${over}px`);
    for (const e of document.querySelectorAll('a[href], button, [role="button"], summary, input:not([type="hidden"]), select, textarea')) {
      if (!shown(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width >= 24 && r.height >= 24) continue;
      // A link inside a sentence is exempt; a checkbox or radio is fine when its label is tall enough.
      const inSentence = getComputedStyle(e).display === 'inline' && [...(e.parentElement?.childNodes ?? [])].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 3);
      const input = e as HTMLInputElement;
      const labelled = (input.type === 'checkbox' || input.type === 'radio') && [...(input.labels ?? [])].some((l) => l.getBoundingClientRect().height >= 24);
      if (!inSentence && !labelled) out.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)}: ${name(e)}`);
    }
    for (const e of document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea')) {
      if (shown(e) && parseFloat(getComputedStyle(e).fontSize) < 16) out.push(`zooms the page (${getComputedStyle(e).fontSize} text): ${name(e)}`);
    }
    return out;
  });
}

for (const { label, device, keyboardHeight } of PHONES) {
  test.describe(label, () => {
    test.use({ ...device });

    test('every page: no sideways scrolling, tap targets 24px+, no field that zooms the page', async ({ page, request }) => {
      test.setTimeout(240_000);
      const xml = await (await request.get('/sitemap.xml')).text();
      const paths = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname))];
      expect(paths.length, 'the sitemap lists pages').toBeGreaterThan(10);
      const problems: string[] = [];
      for (const path of [...paths, ...EXTRA_PATHS]) {
        const res = await page.goto(path, { waitUntil: 'networkidle' });
        if (res?.status() !== 200) { problems.push(`${path}: HTTP ${res?.status()}`); continue; }
        for (const p of await phoneProblems(page)) problems.push(`${path}: ${p}`);
      }
      expect(problems, problems.join('\n')).toEqual([]);
    });

    test('booking forms with the keyboard up: every field reachable and uncovered, calendar fits', async ({ page }) => {
      test.setTimeout(120_000);
      for (const service of SERVICES) {
        await page.setViewportSize(device.viewport);
        await page.goto(`/request?service=${service}`, { waitUntil: 'networkidle' });
        await page.getByTestId('requestedAt-calendar').tap();
        const grid = page.getByTestId('requestedAt-calendar-grid');
        await expect(grid, service).toBeVisible();
        const g = (await grid.boundingBox())!;
        expect(g.x >= 0 && g.x + g.width <= device.viewport.width + 0.5, `${service}: calendar fits the screen`).toBe(true);
        await page.keyboard.press('Escape');

        await page.setViewportSize({ width: device.viewport.width, height: keyboardHeight });
        const fields = page.locator('form input:not([type="hidden"]):not([type="radio"]), form select, form textarea, form button[type="submit"]');
        const count = await fields.count();
        const blocked: string[] = [];
        for (let i = 0; i < count; i++) {
          const f = fields.nth(i);
          const onScreen = await f.evaluate((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.right > 0 && r.left < innerWidth; });
          if (!onScreen) continue; // the off-screen bot trap
          // A person scrolls a field into the middle of the screen before tapping it.
          await f.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
          const hit = await f.evaluate((e) => {
            const r = e.getBoundingClientRect();
            const t = document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2);
            const labels = (e as HTMLInputElement).labels;
            return t === e || e.contains(t) || (!!labels && [...labels].some((l) => l.contains(t))) ? 'ok' : `${e.id || (e as HTMLInputElement).name}: covered by ${t?.closest('header') ? 'the header' : t?.tagName}`;
          });
          if (hit !== 'ok') blocked.push(hit);
        }
        expect(blocked, `${service}: ${blocked.join(', ')}`).toEqual([]);
      }
    });

    test.describe('first visit', () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test('cookie banner: short, both buttons tappable, never over the header Request a Ride, gone after a choice', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const banner = page.getByTestId('consent-banner');
        await expect(banner).toBeVisible();
        const b = (await banner.boundingBox())!;
        expect(b.height, 'a quarter of the screen at most').toBeLessThanOrEqual(device.viewport.height * 0.25);
        for (const name of ['Accept', 'Reject non-essential']) {
          const btn = (await banner.getByRole('button', { name, exact: true }).boundingBox())!;
          expect(btn.height, `${name} is 44px tall`).toBeGreaterThanOrEqual(44);
          expect(btn.y + btn.height, `${name} is on screen`).toBeLessThanOrEqual(device.viewport.height);
        }
        const cta = (await page.locator('header').getByRole('link', { name: /Request a Ride/ }).boundingBox())!;
        expect(cta.y + cta.height <= b.y, 'the header Request a Ride is above the banner').toBe(true);
        await banner.getByRole('button', { name: 'Reject non-essential' }).tap();
        await expect(banner).toBeHidden();
        await page.reload();
        await expect(banner).toBeHidden();
      });
    });
  });
}
