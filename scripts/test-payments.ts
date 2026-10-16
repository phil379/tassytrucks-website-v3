// Unit tests for lib/payment-check.ts. Run: bun run scripts/test-payments.ts
import assert from 'node:assert/strict';
import { checkPaidAmount } from '../lib/payment-check';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };

t('exact amount in usd matches', () => assert.equal(checkPaidAmount({ amountTotal: 8455, currency: 'usd', expectedCents: 8455 }), 'match'));
t('currency is case-insensitive', () => assert.equal(checkPaidAmount({ amountTotal: 8455, currency: 'USD', expectedCents: 8455 }), 'match'));
t('list price paid on a discounted link is a mismatch', () => assert.equal(checkPaidAmount({ amountTotal: 8900, currency: 'usd', expectedCents: 8455 }), 'amount_mismatch'));
t('discounted price paid on a list-price link is a mismatch', () => assert.equal(checkPaidAmount({ amountTotal: 8455, currency: 'usd', expectedCents: 8900 }), 'amount_mismatch'));
t('a different currency is a mismatch', () => assert.equal(checkPaidAmount({ amountTotal: 8455, currency: 'eur', expectedCents: 8455 }), 'currency_mismatch'));
t('missing amount is unknown, not a match', () => {
  assert.equal(checkPaidAmount({ amountTotal: undefined, currency: 'usd', expectedCents: 8455 }), 'unknown');
  assert.equal(checkPaidAmount({ amountTotal: null, currency: 'usd', expectedCents: 8455 }), 'unknown');
});
t('missing currency falls back to the amount check', () => assert.equal(checkPaidAmount({ amountTotal: 8455, currency: undefined, expectedCents: 8455 }), 'match'));
console.log(`\n${n} tests passed`);
