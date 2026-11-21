import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldShowPickHint } from '../lib/address-match';
import { surchargesFor } from '../lib/quote';
import { PLAN_INTERESTS, householdRequestSchema } from '../lib/school-household';
import { COPY } from '../lib/trip-request';

/**
 * Website copy batch, 2026-11-16 — memo items 25 and 29, the household
 * plan-interest question, the Winnie sub-page accounting, and the item 28
 * decision pin. Each test names the behaviour it protects; the README in
 * files/website-copy-batch/ carries the before/after evidence.
 */

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/* ── Item 25: the "tap your address" line follows typed, unpicked text ── */

const hint = (over: Partial<Parameters<typeof shouldShowPickHint>[0]> = {}) =>
  shouldShowPickHint({
    listOpen: false,
    hasResolved: false,
    suggestionsReady: true,
    needsPick: false,
    typed: true,
    text: 'Charlotte',
    minQueryLength: 3,
    ...over,
  });

t('item 25: a vague typed address with nothing picked shows the line', () => {
  // The Nov 13 failure: "Charlotte" alone, several suggestions, no pick.
  // The predicate takes no suggestion count, so no count can suppress it.
  assert.equal(hint(), true);
});

t('item 25: a fragment Google answers with nothing still shows the line', () => {
  assert.equal(hint({ text: 'Pruitt' }), true);
});

t('item 25: while the list is open, the line rides on the list instead', () => {
  assert.equal(hint({ listOpen: true }), false);
});

t('item 25: a picked address, or suggestions not working, shows nothing', () => {
  assert.equal(hint({ hasResolved: true }), false);
  assert.equal(hint({ suggestionsReady: false }), false);
});

t('item 25: untouched prefilled text is not "typed", but a failed blur match still shows the line', () => {
  assert.equal(hint({ typed: false }), false);
  assert.equal(hint({ typed: false, needsPick: true }), true);
});

t('item 25: text too short to search for shows nothing yet', () => {
  assert.equal(hint({ text: 'ab' }), false);
  assert.equal(hint({ text: '   ' }), false);
});

t('item 25: the component asks the shared rule, not a suggestion count', () => {
  const src = read('components/request/AddressAutocomplete.tsx');
  assert.ok(src.includes('shouldShowPickHint({'));
  assert.ok(!src.includes("suggestions.length > 0))"), 'the count-based condition is gone');
});

/* ── Item 29: the payment sentence, per flow ─────────────────────────── */

t('item 29: Scholar says it in the shared words, plus the monthly fact', () => {
  assert.equal(
    COPY.howYouPay,
    'We confirm your price first, then send a secure link to pay. No card is taken on this form.',
  );
  assert.equal(
    COPY.howYouPayScholar,
    'We confirm your price first, then send a secure link to pay. Scholar is billed monthly. No card is taken on this form.',
  );
  // Removing the monthly clause leaves the shared sentence, word for word.
  assert.equal(COPY.howYouPayScholar.replace(' Scholar is billed monthly.', ''), COPY.howYouPay);
});

t('pay at booking (Phil, 2026-11-20): the firm-price lines carry their own sentence', () => {
  // Care / Recovery / Concierge / Winnie pay when they book; the sentence above
  // stays for Scholar and the review-first lines. Both halves of the new
  // sentence are load-bearing: the price is seen BEFORE paying, and the card
  // still never touches this form.
  assert.equal(
    COPY.howYouPayAtBooking,
    'Your price is shown before you book, and you pay it when you book, on a secure payment page. No card is taken on this form.',
  );
  assert.equal(
    COPY.confirmationPayAtBooking,
    'A dispatcher usually confirms your driver and your price within 2 hours during business hours. You see the price before you pay, and you pay it when you book. If anything about the trip changes, you hear the new price from us first.',
  );
});

/* ── Household form: the plan-interest question ──────────────────────── */

const householdBase = {
  guardian_name: 'Pat Parent',
  email: 'pat@example.com',
  phone: '7045550123',
  home_address: '2513 Pruitt St, Charlotte, NC 28208',
  child_count: 2,
  children: [
    { school_name: 'Myers Park High', grade_or_age: '10' },
    { school_name: 'Myers Park High', grade_or_age: '8' },
  ],
  direction: 'round_trip',
  desired_start: '2026-11-23',
  schedule_notes: 'Pickup 7 AM, dismissal 3 PM, Monday to Friday.',
  consent_contact: true,
};

t('plan interest: the choices on the form are the values the schema stores', () => {
  assert.deepEqual(
    PLAN_INTERESTS.map((p) => p.key),
    ['full-year', 'weekly', 'after-school'],
  );
  assert.deepEqual(
    PLAN_INTERESTS.map((p) => p.label),
    ['Full Year', 'Weekly per-ride', 'After-school'],
  );
});

t('plan interest: optional — absent and null both submit exactly as before', () => {
  assert.equal(householdRequestSchema.safeParse(householdBase).success, true);
  assert.equal(householdRequestSchema.safeParse({ ...householdBase, plan_interest: null }).success, true);
});

t('plan interest: each stored value round-trips through the schema', () => {
  for (const key of ['full-year', 'weekly', 'after-school'] as const) {
    const parsed = householdRequestSchema.safeParse({ ...householdBase, plan_interest: key });
    assert.equal(parsed.success, true, key);
    if (parsed.success) assert.equal(parsed.data.plan_interest, key);
  }
  // The stored values are hyphenated; an underscored guess is not accepted.
  assert.equal(householdRequestSchema.safeParse({ ...householdBase, plan_interest: 'full_year' }).success, false);
});

t('plan interest: the form asks the question and the route stores the answer', () => {
  const form = read('components/school/HouseholdRequestForm.tsx');
  assert.ok(form.includes('Which plan are you interested in?'));
  assert.ok(form.includes('PLAN_INTERESTS'));
  assert.ok(form.includes("plan_interest: planInterest === '' ? null : planInterest"));
  const route = read('app/api/school-household-request/route.ts');
  assert.ok(route.includes('plan_interest: d.plan_interest ?? null'));
});

/* ── Winnie sub-pages: no tier pricing today; clarity if it ever lands ── */

const WINNIE_SUBPAGES = [
  'pet-transport',
  'vet-appointment-rides',
  'post-surgery-pet-transport',
  'calm-pet-transport',
  'dog-grooming-pickup',
  'pet-boarding-transport',
];

t('winnie sub-pages: any tier list that appears must state the weekend and second-pet charges', () => {
  for (const slug of WINNIE_SUBPAGES) {
    const src = read(`app/charlotte/${slug}/page.tsx`);
    if (/features:\s*\[/.test(src)) {
      assert.ok(src.includes("'Second pet $15'"), slug);
      assert.ok(src.includes("'Weekends +$20'"), slug);
    }
  }
});

/* ── Item 28: a recorded pricing decision, pinned — NOT a copy gap ───── */

t("item 28: Concierge carries no after-hours surcharge (Phil, 2026-10-14) — the estimate's silence is the decision", () => {
  // lib/quote.ts: surchargesFor skips the After hours charge for Concierge
  // on purpose ("the airport run is the job"). The shared estimate note is
  // built from surchargesFor, so Concierge's no-date line names only the
  // weekend add — because that is the only add there is. Care, which does
  // charge it, names it. If Phil reverses the 2026-10-14 call, this test is
  // supposed to fail and force the copy conversation with the price change.
  const concierge5am = surchargesFor('2026-11-17T05:00', 'concierge');
  assert.ok(!concierge5am.some((s) => s.label === 'After hours'));
  const care5am = surchargesFor('2026-11-17T05:00', 'care');
  assert.ok(care5am.some((s) => s.label === 'After hours' && s.cents === 2500));
  const conciergeSat = surchargesFor('2026-11-14T12:00', 'concierge');
  assert.ok(conciergeSat.some((s) => s.label === 'Weekend' && s.cents === 2000));
});

console.log(`${n} passed`);
