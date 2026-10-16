import assert from 'node:assert/strict';
import { facilitySignupSchema, coerceProspectId } from '../lib/facility';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const ID = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const base = { facilityName: 'Carolina Dialysis', workEmail: 'ops@example.com', rep: 'maya-r' };

t('a real prospect id passes through, lowercased', () => {
  assert.equal(coerceProspectId(ID.toUpperCase()), ID);
  const r = facilitySignupSchema.parse({ ...base, prospect: ID });
  assert.equal(r.prospect, ID);
  assert.equal(r.rep, 'maya-r');
});

t('a missing prospect is fine (signup works exactly as before)', () => {
  const r = facilitySignupSchema.parse(base);
  assert.equal(r.prospect, undefined);
});

t('anything that is not a uuid becomes null and never blocks the signup', () => {
  for (const bad of ['', 'abc', ID + 'x', "'; drop table sales_prospects;--", 42, {}, [ID], null]) {
    assert.equal(coerceProspectId(bad), null, String(bad));
    const r = facilitySignupSchema.safeParse({ ...base, prospect: bad });
    assert.ok(r.success, `signup blocked by prospect=${String(bad)}`);
    assert.equal(r.success && r.data.prospect, null);
  }
});

t('prospect never changes who is credited: rep still comes from rep alone', () => {
  const noRep = facilitySignupSchema.parse({ facilityName: 'X Clinic', workEmail: 'a@b.co', prospect: ID });
  assert.equal(noRep.rep, undefined);
});

console.log(`\n${n} prospect-link tests passed`);
