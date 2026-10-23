import assert from 'node:assert/strict';
import { matchBreeds, MAX_BREED_SUGGESTIONS } from '../lib/breed-match';
import { BREEDS_BY_SPECIES } from '../lib/pet-breeds';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const dogs = BREEDS_BY_SPECIES.dog;

t('typing nothing, or only punctuation, suggests nothing', () => {
  assert.deepEqual(matchBreeds('', dogs), []);
  assert.deepEqual(matchBreeds('   ', dogs), []);
  assert.deepEqual(matchBreeds('()-', dogs), []);
});

t('"F" offers French Bulldog (the bug that started this)', () => {
  assert.ok(matchBreeds('F', dogs).includes('French Bulldog'));
});

t('a word in the middle of the name matches: "bull" finds French Bulldog', () => {
  const hits = matchBreeds('bull', dogs);
  assert.ok(hits.includes('French Bulldog'));
  assert.ok(hits.includes('American Pit Bull Terrier'));
});

t('names that start with the typed text come before names that merely contain it', () => {
  const hits = matchBreeds('bull', dogs);
  assert.ok(hits.indexOf('Bulldog') < hits.indexOf('French Bulldog'));
  assert.ok(hits.indexOf('Bull Terrier') < hits.indexOf('French Bulldog'));
});

t('it matches the start of a word, not the middle of one', () => {
  // "dog" sits inside "Bulldog", but no breed WORD starts with "og".
  assert.deepEqual(matchBreeds('og', dogs), []);
});

t('several typed words must each start a word of the same breed', () => {
  assert.deepEqual(matchBreeds('french b', ['French Bulldog', 'French Spaniel', 'Bulldog']), ['French Bulldog']);
  assert.deepEqual(matchBreeds('bulldog french', ['French Bulldog']), ['French Bulldog']);
});

t('case, accents and punctuation do not matter', () => {
  assert.ok(matchBreeds('FRENCH BULLDOG', dogs).includes('French Bulldog'));
  assert.deepEqual(matchBreeds('cirneco dell', ["Cirneco dell'Etna"]), ["Cirneco dell'Etna"]);
  assert.deepEqual(matchBreeds('tulear', ['Coton de Tuléar']), ['Coton de Tuléar']);
  assert.deepEqual(matchBreeds('mixed 23', dogs), ['Mixed Breed (Medium, 23–70 lb)']);
});

t('a breed that is not on the list matches nothing, so the typed text stands on its own', () => {
  assert.deepEqual(matchBreeds('Zzyzx Hound', dogs), []);
});

t('the list is capped, with no repeats', () => {
  // Pick a letter that really matches more breeds than the cap, rather than assume one.
  const letter = 'abcdefghijklmnopqrstuvwxyz'.split('').find((l) => matchBreeds(l, dogs, 1000).length > MAX_BREED_SUGGESTIONS)!;
  assert.ok(letter, 'some letter should match more than the cap');
  const hits = matchBreeds(letter, dogs);
  assert.equal(hits.length, MAX_BREED_SUGGESTIONS);
  assert.equal(new Set(hits).size, hits.length);
  assert.equal(matchBreeds(letter, dogs, 3).length, 3);
});

t('an empty species list (Other) offers nothing', () => {
  assert.deepEqual(matchBreeds('F', BREEDS_BY_SPECIES.other), []);
  assert.deepEqual(matchBreeds('F', BREEDS_BY_SPECIES.nonexistent ?? []), []);
});

// Same rule, one level up: nothing in the app may bring the native datalist back. It lives in its
// own file so it can be run alone, and is pulled in here so `bun run test:unit` runs it without
// another edit to the one-line test:unit script.
await import('./test-no-native-datalist');

console.log(`${n} passed`);
