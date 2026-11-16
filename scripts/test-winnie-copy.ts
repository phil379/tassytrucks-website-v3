import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Block D2 — the Winnie page states what booking already charges.
 *
 * Two settled charges were missing or half-stated on /winnie: the +$20
 * weekend charge (SURCHARGES.weekend in lib/quote.ts, applied at booking)
 * appeared nowhere on the page, and "Second pet $15" (the Winnie card's
 * perExtra, charged per additional pet) appeared only under the shortest
 * tier. Both now appear on all three tiers. These pins count occurrences
 * so a future tier edit cannot quietly drop one again.
 */

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const page = readFileSync(new URL('../app/winnie/page.tsx', import.meta.url), 'utf8');
const count = (needle: string) => page.split(needle).length - 1;

t('second pet $15 is stated on all three Winnie tiers', () => {
  assert.equal(count("'Second pet $15'"), 3);
});

t('the weekend charge is stated on all three Winnie tiers', () => {
  assert.equal(count("'Weekends +$20'"), 3);
});

console.log(`${n} passed`);
