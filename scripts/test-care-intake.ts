// Unit tests for lib/care-intake.ts. Run: bun run scripts/test-care-intake.ts
import assert from 'node:assert/strict';
import {
  buildCareConsentText, buildCareIntakeRecord, careIntakeSchema, checkAdult, isMedicalPayer, isPayerEnabled,
  CARE_CONSENT_VERSION, CARE_PAYMENT_OPTIONS,
} from '../lib/care-intake';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };
const TODAY = new Date('2026-10-16T15:00:00Z');
const card = { payer: 'self', dob: '1950-03-02' };
const plan = { payer: 'insurance', dob: '1950-03-02', hipaa: true, transportConsent: true, signerName: 'Maria Santos' };
const SIGNED = { textHash: 'sha256:abc', signedAt: '2026-10-16T15:00:00.000Z', ip: '1.2.3.4', ua: 'UA' };

t('TODAY: only card is enabled; Medicaid, insurance and VA are not', () => {
  assert.equal(isPayerEnabled('self'), true);
  for (const p of ['medicaid', 'insurance', 'va', 'facility', 'cash', '']) assert.equal(isPayerEnabled(p), false, p);
  assert.deepEqual(CARE_PAYMENT_OPTIONS.filter((o) => o.enabled).map((o) => o.value), ['self']);
});
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
t('payer classification: card is not a plan payer', () => {
  assert.equal(isMedicalPayer('self'), false);
  assert.equal(isMedicalPayer(null), false);
  for (const p of ['medicaid', 'insurance', 'va']) assert.equal(isMedicalPayer(p), true);
  assert.equal(isMedicalPayer('facility'), false); // not a payment option on the public form
});
t('card: valid with only an adult DOB, no consent or signature needed', () => {
  assert.equal(careIntakeSchema.safeParse(card).success, true);
});
t('card: a missing or minor DOB is rejected on the dob field', () => {
  for (const dob of ['', '2015-05-05']) {
    const r = careIntakeSchema.safeParse({ ...card, dob });
    assert.equal(r.success, false);
    assert.deepEqual(r.error!.issues[0].path, ['dob']);
  }
});
t('card record stores the 18+ fact only: no DOB, no consent, no IP', () => {
  const rec = buildCareIntakeRecord(careIntakeSchema.parse(card), SIGNED);
  assert.deepEqual(rec, { payer: 'self', age_verified_18_plus: true, verified_at: SIGNED.signedAt });
  assert.equal(JSON.stringify(rec).includes('1950'), false);
});
t('plan payers (disabled today, built for later): consent, signature required', () => {
  assert.equal(careIntakeSchema.safeParse(plan).success, true);
  assert.equal(careIntakeSchema.safeParse({ ...plan, hipaa: false }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...plan, transportConsent: false }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...plan, signerName: 'M' }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...plan, signerName: undefined }).success, false);
});
t('plan payers: medicaid needs a plan/broker, others do not', () => {
  assert.equal(careIntakeSchema.safeParse({ ...plan, payer: 'medicaid' }).success, false);
  assert.equal(careIntakeSchema.safeParse({ ...plan, payer: 'medicaid', medicaidBroker: 'Healthy Blue' }).success, true);
  assert.equal(careIntakeSchema.safeParse({ ...plan, payer: 'va' }).success, true);
});
t('unknown payer is rejected by the schema', () => {
  assert.equal(careIntakeSchema.safeParse({ ...card, payer: 'cash' }).success, false);
});
t('plan record: carries version, server hash, DOB; broker only for medicaid; no clinical keys', () => {
  const v = careIntakeSchema.parse({ ...plan, medicaidBroker: 'ignored' });
  const rec = buildCareIntakeRecord(v, SIGNED);
  assert.equal(rec.consent?.version, CARE_CONSENT_VERSION);
  assert.equal(rec.consent?.text_hash, 'sha256:abc');
  assert.equal(rec.dob, '1950-03-02');
  assert.equal(rec.medicaid_broker, null);
  const json = JSON.stringify(rec);
  for (const banned of ['diagnos', 'procedure', 'condition', 'medication']) assert.equal(json.includes(banned), false, banned);
});
t('consent text names the signer and version', () => {
  const txt = buildCareConsentText('Maria Santos');
  assert.match(txt, /Maria Santos/);
  assert.match(txt, new RegExp(CARE_CONSENT_VERSION));
});
console.log(`${n} passed`);
