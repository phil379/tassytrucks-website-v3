// The legal pages must keep their required sections and cross-links. Reads page source, so no build is needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const ok = (n: string) => console.log(`ok - ${n}`);

function mustHave(file: string, needles: string[]) {
  const src = read(file);
  for (const n of needles) assert.ok(src.includes(n), `${file} is missing: ${n}`);
}

// Terms of Service
mustHave('app/terms/page.tsx', [
  "h: 'Payments and payment links'",
  "h: 'Cancellations & no-shows'",
  "h: 'Driver and vehicle assignments'",
  "h: 'Accessibility and wheelchair trips'",
  "h: 'Riders under 18 and Tassy Scholar'",
  "h: 'Governing law'",
  'State of North Carolina',
  'href="/privacy"',
  'href="/refunds"',
  'href="/accessibility"',
  'businessContactLine',
]);
// A promise we cannot keep must not come back: there is no self-serve "booking link" to cancel with.
assert.ok(!/through your booking link/i.test(read('app/terms/page.tsx')), 'Terms promise a booking-link cancel path that does not exist');
ok('Terms have every required section and link');

// Nothing on the Terms page may claim legal compliance.
assert.ok(!/(fully|completely)\s+compliant|GDPR|CCPA/i.test(read('app/terms/page.tsx')));
ok('Terms make no compliance promise');
