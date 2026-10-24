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

// Privacy Policy
mustHave('app/privacy/page.tsx', [
  "h: 'Who else handles your information'",
  "h: 'Cookies, browser storage and analytics'",
  "h: 'Children’s information'",
  "h: 'How we protect your information'",
  "h: 'How long we keep it'",
  "h: 'Your choices'",
  'href="/cookies"',
  'PROVIDERS.map',
  'RETENTION.map',
  'PRIVACY_RESPONSE_DAYS',
  'businessContactLine',
]);
ok('Privacy has every required section');

// The provider table must name every outside service the audit found, and nothing may be promised that the code does not do.
import { PROVIDERS } from '../lib/privacy-policy';
const names = PROVIDERS.map((p) => p.name).join(' | ');
for (const must of ['Stripe', 'Resend', 'Supabase', 'Google Maps', 'Vercel', 'ntfy', 'text-messaging', 'applicant system']) {
  assert.ok(names.includes(must), `provider table is missing ${must}`);
}
const privacy = read('app/privacy/page.tsx');
assert.ok(!/(fully|completely)\s+compliant|GDPR|CCPA|HIPAA[- ]compliant|guarantee[sd]?\s+(absolute\s+)?security/i.test(privacy.replace(/cannot guarantee absolute security/g, '')));
ok('provider table is complete; Privacy makes no compliance promise');

// Every outside host the code calls must be in the table. A new fetch() to a new host fails this until it is disclosed.
import { readdirSync, statSync } from 'node:fs';
const KNOWN_HOSTS: Record<string, string> = {
  'api.stripe.com': 'Stripe',
  'api.resend.com': 'Resend',
  'routes.googleapis.com': 'Google Maps',
  'maps.googleapis.com': 'Google Maps',
  'ntfy.sh': 'ntfy',
};
const found = new Set<string>();
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) {
      for (const m of readFileSync(p, 'utf8').matchAll(/https:\/\/([a-z0-9.-]+\.(?:com|sh|io|net|app|org))\b/gi)) found.add(m[1].toLowerCase());
    }
  }
}
for (const d of ['lib', 'app', 'components']) walk(join(ROOT, d));
for (const [host, provider] of Object.entries(KNOWN_HOSTS)) {
  if (found.has(host)) assert.ok(names.includes(provider), `${host} is called by the code but ${provider} is not in the Privacy table`);
}
ok('every known outside host in the code is disclosed in the provider table');

// Forms: a ride row must not store the visitor's browser string, and the partner sign-up must link Privacy.
const tripRoute = read('app/api/trip-request/route.ts');
assert.ok(!/user_agent:\s*userAgent/.test(tripRoute), 'the ride row must not store the visitor browser string');
assert.ok(read('components/partners/FacilitySignupForm.tsx').includes('href="/privacy"'), 'partner sign-up must link the Privacy Policy');
ok('ride rows do not store the browser string; partner sign-up links Privacy');

// Children (Tassy Scholar): the server must require the guardian statement, and it is stored with its wording version.
import { GUARDIAN_CONFIRMATION_TEXT, GUARDIAN_TEXT_VERSION } from '../lib/school-plans';
assert.ok(GUARDIAN_CONFIRMATION_TEXT.includes('parent or legal guardian'));
assert.ok(GUARDIAN_TEXT_VERSION.length > 0);
assert.ok(/guardian:\s*policyAck/.test(read('lib/school-plans.ts')), 'schoolBookingSchema must require the guardian statement');
assert.ok(read('app/api/school-booking/route.ts').includes('guardian_confirmation'), 'the route must store the guardian confirmation');
assert.ok(/guardian_confirmed[\s\S]{0,200}required: true/.test(read('lib/trip-details.ts')), '/request Scholar must require the guardian question');
assert.ok(read('components/school/HouseholdRequestForm.tsx').includes('parent or legal guardian'));
ok('Scholar flows require and store a parent or legal guardian confirmation');

import { validateDetails } from '../lib/trip-details';
const base = { student_first_name: 'Sam', student_last_name: 'Reed', school_name: 'Elizabeth Traditional', schedule: 'both' };
assert.equal(validateDetails('scholar', base).ok, false, 'missing guardian answer must be rejected');
const notGuardian = validateDetails('scholar', { ...base, guardian_confirmed: 'no' });
assert.equal(notGuardian.ok, false);
if (!notGuardian.ok) assert.ok(/call/i.test(notGuardian.errors.guardian_confirmed ?? ''));
assert.equal(validateDetails('scholar', { ...base, guardian_confirmed: 'yes' }).ok, true);
ok('/request Scholar needs a "yes" to the guardian question; "no" asks them to call');
