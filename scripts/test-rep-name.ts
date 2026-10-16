import assert from 'node:assert/strict';
import { formatRepName, legacySlugName } from '../lib/rep-name';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

t('full name becomes first name and last initial', () => {
  assert.equal(formatRepName('Test Rep'), 'Test R.');
  assert.equal(formatRepName('  maya   rivera  '), 'Maya R.');
  assert.equal(formatRepName('Ana Maria Lopez'), 'Ana L.');
});

t('a single name stays a single name', () => {
  assert.equal(formatRepName('Cher'), 'Cher');
});

t('empty or missing names give null (page shows "being assigned")', () => {
  assert.equal(formatRepName(''), null);
  assert.equal(formatRepName('   '), null);
  assert.equal(formatRepName(null), null);
  assert.equal(formatRepName(undefined), null);
});

t('old hyphenated slugs still read as a name, bare slugs do not', () => {
  assert.equal(legacySlugName('marcus-bell'), 'Marcus Bell');
  assert.equal(legacySlugName('testr'), null);
  assert.equal(legacySlugName(null), null);
});

console.log(`${n} passed`);
