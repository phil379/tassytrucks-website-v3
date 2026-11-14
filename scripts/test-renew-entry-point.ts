import assert from 'node:assert/strict';
import { entryPointFromSource } from '../lib/trip-details';

// Stamp PR (Tassy Wellness & Med-Spa, 2026-11-14): only utm_source=renew
// stamps entry_point; anything else is null, never free text.
assert.equal(entryPointFromSource('/request?service=concierge&utm_source=renew'), 'renew');
assert.equal(entryPointFromSource('/request?service=recovery&utm_source=renew'), 'renew');
assert.equal(entryPointFromSource('/request?service=concierge'), null);
assert.equal(entryPointFromSource('/request?service=concierge&utm_source=vip'), null);
assert.equal(entryPointFromSource('/request?service=concierge&utm_source='), null);
assert.equal(entryPointFromSource('/renew'), null);
assert.equal(entryPointFromSource(null), null);
assert.equal(entryPointFromSource(''), null);
assert.equal(entryPointFromSource('not a url'), null);
console.log('renew-entry-point: ok');
