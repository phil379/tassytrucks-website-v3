// Unit tests for lib/care-intake.ts. Run: bun run scripts/test-care-intake.ts
import assert from 'node:assert/strict';
import { buildCareConsentText, buildCareIntakeRecord, careIntakeSchema, checkAdult, isMedicalPayer, CARE_CONSENT_VERSION } from '../lib/care-intake';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };
const TODAY = new Date('2026-10-16T15:00:00Z');
const base = { payer: 'insurance', dob: '1950-03-02', hipaa: true, transportConsent: true, signerName: 'Maria Santos' };

t('18+ : adult passes, minor blocked with the phone number', () => {
  assert.equal(checkAdult('1950-03-02', TODAY).ok, true);
  const r = checkAdult('2012-01-01', TODAY);
  assert.equal(r.ok, false);
  assert.match((r as { message: string }).message, /704\) 941-8508/);
});
t('18+ : birthday edge (turns 18 tomorrow = blocked, today = allowed)', () => {
  assert.equal(checkAdult('2008-10-17', TODAY).ok, false);
  assert.equal(checkAdult('2008-10-16', TODAY).ok, true);
});
t('dob: missing, malformed, impossible, future, ancient', () => {
  for (const bad of [undefined, '', '03/02/1950', '1950-02-31', '2030-01-01', '1800-01-01']) {
    assert.equal(checkAdult(bad as string, TODAY).ok, false, String(bad));
  }
});
t('payer: self-pay is not a medical payer', () => {
  assert.equal(isMedicalPayer('self'), false);
  assert.equal(isMedicalPayer(null), false);
  for (const p of ['medicaid', 'insurance', 'va', 'facility']) assert.equal(isMedicalPayer(p), true);
});
t('schema: valid insurance intake', () => {
  assert.equal(careIntakeSchema.safeParse(base).success, true);
});
t('schema: consent boxes and signature are required', () => {
  assert.equal(careIntakeSchema.safeParse({ ...base, hipaa: false }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...base, transportConsent: false }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...base, signerName: 'M' }).success, false);
});
t('schema: medicaid needs a plan/broker, others do not', () => {
  assert.equal(careIntakeSchema.safeParse({ ...base, payer: 'medicaid' }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...base, payer: 'medicaid', medicaidBroker: 'Healthy Blue' }).success, true);
  assert.equal(careIntakeSchema.safeParse({ ...base, payer: 'va' }).success, true);
});
t('schema: unknown payer (incl. self) is rejected', () => {
  assert.equal(careIntakeSchema.safeParse({ ...base, payer: 'self' }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...base, payer: 'cash' }).success, false);
});
t('schema: a minor dob fails on the dob field', () => {
  const r = careIntakeSchema.safeParse({ ...base, dob: '2015-05-05' });
  assert.equal(r.success, false);
  assert.deepEqual(r.error!.issues[0].path, ['dob']);
});
t('record: carries version, server hash, no clinical keys; broker only for medicaid', () => {
  const v = careIntakeSchema.parse({ ...base, medicaidBroker: 'ignored' });
  const rec = buildCareIntakeRecord(v, { textHash: 'sha256:abc', signedAt: '2026-10-16T15:00:00.000Z', ip: '1.2.3.4', ua: 'UA' });
  assert.equal(rec.consent.version, CARE_CONSENT_VERSION);
  assert.equal(rec.consent.text_hash, 'sha256:abc');
  assert.equal(rec.medicaid_broker, null);
  const keys = JSON.stringify(rec);
  for (const banned of ['diagnos', 'procedure', 'condition', 'medication']) assert.equal(keys.includes(banned), false, banned);
});
t('consent text names the signer and version', () => {
  const txt = buildCareConsentText('Maria Santos');
  assert.match(txt, /Maria Santos/);
  assert.match(txt, new RegExp(CARE_CONSENT_VERSION));
});
console.log(`${n} passed`);
