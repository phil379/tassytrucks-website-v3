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

t('the medallion sits in the hero, above the services section, with the original badge file', () => {
  const card = home.indexOf('data-testid="hirevets-medallion"');
  assert.ok(card > 0, 'medallion card present');
  assert.ok(card < home.indexOf('id="services"'), 'before the services section');
  assert.equal((home.match(/hirevets-2023-gold\.png/g) ?? []).length, 1, 'shown once on the home page');
  assert.ok(existsSync('public/brand/hirevets-2023-gold.png'));
});

t('medallion: alt text, 320px source shown at 96-112px (sharp at 2x and up)', () => {
  const block = home.slice(home.indexOf('data-testid="hirevets-medallion"'), home.indexOf('data-testid="hirevets-medallion"') + 1600);
  assert.ok(block.includes('alt="2023 HIRE Vets Medallion Award, Gold -- U.S. Department of Labor"'));
  assert.ok(/width=\{320\}/.test(block) && /height=\{320\}/.test(block));
  assert.ok(/h-24 w-24 sm:h-28 sm:w-28/.test(block), '96px on phones, 112px from sm up');
});

t('medallion caption: the award facts only, no endorsement of the service', () => {
  const block = home.slice(home.indexOf('data-testid="hirevets-medallion"'), home.indexOf('data-testid="hirevets-medallion"') + 1600);
  assert.ok(block.includes('2023 HIRE Vets Medallion Award &mdash; Gold'));
  assert.ok(block.includes('Awarded by the U.S. Department of Labor to employers who recruit,'));
  assert.ok(!/endorse|approved by|recommended by|certified by the|official partner/i.test(block.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'no endorsement wording');
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
