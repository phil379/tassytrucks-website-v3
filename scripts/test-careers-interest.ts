import assert from 'node:assert/strict';
import {
  CAREERS_INTEREST_STATUS,
  CAREERS_ROLES,
  careersInterestSchema,
  careersRoleLabel,
} from '../lib/careers-interest';
import { POST } from '../app/api/careers-interest/route';

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const base = {
  full_name: 'QA Probe',
  email: 'qa@example.com',
  role: 'driver',
  hp_token: '',
  elapsedMs: 10_000,
};

const parse = (v: Record<string, unknown>) => careersInterestSchema.safeParse({ ...base, ...v });

await t('roles: the four page roles plus "Not sure yet", in page order', () => {
  assert.deepEqual(
    CAREERS_ROLES.map((r) => r.key),
    ['driver', 'companion', 'cna', 'sales_rep', 'not_sure'],
  );
  assert.equal(careersRoleLabel('sales_rep'), 'Sales rep');
  assert.equal(careersRoleLabel('not_sure'), 'Not sure yet');
});

await t('schema: a full valid lead parses, status word is "interest"', () => {
  const r = parse({ phone: '7045550100' });
  assert.ok(r.success);
  assert.equal(CAREERS_INTEREST_STATUS, 'interest');
});

await t('schema: phone is optional — absent, null and empty all parse', () => {
  assert.ok(parse({}).success);
  assert.ok(parse({ phone: null }).success);
  assert.ok(parse({ phone: '' }).success);
});

await t('schema: a phone that is present must look like a phone number', () => {
  assert.equal(parse({ phone: '123' }).success, false);
  assert.ok(parse({ phone: '(704) 555-0100' }).success);
});

await t('schema: name, email and a known role are required', () => {
  assert.equal(parse({ full_name: 'Q' }).success, false);
  assert.equal(parse({ email: 'not-an-email' }).success, false);
  assert.equal(parse({ role: 'ceo' }).success, false);
  assert.ok(parse({ role: 'not_sure' }).success);
});

function post(body: unknown, rawBody?: string): Promise<Response> {
  return POST(
    new Request('http://localhost/api/careers-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

await t('route: a tripped honeypot is discarded with a null id (a script learns nothing)', async () => {
  const res = await post({ ...base, hp_token: 'spammy' });
  assert.equal(res.status, 200);
  const json = (await res.json()) as { ok: boolean; id: string | null; stored: boolean };
  assert.equal(json.ok, true);
  assert.equal(json.id, null);
  assert.equal(json.stored, false);
});

await t('route: a too-fast submission is discarded the same way', async () => {
  const res = await post({ ...base, elapsedMs: 50 });
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { id: string | null }).id, null);
});

await t('route: a non-JSON body is a 400, never a success shape', async () => {
  const res = await post(null, '{oops');
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as { error: string }).error, 'Expected a JSON body.');
});

await t('route: invalid fields answer 400 with per-field errors', async () => {
  const res = await post({ ...base, email: 'nope', role: 'ceo' });
  assert.equal(res.status, 400);
  const json = (await res.json()) as { ok: boolean; fieldErrors: Record<string, string> };
  assert.equal(json.ok, false);
  assert.ok(json.fieldErrors.email);
  assert.ok(json.fieldErrors.role);
});

console.log(`${n} passed`);
