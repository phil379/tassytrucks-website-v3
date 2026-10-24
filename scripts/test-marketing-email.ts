// Marketing / outreach email: refused unless there is a mailing address, a working one-click unsubscribe
// and the address is not on the do-not-email list. Unsubscribed addresses are never emailed again.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.RESEND_API_KEY = 're_test_key_not_real';
process.env.OPERATOR_EMAIL = 'ops@example.test';
delete process.env.UNSUBSCRIBE_SECRET;

let calls: { url: string; body: Record<string, unknown> }[] = [];
globalThis.fetch = (async (url: unknown, init?: { body?: string }) => {
  calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : {} });
  return new Response('{}', { status: 200 });
}) as typeof fetch;

const { sendMarketingEmail } = await import('../lib/notifications');
const { EmailBlockedError } = await import('../lib/marketing-guard');
const { SuppressionUnavailableError, SUPPRESSION_TABLE_READY } = await import('../lib/email-suppression');
const { signUnsubscribe, verifyUnsubscribe, unsubscribeUrl } = await import('../lib/unsubscribe-token');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ok = (n: string) => console.log(`ok - ${n}`);
const msg = { to: 'Prospect@Example.test', subject: 'A note from Tassy Transportation', text: 'Hello.' };
const ADDRESS = '1 Example Street, Exampleville, XX 00000'; // a made-up address, only ever passed in by this test
const url = (e: string) => unsubscribeUrl(e, 'test-secret');

assert.equal(SUPPRESSION_TABLE_READY, false, 'the do-not-email table is staged, not applied');

// 1. As shipped (no mailing address, no secret): nothing is sent.
{
  calls = [];
  await assert.rejects(sendMarketingEmail(msg), EmailBlockedError);
  assert.equal(calls.length, 0);
  ok('as shipped, marketing email is refused and nothing is sent');
}
// 2. An address alone is not enough without an unsubscribe link.
{
  calls = [];
  await assert.rejects(sendMarketingEmail(msg, { mailingAddress: ADDRESS, unsubscribeUrl: () => { throw new Error('no secret'); }, isSuppressed: async () => false }), EmailBlockedError);
  assert.equal(calls.length, 0);
  ok('no unsubscribe link, no send');
}
// 3. Empty mailing address is refused even with everything else in place.
{
  calls = [];
  await assert.rejects(sendMarketingEmail(msg, { mailingAddress: '', unsubscribeUrl: url, isSuppressed: async () => false }), EmailBlockedError);
  assert.equal(calls.length, 0);
  ok('empty mailing address, no send');
}
// 4. An unsubscribed address is never emailed.
{
  calls = [];
  await assert.rejects(sendMarketingEmail(msg, { mailingAddress: ADDRESS, unsubscribeUrl: url, isSuppressed: async () => true }), EmailBlockedError);
  assert.equal(calls.length, 0);
  ok('an unsubscribed address is never emailed');
}
// 5. If the do-not-email list is not available, nothing is sent.
{
  calls = [];
  await assert.rejects(sendMarketingEmail(msg, { mailingAddress: ADDRESS, unsubscribeUrl: url }), SuppressionUnavailableError);
  assert.equal(calls.length, 0);
  ok('with the list unavailable (table not applied), marketing email is refused');
}
// 6. When every rule holds, the message carries the address, an unsubscribe link and one-click headers.
{
  calls = [];
  await sendMarketingEmail(msg, { mailingAddress: ADDRESS, unsubscribeUrl: url, isSuppressed: async () => false });
  assert.equal(calls.length, 1);
  const b = calls[0]!.body as { from: string; to: string[]; subject: string; text: string; headers: Record<string, string> };
  assert.ok(b.text.includes(ADDRESS) && b.text.includes('Unsubscribe: https://'));
  assert.ok(b.text.includes('Tassy Transportation'));
  assert.match(b.headers['List-Unsubscribe']!, /^<https:\/\/.+\/unsubscribe\?t=.+>$/);
  assert.equal(b.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(b.from.includes('Tassy Transportation'), 'honest sender');
  assert.equal(b.subject, msg.subject);
  ok('a compliant message carries the postal address, an unsubscribe link and one-click headers');
}
// 7. Tokens: round trip, case-insensitive address, tampering fails, a different secret fails.
{
  const t = signUnsubscribe('Prospect@Example.test', 'test-secret');
  assert.equal(verifyUnsubscribe(t, 'test-secret'), 'prospect@example.test');
  assert.equal(verifyUnsubscribe(t, 'other-secret'), null);
  assert.equal(verifyUnsubscribe(t.slice(0, -2) + 'zz', 'test-secret'), null);
  assert.equal(verifyUnsubscribe('garbage', 'test-secret'), null);
  assert.equal(verifyUnsubscribe(t, ''), null);
  ok('unsubscribe tokens cannot be forged');
}
// 8. The unsubscribe route: a valid link is honoured (operator told while the table is not applied), a bad one is not.
{
  process.env.UNSUBSCRIBE_SECRET = 'test-secret';
  const { POST } = await import('../app/api/unsubscribe/route');
  calls = [];
  const good = await POST(new Request(`http://localhost/api/unsubscribe?t=${signUnsubscribe('a@example.test', 'test-secret')}`, { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.1' } }));
  assert.equal(good.status, 200);
  const sent = calls.filter((c) => c.url.includes('api.resend.com'));
  assert.equal(sent.length, 1);
  assert.ok(JSON.stringify(sent[0]!.body).includes('a@example.test'));
  const bad = await POST(new Request('http://localhost/api/unsubscribe?t=nope', { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.2' } }));
  assert.equal(bad.status, 400);
  ok('unsubscribe link works; an invalid one is rejected');
}
// 9. Customer emails carry the business name and the "stop non-essential messages" line.
{
  for (const f of ['lib/confirmation-email.ts', 'lib/receipt-email.ts', 'lib/rating-email.ts']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.ok(src.includes('emailFooterHtml') && src.includes('emailFooterText'), `${f} must use the standard email footer`);
  }
  assert.ok(readFileSync(join(ROOT, 'lib/notifications.ts'), 'utf8').includes('...emailFooterText()'), 'the auto-reply must use the standard footer');
  ok('request-received, confirmation, receipt and rating emails use the standard footer');
}
