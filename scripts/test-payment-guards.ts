// Unit tests for the payment-safety guards: double-payment detection (webhook), the /pay block rules,
// the re-confirm plan, the owner alert, and the /ops login lockout. Run: bun run scripts/test-payment-guards.ts
import assert from 'node:assert/strict';
import {
  classifyAlreadyPaid,
  handleAlreadyPaid,
  parsePaymentNote,
  paymentNote,
  recordFirstPayment,
  type DoublePaymentAlert,
} from '../lib/double-payment';
import { payBlockFor, payBlockMessage } from '../lib/pay-guard';
import { planConfirm } from '../lib/confirm-plan';
import { notifyOperatorPossibleDoublePayment } from '../lib/notifications';
import {
  FAILURE_DELAY_MS,
  MAX_FAILURES_GLOBAL,
  MAX_FAILURES_PER_IP,
  WINDOW_MS,
  __resetOpsLoginMemory,
  beginOpsLogin,
  ipFingerprint,
} from '../lib/ops-login-guard';

let n = 0;
const t = async (name: string, fn: () => Promise<void> | void) => {
  await fn();
  n++;
  console.log('ok -', name);
};

// ── a tiny in-memory stand-in for the audit_log queries these helpers use ────────────────────────
type AuditRow = { id: string; action: string; entity_type: string; entity_id?: string; notes?: string; created_at: string };
function fakeAudit(opts: { failInsert?: boolean; failSelect?: boolean } = {}) {
  const rows: AuditRow[] = [];
  let seq = 0;
  const db = {
    from(table: string) {
      assert.equal(table, 'audit_log');
      return {
        insert(row: Record<string, unknown>) {
          let result: { data: unknown; error: { message: string } | null } | null = null;
          const exec = () => {
            if (result) return result;
            if (opts.failInsert) return (result = { data: null, error: { message: 'insert failed' } });
            const r = { id: `a${++seq}`, created_at: new Date().toISOString(), ...row } as AuditRow;
            rows.push(r);
            return (result = { data: r, error: null });
          };
          return {
            select: () => ({ single: async () => exec() }),
            then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(exec()).then(res, rej),
          };
        },
        select(_cols: string, o?: { count?: string; head?: boolean }) {
          const filters: Array<(r: AuditRow) => boolean> = [];
          const q: Record<string, unknown> = {
            eq: (c: string, v: unknown) => (filters.push((r) => (r as never)[c] === v), q),
            in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes((r as never)[c])), q),
            gte: (c: string, v: string) => (filters.push((r) => (r as unknown as Record<string, string>)[c] >= v), q),
            order: () => q,
            then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
              if (opts.failSelect) return Promise.resolve({ data: null, count: null, error: { message: 'select failed' } }).then(res, rej);
              const hit = rows.filter((r) => filters.every((f) => f(r)));
              return Promise.resolve(
                o?.head ? { data: null, count: hit.length, error: null } : { data: hit, error: null },
              ).then(res, rej);
            },
          };
          return q;
        },
        update(patch: Record<string, unknown>) {
          return {
            eq: async (_c: string, id: string) => {
              const r = rows.find((x) => x.id === id);
              if (r) Object.assign(r, patch);
              return { error: null };
            },
          };
        },
      };
    },
  };
  return { db: db as never, rows };
}

const TRIP = { id: '11111111-2222-3333-4444-555555555555', trip_number: 'T-20261018-0007', agreed_cents: 8455, quoted_cents: null };

// ── 1. double payment ────────────────────────────────────────────────────────────────────────────
await t('payment note round-trips and a missing id is not invented', () => {
  const note = paymentNote({ sessionId: 'cs_1', paymentIntentId: null }, 8455);
  assert.deepEqual(parsePaymentNote(note), { sessionId: 'cs_1', paymentIntentId: null, amountCents: 8455 });
  assert.equal(parsePaymentNote('session=- pi=- amount=-'), null);
  assert.equal(parsePaymentNote(null), null);
});

await t('classify: same session or same payment intent is a repeat; different ids are a double', () => {
  const first = { sessionId: 'cs_1', paymentIntentId: 'pi_1' };
  assert.equal(classifyAlreadyPaid({ sessionId: 'cs_1', paymentIntentId: 'pi_1' }, first), 'repeat');
  assert.equal(classifyAlreadyPaid({ sessionId: 'cs_1', paymentIntentId: null }, first), 'repeat');
  assert.equal(classifyAlreadyPaid({ sessionId: 'cs_9', paymentIntentId: 'pi_1' }, first), 'repeat');
  assert.equal(classifyAlreadyPaid({ sessionId: 'cs_2', paymentIntentId: 'pi_2' }, first), 'possible_double');
  assert.equal(classifyAlreadyPaid({ sessionId: 'cs_2', paymentIntentId: null }, first), 'possible_double');
  assert.equal(classifyAlreadyPaid({ sessionId: 'cs_2', paymentIntentId: 'pi_2' }, null), 'possible_double_unverified');
  assert.equal(classifyAlreadyPaid({ sessionId: null, paymentIntentId: null }, first), 'possible_double_unverified');
});

await t('a Stripe retry of the SAME session stays a silent no-op', async () => {
  const { db } = fakeAudit();
  await recordFirstPayment(db, TRIP.id, { sessionId: 'cs_1', paymentIntentId: 'pi_1' }, 8455);
  const alerts: DoublePaymentAlert[] = [];
  const out = await handleAlreadyPaid(
    db,
    { trip: TRIP, current: { sessionId: 'cs_1', paymentIntentId: 'pi_1' }, amountTotal: 8455, currency: 'usd' },
    async (a) => void alerts.push(a),
  );
  assert.equal(out, 'repeat');
  assert.equal(alerts.length, 0);
});

await t('a DIFFERENT session for a paid trip alerts the owner once, with both ids and amounts, and never refunds', async () => {
  const { db, rows } = fakeAudit();
  await recordFirstPayment(db, TRIP.id, { sessionId: 'cs_1', paymentIntentId: 'pi_1' }, 8455);
  const alerts: DoublePaymentAlert[] = [];
  const notify = async (a: DoublePaymentAlert) => void alerts.push(a);
  const input = { trip: TRIP, current: { sessionId: 'cs_2', paymentIntentId: 'pi_2' }, amountTotal: 8455, currency: 'usd' };
  assert.equal(await handleAlreadyPaid(db, input, notify), 'alerted');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].tripNumber, 'T-20261018-0007');
  assert.equal(alerts[0].tripAmountCents, 8455);
  assert.equal(alerts[0].first?.sessionId, 'cs_1');
  assert.equal(alerts[0].first?.amountCents, 8455);
  assert.equal(alerts[0].second.sessionId, 'cs_2');
  assert.equal(alerts[0].second.paymentIntentId, 'pi_2');
  assert.equal(alerts[0].verified, true);
  assert.ok(rows.some((r) => r.action === 'stripe.possible_double_payment'));
  // Stripe re-delivers the same second event: no second alert.
  assert.equal(await handleAlreadyPaid(db, input, notify), 'already_alerted');
  assert.equal(alerts.length, 1);
});

await t('a trip paid before ids were kept alerts as "unverified"; the alert helper failing does not throw', async () => {
  const { db } = fakeAudit();
  const alerts: DoublePaymentAlert[] = [];
  const out = await handleAlreadyPaid(
    db,
    { trip: TRIP, current: { sessionId: 'cs_2', paymentIntentId: 'pi_2' }, amountTotal: 8455, currency: 'usd' },
    async (a) => {
      alerts.push(a);
      throw new Error('push is down');
    },
  );
  assert.equal(out, 'alerted');
  assert.equal(alerts[0].verified, false);
  assert.equal(alerts[0].first, null);
});

await t('an unreadable audit log asks Stripe to retry instead of guessing', async () => {
  const { db } = fakeAudit({ failSelect: true });
  let called = false;
  const out = await handleAlreadyPaid(
    db,
    { trip: TRIP, current: { sessionId: 'cs_2', paymentIntentId: 'pi_2' } },
    async () => void (called = true),
  );
  assert.equal(out, 'retry');
  assert.equal(called, false);
});

await t('recording the paying session never throws, even when the log is down', async () => {
  const { db } = fakeAudit({ failInsert: true });
  await recordFirstPayment(db, TRIP.id, { sessionId: 'cs_1', paymentIntentId: 'pi_1' }, 100);
});

await t('the owner alert says "possible double payment" with trip number, amounts and both Stripe ids; push stays PII-free', async () => {
  const sent: Array<{ url: string; body: string }> = [];
  const realFetch = globalThis.fetch;
  const env = { ...process.env };
  process.env.NTFY_TOPIC = 'test-topic';
  process.env.OPERATOR_EMAIL = 'phil@tassytrucks.com';
  process.env.RESEND_API_KEY = 're_test';
  delete process.env.ZAPIER_SMS_WEBHOOK_URL;
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    sent.push({ url: String(url), body: String(init.body) });
    return new Response('{}', { status: 200 });
  }) as never;
  try {
    await notifyOperatorPossibleDoublePayment({
      tripId: TRIP.id,
      tripNumber: TRIP.trip_number,
      tripAmountCents: 8455,
      first: { sessionId: 'cs_first', paymentIntentId: 'pi_first', amountCents: 8455 },
      second: { sessionId: 'cs_second', paymentIntentId: 'pi_second', amountCents: 8455, currency: 'usd' },
      verified: true,
    });
  } finally {
    globalThis.fetch = realFetch;
    process.env = env;
  }
  const email = sent.find((s) => s.url.includes('resend'));
  assert.ok(email, 'an email was sent');
  const mail = JSON.parse(email.body);
  assert.deepEqual(mail.to, ['phil@tassytrucks.com']);
  assert.match(mail.subject, /POSSIBLE DOUBLE PAYMENT/);
  for (const needle of ['T-20261018-0007', 'cs_first', 'pi_first', 'cs_second', 'pi_second', '$84.55', 'Nothing has been refunded']) {
    assert.ok(mail.text.includes(needle), `email mentions ${needle}`);
  }
  const push = sent.find((s) => s.url.includes('ntfy'));
  assert.ok(push, 'a push was sent');
  assert.ok(!/cs_|pi_|\$84/.test(push.body), 'push carries no amounts or Stripe ids');
});

// ── 2. /pay block rules ──────────────────────────────────────────────────────────────────────────
await t('/pay: only an unpaid, not-cancelled trip gets a checkout', () => {
  assert.equal(payBlockFor({ status: 'confirmed', payment_status: 'unpaid' }), null);
  assert.equal(payBlockFor({ status: 'completed', payment_status: 'unpaid' }), null);
  assert.equal(payBlockFor({ status: 'confirmed', payment_status: null }), null);
  assert.equal(payBlockFor({ status: 'cancelled', payment_status: 'unpaid' }), 'cancelled');
  assert.equal(payBlockFor({ status: 'confirmed', payment_status: 'on_account' }), 'on_account');
  assert.equal(payBlockFor({ status: 'cancelled', payment_status: 'on_account' }), 'on_account');
  assert.equal(payBlockFor({ status: 'cancelled', payment_status: 'refunded' }), 'refunded');
  assert.equal(payBlockFor({ status: 'confirmed', payment_status: 'something_new' }), 'not_payable');
});

await t('/pay: every block has a friendly message with the phone number and no checkout', () => {
  for (const b of ['cancelled', 'on_account', 'refunded', 'not_payable'] as const) {
    const m = payBlockMessage(b);
    assert.ok(m.title.length > 0 && m.body.includes('(704) 941-8508'));
    assert.ok([200, 410].includes(m.status));
  }
});

// ── 3. re-confirm plan ───────────────────────────────────────────────────────────────────────────
await t('re-confirm never flips a paid trip, or overwrites its price', () => {
  const p = planConfirm({
    row: { status: 'confirmed', payment_status: 'paid', agreed_cents: 8455 },
    requestedCents: 5000,
    onAccount: true,
    existingLink: true,
    attemptCents: 8455,
  });
  assert.equal(p.nextPaymentStatus, 'paid');
  assert.equal(p.agreedCentsToWrite, 8455);
  assert.equal(p.amountCents, 8455);
  assert.equal(p.payableNow, false);
});

await t('re-confirm does not reopen a closed trip or re-price it, and never lets on_account/refunded change', () => {
  const closed = planConfirm({
    row: { status: 'cancelled', payment_status: 'unpaid', agreed_cents: 7000 },
    requestedCents: 9000,
    onAccount: false,
    existingLink: false,
  });
  assert.equal(closed.nextStatus, 'cancelled');
  assert.equal(closed.agreedCentsToWrite, 7000);
  assert.equal(closed.payableNow, false);
  const acct = planConfirm({ row: { status: 'confirmed', payment_status: 'on_account', agreed_cents: 7000 }, requestedCents: 7000, onAccount: false, existingLink: false });
  assert.equal(acct.nextPaymentStatus, 'on_account');
  assert.equal(acct.payableNow, false);
  const refunded = planConfirm({ row: { status: 'cancelled', payment_status: 'refunded', agreed_cents: 7000 }, requestedCents: 7000, onAccount: true, existingLink: false });
  assert.equal(refunded.nextPaymentStatus, 'refunded');
});

await t('re-confirm: a normal first confirm and an unpaid -> on_account decision still work', () => {
  const first = planConfirm({ row: { status: 'new', payment_status: 'unpaid', agreed_cents: null }, requestedCents: 8455, onAccount: false, existingLink: false });
  assert.deepEqual([first.nextStatus, first.nextPaymentStatus, first.agreedCentsToWrite, first.payableNow], ['confirmed', 'unpaid', 8455, true]);
  const acct = planConfirm({ row: { status: 'new', payment_status: null, agreed_cents: null }, requestedCents: 8455, onAccount: true, existingLink: false });
  assert.deepEqual([acct.nextPaymentStatus, acct.payableNow], ['on_account', false]);
  const done = planConfirm({ row: { status: 'completed', payment_status: 'unpaid', agreed_cents: null }, requestedCents: 6000, onAccount: false, existingLink: false });
  assert.deepEqual([done.nextStatus, done.agreedCentsToWrite, done.payableNow], ['completed', 6000, true]);
});

await t('resend with an existing link: email, receipt and agreed_cents follow the amount /pay will charge', () => {
  const p = planConfirm({ row: { status: 'confirmed', payment_status: 'unpaid', agreed_cents: 8455 }, requestedCents: 9000, onAccount: false, existingLink: true, attemptCents: 8455 });
  assert.equal(p.amountCents, 8455);
  assert.equal(p.agreedCentsToWrite, 8455);
  assert.equal(p.amountOverridden, true);
  // A legacy link (no attempt row): /pay charges the stored agreed price.
  const legacy = planConfirm({ row: { status: 'confirmed', payment_status: 'unpaid', agreed_cents: 8455 }, requestedCents: 9000, onAccount: false, existingLink: true, attemptCents: null });
  assert.equal(legacy.amountCents, 8455);
  // Same price resent: nothing is overridden.
  const same = planConfirm({ row: { status: 'confirmed', payment_status: 'unpaid', agreed_cents: 8455 }, requestedCents: 8455, onAccount: false, existingLink: true, attemptCents: 8455 });
  assert.equal(same.amountOverridden, false);
});

// ── 4. /ops login lockout ────────────────────────────────────────────────────────────────────────
process.env.OPS_PASSWORD = 'unit-test-secret';
const failOnce = async (db: never, ip: string, now?: number) => {
  const a = await beginOpsLogin(() => db, ip, now);
  if (a.allowed) await a.finish('failed');
  else await a.finish('refused');
  return a.allowed;
};

await t('login: 5 wrong passwords from one IP are allowed, the 6th is refused, even with the right password', async () => {
  __resetOpsLoginMemory();
  const { db } = fakeAudit();
  for (let i = 0; i < MAX_FAILURES_PER_IP; i++) assert.equal(await failOnce(db, '203.0.113.9'), true, `attempt ${i + 1}`);
  assert.equal(await failOnce(db, '203.0.113.9'), false);
  const right = await beginOpsLogin(() => db, '203.0.113.9');
  assert.equal(right.allowed, false);
});

await t('login: another IP is unaffected; refused attempts do not extend the lockout', async () => {
  __resetOpsLoginMemory();
  const { db, rows } = fakeAudit();
  for (let i = 0; i < 8; i++) await failOnce(db, '203.0.113.9');
  assert.equal(rows.filter((r) => r.action === 'ops_login.failed').length, MAX_FAILURES_PER_IP);
  assert.ok(rows.filter((r) => r.action === 'ops_login.refused').length >= 3);
  const other = await beginOpsLogin(() => db, '198.51.100.4');
  assert.equal(other.allowed, true);
});

await t('login: a correct password is not counted as a failure', async () => {
  __resetOpsLoginMemory();
  const { db, rows } = fakeAudit();
  for (let i = 0; i < 10; i++) {
    const a = await beginOpsLogin(() => db, '203.0.113.20');
    assert.equal(a.allowed, true);
    await a.finish('ok');
  }
  assert.equal(rows.filter((r) => r.action === 'ops_login.failed').length, 0);
  assert.equal(rows.filter((r) => r.action === 'ops_login.ok').length, 10);
});

await t('login: the whole gate locks after 30 failures across many IPs', async () => {
  __resetOpsLoginMemory();
  const { db } = fakeAudit();
  for (let i = 0; i < MAX_FAILURES_GLOBAL; i++) assert.equal(await failOnce(db, `192.0.2.${i}`), true);
  assert.equal(await failOnce(db, '192.0.2.200'), false);
});

await t('login: parallel guesses cannot slip past the check together', async () => {
  __resetOpsLoginMemory();
  const { db } = fakeAudit();
  const results = await Promise.all(Array.from({ length: 12 }, () => beginOpsLogin(() => db, '203.0.113.50')));
  const allowed = results.filter((r) => r.allowed).length;
  assert.ok(allowed <= MAX_FAILURES_PER_IP, `only ${MAX_FAILURES_PER_IP} may proceed, got ${allowed}`);
});

await t('login: the lockout ends once the 15-minute window has passed', async () => {
  __resetOpsLoginMemory();
  const { db } = fakeAudit();
  for (let i = 0; i < 6; i++) await failOnce(db, '203.0.113.9');
  assert.equal((await beginOpsLogin(() => db, '203.0.113.9')).allowed, false);
  const later = Date.now() + WINDOW_MS + 60_000;
  assert.equal((await beginOpsLogin(() => db, '203.0.113.9', later)).allowed, true);
});

await t('login: stored rows hold a hash, never the IP or a password; delay is a constant', async () => {
  __resetOpsLoginMemory();
  const { db, rows } = fakeAudit();
  await failOnce(db, '203.0.113.77');
  const dump = JSON.stringify(rows);
  assert.ok(!dump.includes('203.0.113.77'));
  assert.ok(!dump.includes('unit-test-secret'));
  assert.ok(dump.includes(ipFingerprint('203.0.113.77')));
  assert.ok(FAILURE_DELAY_MS >= 500 && FAILURE_DELAY_MS <= 3000);
});

await t('login: with the database down, the in-memory counter still locks (never open)', async () => {
  __resetOpsLoginMemory();
  const { db } = fakeAudit({ failInsert: true });
  for (let i = 0; i < MAX_FAILURES_PER_IP; i++) assert.equal(await failOnce(db, '203.0.113.88'), true);
  assert.equal(await failOnce(db, '203.0.113.88'), false);
});

console.log(`\n${n} tests passed`);
