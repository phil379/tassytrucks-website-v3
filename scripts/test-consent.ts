// Analytics must not be able to load before the visitor says yes, and the two choices must weigh the same.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONSENT_VERSION, parseConsent, serializeConsent } from '../lib/consent';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const ok = (n: string) => console.log(`ok - ${n}`);

// 1. Stored choices round-trip, and junk or old versions count as "not asked yet".
const yes = parseConsent(serializeConsent(true, new Date('2026-10-24T12:00:00Z')));
assert.deepEqual(yes, { v: CONSENT_VERSION, analytics: true, at: '2026-10-24T12:00:00.000Z' });
assert.equal(parseConsent(serializeConsent(false))?.analytics, false);
for (const bad of [null, undefined, '', 'nope', '{}', '{"v":1}', '{"v":999,"analytics":true}', '{"v":1,"analytics":"yes"}']) {
  assert.equal(parseConsent(bad as string | null), null, `should not accept ${String(bad)}`);
}
ok('saved choice round-trips; junk and old versions count as not asked');

// 2. The analytics script is never a static tag; only the consent manager injects it.
const layout = read('app/layout.tsx');
assert.ok(!/<script[^>]*_vercel\/insights/.test(layout), 'app/layout.tsx must not contain a static analytics <script>');
assert.ok(layout.includes('<ConsentManager />'));
ok('layout has no static analytics tag and mounts the consent manager');

// 3. Accept and Reject share one class string (equal size and weight), and nothing is pre-ticked.
const banner = read('components/ConsentManager.tsx');
const uses = banner.match(/className=\{BUTTON\}/g) ?? [];
assert.equal(uses.length, 2, 'both buttons must use the same BUTTON class');
assert.ok(/>\s*Accept\s*</.test(banner) && /Reject non-essential/.test(banner));
assert.ok(!/defaultChecked|checked=|type="checkbox"/.test(banner), 'no pre-ticked boxes in the banner');
ok('Accept and Reject use one shared style; no pre-ticked box');

// 4. The footer can reopen the banner, and the Cookies page exists.
assert.ok(read('components/Footer.tsx').includes('CookieSettingsButton'));
assert.ok(read('components/Footer.tsx').includes('href="/cookies"'));
ok('footer links Cookies and has Cookie settings');
