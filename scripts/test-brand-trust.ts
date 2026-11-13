import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/**
 * The header logo and the HIRE Vets medallion (Phil, 2026-11-13: both were too small to notice).
 * Keeps them visible, sharp and honestly captioned.
 */
let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const home = readFileSync('app/page.tsx', 'utf8');
const header = readFileSync('components/Header.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');

const HIRE_ALT = '2023 HIRE Vets Medallion Award Gold Winner -- U.S. Department of Labor, HIREVets.gov';
const SBA_ALT = 'U.S. Small Business Administration -- Service-Disabled Veteran-Owned Certified';
const footer = readFileSync('components/Footer.tsx', 'utf8');
const stripComments = (src: string) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const imgTag = (src: string, file: string) => {
  const i = src.indexOf(`src="/brand/${file}"`);
  assert.ok(i > 0, `${file} is shown`);
  return src.slice(src.lastIndexOf('<img', i), src.indexOf('/>', i) + 2);
};

t('home: both badges sit in the hero trust row, above the services section', () => {
  const row = home.indexOf('data-testid="trust-badges"');
  assert.ok(row > 0, 'trust row present');
  assert.ok(row < home.indexOf('id="services"'), 'near the top, before the services section');
  for (const f of ['hirevets-2023-gold-banner.webp', 'sba-sdvosb-certified.webp']) {
    assert.ok(existsSync(`public/brand/${f}`), f);
    assert.equal(home.split(`/brand/${f}`).length - 1, 1, `${f} shown once on the home page`);
    assert.ok(home.indexOf(`/brand/${f}`) > row && home.indexOf(`/brand/${f}`) < home.indexOf('id="services"'));
  }
  assert.ok(!/hirevets-2023-gold\.png/.test(home), 'the small cropped medallion is replaced by the full banner');
});

t('badges: exact alt text (only the words on the images), 2x size, never links', () => {
  for (const [src, where] of [[home, 'home'], [footer, 'footer']] as const) {
    const hire = imgTag(src, 'hirevets-2023-gold-banner.webp');
    const sba = imgTag(src, 'sba-sdvosb-certified.webp');
    assert.ok(hire.includes(`alt="${HIRE_ALT}"`), `${where} banner alt`);
    assert.ok(sba.includes(`alt="${SBA_ALT}"`), `${where} SBA alt`);
    assert.ok(/width=\{840\}/.test(hire) && /height=\{439\}/.test(hire), `${where} banner 840x439`);
    assert.ok(/width=\{400\}/.test(sba) && /height=\{500\}/.test(sba), `${where} SBA 400x500`);
    const before = src.slice(Math.max(0, src.indexOf(hire) - 400), src.indexOf(hire));
    assert.ok(!/<a\b[^>]*>(?![\s\S]*<\/a>)/.test(before), `${where}: badges are not inside a link`);
  }
  // Displayed at no more than half the file width, so they stay sharp on 2x screens.
  assert.ok(/max-w-\[340px\] sm:w-\[360px\]/.test(imgTag(home, 'hirevets-2023-gold-banner.webp')));
  assert.ok(/w-\[200px\] sm:w-\[150px\]/.test(imgTag(home, 'sba-sdvosb-certified.webp')));
});

t('trust row: no added caption or endorsement wording around the badges', () => {
  const start = home.lastIndexOf('<div', home.indexOf('data-testid="trust-badges"'));
  const row = stripComments(home.slice(start, home.indexOf('{/* Hero visual */}')));
  const text = row.replace(/<img[\s\S]*?\/>/g, '').replace(/<[^>]+>/g, '').trim();
  assert.equal(text, '', 'no words beyond the badges themselves');
  assert.ok(!/endorse|approved by|recommended by|official partner/i.test(row));
});

t('header logo: the cropped emblem at 2x, heights unchanged, width follows the screen', () => {
  assert.ok(header.includes('src="/brand/logo-emblem.webp"'));
  assert.ok(/width=\{384\}/.test(header) && /height=\{259\}/.test(header));
  assert.ok(existsSync('public/brand/logo-emblem.webp'));
  assert.ok(/--hdr-logo-full: 88px;/.test(css), 'phone height unchanged');
  assert.ok(/min-width: 768px\)  \{ \.site-header \{ --hdr-logo-full: 112px; \} \}/.test(css));
  assert.ok(/min-width: 1024px\) \{ \.site-header \{ --hdr-logo-full: 128px; \} \}/.test(css));
  assert.ok(/width: calc\(var\(--hdr-logo\) \* var\(--hdr-logo-aspect\)\);/.test(css));
  assert.ok(/\.site-header \{ --hdr-logo-aspect: 1; \}/.test(css), 'square below 360px, as before');
});

console.log(`${n} brand trust checks passed`);
