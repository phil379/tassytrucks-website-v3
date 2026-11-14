import assert from 'node:assert/strict';
import { request, requestRenew } from '../lib/request-links';

// PR 1 (Tassy Wellness & Med-Spa, 2026-11-14): the three /renew CTAs stamp
// utm_source=renew so dispatch can tell a Renew booking from a generic
// Concierge/Recovery one. The generic links are unchanged.
assert.equal(requestRenew.concierge, '/request?service=concierge&utm_source=renew');
assert.equal(requestRenew.recovery, '/request?service=recovery&utm_source=renew');
assert.equal(request.renew, '/request?service=concierge');
assert.equal(request.vip, '/request?service=concierge');
assert.equal(request.recover, '/request?service=recovery');
console.log('renew-links: ok');
