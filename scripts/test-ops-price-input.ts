import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_PRICE_DOLLARS, priceInputToCents } from '../lib/ops-price-input';

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

console.log(`${n} passed`);
