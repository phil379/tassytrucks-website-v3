/**
 * Is this identity a test?
 *
 * This is a deliberate COPY of src/lib/test-data.ts in the tassytrucksops repo.
 * Two separate deployments, no shared package, and one rule that has to agree in
 * both — the ops list screens filter on the same is_test_data column these
 * bookings write. If you change one, change the other. The ops copy carries the
 * full note on why the column existed for months with nothing writing it.
 *
 * THE RULE: the signal has to be deliberate. Plus-addressing is how a person
 * says "this is me, testing"; the reserved domains are test by definition.
 * Nothing here guesses from a name, and an ordinary personal address is left
 * alone — Phil may well be the first customer of his own service, and filing a
 * real booking as a test is the more expensive mistake.
 */

/**
 * The trailing \d* is not decoration. Written as \b(test)\b this missed
 * `phil+driver-test01@tassytrucks.com` — an address already in the database —
 * because there is no word boundary between "t" and "0". The leading \b is what
 * keeps `phil+qatar@…` from matching "qa".
 */
const TEST_TAGS = /\+[^@]*\b(test|tests|e2e|qa|demo|staging|selftest|smoke|fixture)\d*\b/i;

const TEST_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net',
  'test.com', 'mailinator.com', 'pw-facility.invalid',
]);

export function looksLikeTestIdentity(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (TEST_TAGS.test(e)) return true;
  const domain = e.split('@')[1] ?? '';
  if (!domain) return false;
  // RFC 2606 reserves .test, .example, .invalid and .localhost.
  if (/\.(test|example|invalid|localhost)$/.test(domain)) return true;
  return TEST_DOMAINS.has(domain);
}
