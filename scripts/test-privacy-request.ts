// /api/privacy-request: emails the operator, receipts the requester, stores nothing until the table exists,
// never deletes anything, and never says "received" if nothing was sent.
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = 're_test_key_not_real';
process.env.OPERATOR_EMAIL = 'ops@example.test';
process.env.PRIVACY_REQUEST_RATE_LIMIT = '6';

type Call = { url: string; body: Record<string, unknown> };
let calls: Call[] = [];
let failEmail = false;
globalThis.fetch = (async (url: unknown, init?: { body?: string }) => {
  calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : {} });
  return new Response('{}', { status: failEmail ? 500 : 200 });
}) as typeof fetch;

const { POST } = await import('../app/api/privacy-request/route');
const { STORE_PRIVACY_REQUESTS } = await import('../lib/privacy-requests');

const ok = (n: string) => console.log(`ok - ${n}`);
let n = 0;
const send = (data: Record<string, unknown>, ip = `10.0.0.${++n}`) =>
  POST(
    new Request('http://localhost/api/privacy-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ elapsedMs: 9000, hp_token: '', ...data }),
    }),
  );
const valid = { name: 'Dana Reed', email: 'dana@example.test', phone: '', requestType: 'delete', details: 'Please remove my records.' };

assert.equal(STORE_PRIVACY_REQUESTS, false, 'storage must stay off until the migration is applied');
ok('storage is off by default (migration is staged, not applied)');

// 1. A valid request with an email: operator email + receipt, a reference, no database call.
{
  calls = [];
  const res = await send(valid);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.match(json.reference, /^PR-[A-HJKMNP-Z2-9]{8}$/);
  const emails = calls.filter((c) => c.url.includes('api.resend.com'));
  assert.equal(emails.length, 2, 'operator email + requester receipt');
  assert.equal(calls.length, 2, 'nothing else is called (no database, no other service)');
  const [op, receipt] = emails.map((c) => c.body as { to: string[]; subject: string; text: string });
  assert.deepEqual(op.to, ['ops@example.test']);
  assert.ok(op.subject.includes(json.reference) && op.subject.includes('PRIVACY REQUEST'));
  assert.ok(op.text.includes('Nothing has been deleted or changed'));
  assert.ok(op.text.includes('check the person really is the data subject'));
  assert.deepEqual(receipt.to, ['dana@example.test']);
  assert.ok(receipt.text.includes(json.reference) && receipt.text.includes('within 30 days'));
  assert.ok(receipt.text.includes('Nothing has been changed or deleted yet'));
  ok('valid request: operator email, receipt with reference and response time, nothing stored or deleted');
}

// 2. Phone only: the operator is told, no receipt email is possible.
{
  calls = [];
  const res = await send({ ...valid, email: '', phone: '704-555-0142' });
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.receiptEmailed, false);
  assert.equal(calls.filter((c) => c.url.includes('api.resend.com')).length, 1);
  ok('phone-only request reaches the operator');
}

// 3. Bots learn nothing and cost nothing.
{
  calls = [];
  const trap = await (await send({ ...valid, hp_token: 'x' })).json();
  const fast = await (await send({ ...valid, elapsedMs: 200 })).json();
  assert.deepEqual([trap.ok, trap.reference, fast.ok, fast.reference], [true, null, true, null]);
  assert.equal(calls.length, 0);
  ok('honeypot and too-fast submissions are discarded without sending anything');
}

// 4. Validation: no way to reach the person, or no request type.
{
  calls = [];
  const none = await send({ ...valid, email: '', phone: '' });
  assert.equal(none.status, 400);
  assert.ok((await none.json()).fieldErrors.email);
  const noType = await send({ ...valid, requestType: '' });
  assert.equal(noType.status, 400);
  assert.equal(calls.length, 0);
  ok('a request with no way to reach the person, or no type, is rejected');
}

// 5. If the operator email fails and nothing is stored, the visitor is told it failed (never a false "received").
{
  calls = [];
  failEmail = true;
  const res = await send(valid);
  const json = await res.json();
  failEmail = false;
  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.ok(String(json.error).includes('book@tassytrucks.com'));
  ok('a failed send is reported as a failure, not as "received"');
}

// 6. Rate limit per address.
{
  const ip = '203.0.113.9';
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) statuses.push((await send(valid, ip)).status);
  assert.ok(statuses.includes(429), `expected a 429 in ${statuses.join(',')}`);
  ok('repeat submissions from one address are rate limited');
}
