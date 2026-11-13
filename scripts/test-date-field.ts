import assert from 'node:assert/strict';
import { maskDate, validateDate, toUsDate } from '../components/request/DateTimeField';

// Muse item 22: extra digits can never reach the year.
assert.equal(maskDate('111420261'), '11/14/2026');
assert.equal(maskDate('11/14/20261'), '11/14/2026');
assert.equal(maskDate('11140261'), '11/14/0261'); // eight digits typed wrong: caught by validateDate
assert.equal(maskDate('1'), '1');
assert.equal(maskDate('11'), '11');
assert.equal(maskDate('111'), '11/1');
assert.equal(maskDate('11/'), '11/');
assert.equal(maskDate('1/'), '01/');
assert.equal(maskDate('1/5/'), '01/05/');
assert.equal(maskDate('1/5/2026'), '01/05/2026');
assert.equal(maskDate('11/14/'), '11/14/');
assert.equal(maskDate('11/1'), '11/1');
assert.equal(maskDate('abc'), '');
assert.equal(toUsDate('2026-11-14'), '11/14/2026');

const v = (s: string) => validateDate(s, '2026-11-13', '2027-11-13');
assert.deepEqual(v('11/14/2026'), { date: '2026-11-14' });
assert.deepEqual(v('11/14/26'), { date: '2026-11-14' });
assert.deepEqual(v('11/14/0261'), { error: 'Enter a valid date, for example 11/13/2026.' });
assert.deepEqual(v('02/30/2027'), { error: 'Enter a valid date, for example 11/13/2026.' });
assert.deepEqual(v('11/1'), { error: 'Enter a valid date, for example 11/13/2026.' });
assert.deepEqual(v('11/12/2026'), { error: 'That date has passed. Pick a date from today on.' });
assert.deepEqual(v('12/01/2027'), { error: 'We book up to one year ahead. Pick an earlier date.' });
console.log('date-field: ok');
