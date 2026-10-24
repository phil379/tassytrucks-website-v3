// Marketing / outreach email must be blocked while the business mailing address is empty,
// and no code outside the guarded sender may talk to the email API.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUSINESS_MAILING_ADDRESS, BUSINESS_LOCATION, hasMailingAddress } from '../lib/business';
import { assertEmailAllowed, emailBlockReason, EmailBlockedError } from '../lib/marketing-guard';

function ok(name: string) {
  console.log(`ok - ${name}`);
}

// 1. Empty address (the shipped default) blocks every marketing email, even with an unsubscribe link.
if (!hasMailingAddress()) {
  assert.ok(emailBlockReason('marketing', { unsubscribeUrl: 'https://example.test/u/abc' }), 'marketing must be blocked with an empty address');
  assert.throws(() => assertEmailAllowed('marketing', { unsubscribeUrl: 'https://example.test/u/abc' }), EmailBlockedError);
  ok('marketing email is blocked while BUSINESS_MAILING_ADDRESS is empty');
} else {
  ok('mailing address is set; empty-address case skipped');
}

// 2. Explicit empty and whitespace-only addresses are blocked, whatever the default is.
for (const blank of ['', '   ', '\n']) {
  assert.throws(() => assertEmailAllowed('marketing', { mailingAddress: blank, unsubscribeUrl: 'https://example.test/u/abc' }), EmailBlockedError);
}
ok('blank and whitespace addresses are blocked');

// 3. An address alone is not enough: a one-click unsubscribe is required too.
assert.ok(emailBlockReason('marketing', { mailingAddress: '1 Example Street, Exampleville, XX 00000' }));
assert.equal(emailBlockReason('marketing', { mailingAddress: '1 Example Street, Exampleville, XX 00000', unsubscribeUrl: 'https://example.test/u/abc' }), null);
ok('marketing needs both a mailing address and an unsubscribe link');

// 4. Transactional email (request received, booked, receipt, pay link) is never blocked.
assert.equal(emailBlockReason('transactional', { mailingAddress: '' }), null);
assert.doesNotThrow(() => assertEmailAllowed('transactional', { mailingAddress: '' }));
ok('transactional email is not blocked');

// 5. Only the city and state are published by default.
assert.equal(BUSINESS_LOCATION, 'Charlotte, NC');
assert.ok(!/\d/.test(BUSINESS_LOCATION), 'BUSINESS_LOCATION must not contain a street number or ZIP');
ok('business location is city and state only');
void BUSINESS_MAILING_ADDRESS;

// 6. Every send goes through the guarded functions: only lib/notifications.ts may call the email API.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWED = new Set(['lib/notifications.ts']);
const offenders: string[] = [];
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      const rel = p.slice(ROOT.length + 1);
      if (!ALLOWED.has(rel) && /api\.resend\.com/.test(readFileSync(p, 'utf8'))) offenders.push(rel);
    }
  }
}
for (const d of ['app', 'components', 'lib']) walk(join(ROOT, d));
assert.deepEqual(offenders, [], `these files call the email API without the marketing guard: ${offenders.join(', ')}`);
ok('no file outside lib/notifications.ts calls the email API');
