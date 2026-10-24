import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_PRICE_DOLLARS, agreedPriceDefault, priceInputToCents } from '../lib/ops-price-input';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

t('ordinary prices become whole cents', () => {
  assert.equal(priceInputToCents('49'), 4900);
  assert.equal(priceInputToCents(' 49.00 '), 4900);
  assert.equal(priceInputToCents('49.99'), 4999);
  assert.equal(priceInputToCents('0.29'), 29);
  assert.equal(priceInputToCents('1234.5'), 123450);
});

t('a slipped key is refused: the cap is the same $50,000 the TassyOps confirm uses', () => {
  assert.equal(MAX_PRICE_DOLLARS, 50_000);
  assert.equal(priceInputToCents('50000'), 5_000_000);
  assert.equal(priceInputToCents('50000.01'), null);
  assert.equal(priceInputToCents('4900000'), null);
  assert.equal(priceInputToCents('1e9'), null);
});

t('empty, zero, negative and non-numbers are not prices', () => {
  for (const bad of ['', '   ', '0', '-5', 'abc', 'NaN', 'Infinity', '-Infinity', '$49']) {
    assert.equal(priceInputToCents(bad), null, JSON.stringify(bad));
  }
});

t('a quote may be zero (it clears nothing) but never negative or over the cap', () => {
  assert.equal(priceInputToCents('0', { allowZero: true }), 0);
  assert.equal(priceInputToCents('-1', { allowZero: true }), null);
  assert.equal(priceInputToCents('99999999', { allowZero: true }), null);
});

t('both /ops price fields go through the helper (no unbounded Number() parse left)', () => {
  const src = readFileSync(new URL('../app/ops/actions.ts', import.meta.url), 'utf8');
  assert.equal((src.match(/priceInputToCents\(/g) ?? []).length, 2);
  assert.ok(!src.includes('Math.round(dollars * 100)'));
});

const none = { agreed_cents: null, quoted_cents: null, estimate_low_cents: null, estimate_high_cents: null };

t('an estimate that is a single price pre-fills the agreed-price box', () => {
  assert.equal(agreedPriceDefault({ ...none, estimate_low_cents: 8900, estimate_high_cents: 8900 }), '89.00');
});

t('an estimate that is a range ($89-$99) leaves the box blank', () => {
  assert.equal(agreedPriceDefault({ ...none, estimate_low_cents: 8900, estimate_high_cents: 9900 }), '');
});

t('no estimate, or a half-empty one, leaves the box blank', () => {
  assert.equal(agreedPriceDefault(none), '');
  assert.equal(agreedPriceDefault({ ...none, estimate_high_cents: 9900 }), '');
  assert.equal(agreedPriceDefault({ ...none, estimate_low_cents: 9900 }), '');
});

t('an agreed or quoted price still wins over any estimate', () => {
  const range = { estimate_low_cents: 8900, estimate_high_cents: 9900 };
  assert.equal(agreedPriceDefault({ ...none, ...range, agreed_cents: 9500 }), '95.00');
  assert.equal(agreedPriceDefault({ ...none, ...range, quoted_cents: 9100 }), '91.00');
  assert.equal(agreedPriceDefault({ ...none, ...range, agreed_cents: 9500, quoted_cents: 9100 }), '95.00');
});

t('the /ops page uses the helper, not estimate_high_cents directly', () => {
  const src = readFileSync(new URL('../app/ops/page.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes('agreedPriceDefault(row)'));
  assert.ok(!src.includes('(row.estimate_high_cents / 100)'));
});

console.log(`${n} passed`);
