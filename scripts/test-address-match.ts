import assert from 'node:assert/strict';
import { pickTypedMatch, splitUnit } from '../lib/address-match';

const pruitt = { mainText: '2513 Pruitt St', secondaryText: 'Charlotte, NC, USA' };
const list = [pruitt, { mainText: '2513 Pruitt Rd', secondaryText: 'Fort Mill, SC, USA' }];

// Full address, as before.
assert.equal(pickTypedMatch('2513 Pruitt St, Charlotte, NC 28208', list), 0);
// Muse item 24: no city typed.
assert.equal(pickTypedMatch('2513 Pruitt St', list), 0);
assert.equal(pickTypedMatch('2513 pruitt st 28208', list), 0);
// "Street" spelled out, with and without the city.
assert.equal(pickTypedMatch('2513 Pruitt Street', list), 0);
assert.equal(pickTypedMatch('2513 Pruitt Street, Charlotte', list), 0);
// Suggestion spelled out, typed short.
assert.equal(pickTypedMatch('100 N Tryon St', [{ mainText: '100 North Tryon Street', secondaryText: 'Charlotte, NC, USA' }]), 0);
// Apartment typed in the address box.
assert.equal(pickTypedMatch('2513 Pruitt St Apt 200', list), 0);
assert.equal(pickTypedMatch('2513 Pruitt St, Apt 200, Charlotte, NC', list), 0);
assert.deepEqual(splitUnit('2513 Pruitt St Apt 200'), { street: '2513 Pruitt St', unit: 'Apt 200' });
assert.deepEqual(splitUnit('2513 Pruitt St #4B, Charlotte'), { street: '2513 Pruitt St, Charlotte', unit: '#4B' });
assert.deepEqual(splitUnit('2513 Pruitt St'), { street: '2513 Pruitt St', unit: '' });

// Never from a fragment.
assert.equal(pickTypedMatch('Pruitt St', [{ mainText: 'Pruitt St', secondaryText: 'Charlotte, NC, USA' }, pruitt]), -1);
assert.equal(pickTypedMatch('2513 Pru', list), -1);
assert.equal(pickTypedMatch('Charlotte', [{ mainText: 'Charlotte', secondaryText: 'NC, USA' }]), -1);
// A different city was typed: the Charlotte suggestion is not that address.
assert.equal(pickTypedMatch('2513 Pruitt St, Matthews', list), -1);
// No city typed, not in Charlotte: only when it is the one North Carolina match.
const main = (city: string) => ({ mainText: '123 Main St', secondaryText: `${city}, NC, USA` });
assert.equal(pickTypedMatch('123 Main St', [main('Pineville')]), 0);
assert.equal(pickTypedMatch('123 Main St', [main('Pineville'), main('Matthews')]), -1);
assert.equal(pickTypedMatch('123 Main St', [main('Pineville'), main('Charlotte')]), 1);
assert.equal(pickTypedMatch('123 Main St', [{ mainText: '123 Main St', secondaryText: 'Columbus, OH, USA' }]), -1);

console.log('address-match: ok');
