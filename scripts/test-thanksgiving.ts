import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THANKSGIVING, thanksgivingActive } from '../lib/thanksgiving';

// The Thanksgiving banner (Phil, 2026-11-26): a gratitude message at the top of every
// page for the holiday weekend — the website twin of the Thanksgiving Facebook post.
// It must appear on Thanksgiving morning, stay through Sunday night, and remove itself
// Monday with no deploy; it is a message, never an offer.

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const at = (iso: string) => new Date(iso);

t('the window is Thanksgiving through Sunday night ET', () => {
  assert.equal(THANKSGIVING.startsAt, '2026-11-26T00:00:00-05:00');
  assert.equal(THANKSGIVING.endsAt, '2026-11-30T00:00:00-05:00');
});

t('not active before Thanksgiving', () => {
  assert.equal(thanksgivingActive(at('2026-11-25T23:59:59-05:00')), false);
});

t('active on Thanksgiving morning', () => {
  assert.equal(thanksgivingActive(at('2026-11-26T00:00:00-05:00')), true);
  assert.equal(thanksgivingActive(at('2026-11-26T11:53:00-05:00')), true);
});

t('still active Sunday night, gone Monday', () => {
  assert.equal(thanksgivingActive(at('2026-11-29T23:59:59-05:00')), true);
  assert.equal(thanksgivingActive(at('2026-11-30T00:00:00-05:00')), false);
});

t('an invalid date is never active', () => {
  assert.equal(thanksgivingActive(new Date('not a date')), false);
});

t('the banner carries the approved message and the booking link', () => {
  const src = read('components/ThanksgivingBanner.tsx');
  assert.match(src, /HAPPY THANKSGIVING/);
  assert.match(src, /from our family to yours/);
  assert.match(src, /trusts us with the people they love/);
  assert.match(src, /href="\/request"/);
  assert.match(src, /Book a ride/);
});

t('the banner is dismissible and remembers it on the device', () => {
  const src = read('components/ThanksgivingBanner.tsx');
  assert.match(src, /THANKSGIVING\.dismissKey/);
  assert.match(src, /aria-label="Dismiss the Thanksgiving message"/);
});

t('the banner makes no offer and no insurance claim', () => {
  const src = read('components/ThanksgivingBanner.tsx');
  assert.doesNotMatch(src, /% off|discount|insured/i);
});

t('the layout renders the banner above the header', () => {
  const layout = read('app/layout.tsx');
  const bannerAt = layout.indexOf('<ThanksgivingBanner />');
  const headerAt = layout.indexOf('<Header />');
  assert.ok(bannerAt > -1, 'banner is rendered');
  assert.ok(headerAt > -1, 'header is rendered');
  assert.ok(bannerAt < headerAt, 'banner sits above the header');
});

console.log(`\n${n} thanksgiving checks passed`);
