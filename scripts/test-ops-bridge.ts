import assert from 'node:assert/strict';
import { signBridgeBody, verifyBridgeSignature } from '../lib/ops-bridge';

const SECRET = 'test-secret-do-not-use';
const BODY = '{"tripId":"62ff9131-fb62-415c-821d-a68e6521294d","agreedCents":4900,"onAccount":false}';
const NOW = 1_800_000_000;
let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

t('parity vector (same value is asserted in the ops repo)', () => {
  assert.equal(
    signBridgeBody(SECRET, BODY, NOW),
    't=1800000000,v1=bb9e97387ced03f01f8f75bf74db0dc14de1159d4f154e715ef32fd7a03cb402',
  );
});

t('valid signature verifies', () => {
  const h = signBridgeBody(SECRET, BODY, NOW);
  assert.deepEqual(verifyBridgeSignature(SECRET, BODY, h, NOW + 10), { ok: true });
});
t('tampered body is rejected', () => {
  const h = signBridgeBody(SECRET, BODY, NOW);
  const r = verifyBridgeSignature(SECRET, BODY.replace('4900', '1'), h, NOW);
  assert.deepEqual(r, { ok: false, reason: 'bad_signature' });
});
t('wrong secret is rejected', () => {
  const h = signBridgeBody('other', BODY, NOW);
  assert.equal(verifyBridgeSignature(SECRET, BODY, h, NOW).ok, false);
});
t('old signature (replay) is rejected', () => {
  const h = signBridgeBody(SECRET, BODY, NOW);
  assert.deepEqual(verifyBridgeSignature(SECRET, BODY, h, NOW + 301), { ok: false, reason: 'expired' });
});
t('future-dated signature is rejected', () => {
  const h = signBridgeBody(SECRET, BODY, NOW + 1000);
  assert.deepEqual(verifyBridgeSignature(SECRET, BODY, h, NOW), { ok: false, reason: 'expired' });
});
t('timestamp swap is rejected', () => {
  const h = signBridgeBody(SECRET, BODY, NOW).replace(`t=${NOW}`, `t=${NOW + 5}`);
  assert.equal(verifyBridgeSignature(SECRET, BODY, h, NOW).ok, false);
});
t('missing and malformed headers', () => {
  assert.deepEqual(verifyBridgeSignature(SECRET, BODY, null, NOW), { ok: false, reason: 'missing' });
  assert.deepEqual(verifyBridgeSignature(SECRET, BODY, 'garbage', NOW), { ok: false, reason: 'malformed' });
  assert.deepEqual(verifyBridgeSignature(SECRET, BODY, `t=${NOW},v1=zz`, NOW), { ok: false, reason: 'malformed' });
});
t('a notify-style signature (plain secret) is not accepted', () => {
  const { createHmac } = require('node:crypto');
  const mac = createHmac('sha256', SECRET).update(`v1.${NOW}.${BODY}`).digest('hex');
  assert.equal(verifyBridgeSignature(SECRET, BODY, `t=${NOW},v1=${mac}`, NOW).ok, false);
});

console.log(`${n} passed`);
