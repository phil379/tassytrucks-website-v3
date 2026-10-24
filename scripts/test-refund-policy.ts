// The refund / cancellation numbers live in lib/refund-policy.ts and nowhere else.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANCELLATION, REFUND_POLICY_STATUS, freeCancellationSentence, REFUNDS_URL, PHIL_PROPOSED } from '../lib/refund-policy';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const ok = (n: string) => console.log(`ok - ${n}`);

// Numbers are sane percentages / hours.
for (const k of ['trip', 'treatmentDay'] as const) {
  assert.ok(CANCELLATION[k].freeUntilHoursBefore > 0);
  assert.ok(CANCELLATION[k].lateCancelFeePercent >= 0 && CANCELLATION[k].lateCancelFeePercent <= 100);
  assert.ok(CANCELLATION[k].noShowFeePercent >= CANCELLATION[k].lateCancelFeePercent);
}
assert.equal(CANCELLATION.tassyCancelsRefundPercent, 100);
ok('refund numbers are sane and a Tassy cancellation is a full refund');

// The booking email already promised "at least 4 hours ahead" (scripts/test-receipt.ts asserts it).
// The code's number is kept; Phil's proposed 2 hours is recorded, not used.
assert.equal(CANCELLATION.trip.freeUntilHoursBefore, 4);
assert.equal(PHIL_PROPOSED.tripFreeUntilHoursBefore, 2);
assert.ok(freeCancellationSentence().startsWith('No fee if you let us know at least 4 hours ahead'));
ok('free-cancellation sentence matches what the confirmation email already says');

// The numbers are not retyped on the page, the form or the email.
const page = read('app/refunds/page.tsx');
assert.ok(!/\b(50|100)%/.test(page), 'percentages must come from lib/refund-policy.ts');
assert.ok(/CANCELLATION\./.test(page));
ok('/refunds reads its numbers from the config');

// Linked from the places that matter.
assert.ok(read('components/request/RequestForm.tsx').includes('REFUNDS_PATH'), 'request form links the refund policy');
assert.ok(read('lib/confirmation-email.ts').includes('REFUNDS_URL'), 'confirmation email links the refund policy');
assert.ok(read('components/Footer.tsx').includes('/refunds'), 'footer links the refund policy');
assert.ok(REFUNDS_URL.endsWith('/refunds'));
ok('refund policy is linked from the form, the confirmation email and the footer');

assert.ok(REFUND_POLICY_STATUS === 'PROPOSED' || REFUND_POLICY_STATUS === 'APPROVED');
ok(`policy status: ${REFUND_POLICY_STATUS}`);
