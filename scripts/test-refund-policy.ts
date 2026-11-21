// The refund / cancellation numbers live in lib/refund-policy.ts and nowhere else.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANCELLATION,
  CONCIERGE_PRICED_MAX_MILES,
  REFUND_POLICY_STATUS,
  conciergeLateCancelFeeText,
  conciergeNoShowFeeText,
  freeCancellationSentence,
  REFUNDS_URL,
  PHIL_PROPOSED,
} from '../lib/refund-policy';
import { cancellationHtml, cancellationText, type CancelledTrip } from '../lib/cancellation-email';
import type { TripRequestInput } from '../lib/trip-request';

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

// Phil DECIDED the trip window on 2026-11-18: 2 hours, the figure he proposed
// on 2026-10-24. The confirmation email derives its sentence from this file,
// so the promise and the policy move together (scripts/test-receipt.ts asserts
// the receipt's copy of the sentence).
assert.equal(CANCELLATION.trip.freeUntilHoursBefore, 2);
assert.ok(freeCancellationSentence().startsWith('No fee if you let us know at least 2 hours ahead'));
ok('trip free-cancellation window is 2 hours (Phil, decided 2026-11-18)');

// Treatment Day: Phil extended the Nov 18 decision to it the same evening
// ("Make Treatment Day 2 hours too"), superseding his Oct 24 24-hour figure —
// nothing is left in PHIL_PROPOSED.
assert.equal(CANCELLATION.treatmentDay.freeUntilHoursBefore, 2);
assert.equal('treatmentDayFreeUntilHoursBefore' in PHIL_PROPOSED, false);
ok('Treatment Day window is 2 hours too (Phil, decided 2026-11-18)');

// Phil DECIDED the late-cancel fee on 2026-11-19: 100% of the price,
// Uber-style, superseding the 50% set on 2026-11-18 — trips and Treatment
// Day alike. The window stayed 2 hours; only the fee moved. The held
// cancellation email and the ops held split read this number, so a drift
// here would silently re-promise riders a cheaper fee.
assert.equal(CANCELLATION.trip.lateCancelFeePercent, 100);
assert.equal(CANCELLATION.treatmentDay.lateCancelFeePercent, 100);
ok('late cancellation inside the window costs the full price (Phil, decided 2026-11-19)');

// Phil DECIDED on 2026-11-21: a Concierge late cancel costs the NO-SHOW
// amount — $35 flat, or 100% of the trip price on a long trip. The two fees
// share one constant in the config, so they must be equal here and stay
// equal; the long-trip boundary is the priced card's last band for both.
assert.equal(CANCELLATION.conciergeLateCancel.flatFeeCents, 3500);
assert.equal(CANCELLATION.conciergeLateCancel.flatFeeCents, CANCELLATION.conciergeNoShow.flatFeeCents);
assert.equal(CANCELLATION.conciergeLateCancel.longTripOverMiles, CONCIERGE_PRICED_MAX_MILES);
assert.equal(CANCELLATION.conciergeLateCancel.longTripOverMiles, CANCELLATION.conciergeNoShow.longTripOverMiles);
assert.equal(CANCELLATION.conciergeLateCancel.longTripFeePercent, 100);
assert.equal(conciergeLateCancelFeeText(), '$35');
assert.equal(conciergeLateCancelFeeText(), conciergeNoShowFeeText());
ok('Concierge late cancel costs the no-show amount: $35 flat, 100% over 30 miles (Phil, decided 2026-11-21)');

// The numbers are not retyped on the page, the form or the email.
const page = read('app/refunds/page.tsx');
assert.ok(!/\b(50|100)%/.test(page), 'percentages must come from lib/refund-policy.ts');
assert.ok(/CANCELLATION\./.test(page));
assert.ok(page.includes('conciergeLateCancel'), '/refunds Concierge row reads conciergeLateCancel from the config');
assert.ok(page.includes('data-testid="concierge-late-cancel"'), '/refunds marks the Concierge late-cancel cell');
ok('/refunds reads its numbers from the config');

// The rider's cancellation email for a charged Concierge late cancel states
// the amount actually kept — $35 of a $119 fare, $84 refunded — and never
// dresses the flat fee up as a percent (Phil, 2026-11-21). The amount comes
// from refundTrip (lib/ops-refund.ts): the charged fare minus the Stripe
// refund issued, passed in as feeKeptCents/fareCents.
const conciergeTrip = {
  serviceLine: 'concierge',
  pickupAddress: '100 N Tryon St, Charlotte, NC 28202',
  dropoffAddress: 'Charlotte Douglas Intl Airport, Charlotte, NC',
  requestedAt: '2026-11-22T15:00:00Z',
  contactFirstName: 'QA',
  contactLastName: 'Probe',
  contactPhone: '7045550100',
  contactEmail: 'qa@example.com',
} as TripRequestInput;
const partialCancel: CancelledTrip = {
  confirmationCode: 'TT-TEST35',
  refundCents: 8400,
  refundId: 're_test',
  feeKeptCents: 3500,
  fareCents: 11900,
};
const partialText = cancellationText(partialCancel, conciergeTrip);
assert.ok(partialText.includes('a late-cancellation fee of $35 was kept from your $119 fare'));
assert.ok(partialText.includes('the remaining $84 has been refunded'));
assert.ok(!partialText.includes('100%'), 'a flat $35 fee must never be stated as a percent');
const partialHtml = cancellationHtml(partialCancel, conciergeTrip);
assert.ok(partialHtml.includes('late-cancellation fee of $35'));
assert.ok(!partialHtml.includes('100% fee'), 'a flat $35 fee must never be stated as a percent');
// The dormant held variant obeys the same rule when the fee it derives is
// a flat amount rather than the policy percent of the fare.
const heldFlatText = cancellationText(
  { confirmationCode: 'TT-TEST35', refundCents: 8400, refundHeld: true, fareCents: 11900 },
  conciergeTrip,
);
assert.ok(heldFlatText.includes('a late-cancellation fee of $35 is kept from your $119 fare'));
assert.ok(!heldFlatText.includes('100% fee'), 'the held copy must not call a flat fee a percent either');
ok('cancellation email states the $35 actually kept on a Concierge late cancel, never a percent');

// Linked from the places that matter.
assert.ok(read('components/request/RequestForm.tsx').includes('REFUNDS_PATH'), 'request form links the refund policy');
assert.ok(read('lib/confirmation-email.ts').includes('REFUNDS_URL'), 'confirmation email links the refund policy');
assert.ok(read('components/Footer.tsx').includes('/refunds'), 'footer links the refund policy');
assert.ok(REFUNDS_URL.endsWith('/refunds'));
ok('refund policy is linked from the form, the confirmation email and the footer');

assert.ok(REFUND_POLICY_STATUS === 'PROPOSED' || REFUND_POLICY_STATUS === 'APPROVED');
ok(`policy status: ${REFUND_POLICY_STATUS}`);
