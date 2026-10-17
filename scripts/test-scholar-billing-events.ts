// Unit tests for the Scholar monthly-billing events in lib/school-billing.ts.
// Run: bun run scripts/test-scholar-billing-events.ts
import assert from 'node:assert/strict';
import { applySubscriptionEvent, subscriptionIdOf } from '../lib/school-billing';

type Row = { id: string; billing_status: string; billing_past_due_at: string | null; stripe_subscription_id: string };

// A tiny stand-in for the Supabase query chain these helpers use.
function fakeDb(rows: Row[], opts: { failRead?: boolean; failWrite?: boolean } = {}) {
  const writes: Array<Record<string, unknown>> = [];
  const db = {
    from() {
      return {
        select() {
          return {
            eq(_col: string, value: string) {
              return {
                maybeSingle: async () =>
                  opts.failRead
                    ? { data: null, error: { message: 'read failed' } }
                    : { data: rows.find((r) => r.stripe_subscription_id === value) ?? null, error: null },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq: async (_col: string, id: string) => {
              if (opts.failWrite) return { error: { message: 'write failed' } };
              writes.push(patch);
              const row = rows.find((r) => r.id === id);
              if (row) Object.assign(row, patch);
              return { error: null };
            },
          };
        },
      };
    },
  };
  return { db: db as never, writes };
}

const row = (over: Partial<Row> = {}): Row => ({
  id: 'so-1',
  billing_status: 'active',
  billing_past_due_at: null,
  stripe_subscription_id: 'sub_123',
  ...over,
});

let n = 0;
const t = async (name: string, fn: () => Promise<void> | void) => {
  await fn();
  n++;
  console.log('ok -', name);
};

const NOW = new Date('2026-10-20T12:00:00Z');

await t('subscription id: plain field, object field, nested parent, and the deleted event', () => {
  assert.equal(subscriptionIdOf('invoice.paid', { subscription: 'sub_a' }), 'sub_a');
  assert.equal(subscriptionIdOf('invoice.paid', { subscription: { id: 'sub_b' } }), 'sub_b');
  assert.equal(subscriptionIdOf('invoice.paid', { parent: { subscription_details: { subscription: 'sub_c' } } }), 'sub_c');
  assert.equal(subscriptionIdOf('customer.subscription.deleted', { id: 'sub_d' }), 'sub_d');
  assert.equal(subscriptionIdOf('invoice.paid', {}), null);
  assert.equal(subscriptionIdOf('invoice.paid', undefined), null);
});

await t('failed payment marks an active plan past due and stamps the day', async () => {
  const { db, writes } = fakeDb([row()]);
  const r = await applySubscriptionEvent(db, 'invoice.payment_failed', { subscription: 'sub_123' }, NOW);
  assert.equal(r.handled, 'past_due');
  assert.equal(writes[0].billing_status, 'past_due');
  assert.equal(writes[0].billing_past_due_at, NOW.toISOString());
});

await t('a second failed retry changes nothing and does not alert again', async () => {
  const { db, writes } = fakeDb([row({ billing_status: 'past_due', billing_past_due_at: '2026-10-18T00:00:00Z' })]);
  const r = await applySubscriptionEvent(db, 'invoice.payment_failed', { subscription: 'sub_123' }, NOW);
  assert.equal(r.handled, 'noop');
  assert.equal(writes.length, 0);
});

await t('a payment after a failure puts the plan back to active and clears the clock', async () => {
  const { db, writes } = fakeDb([row({ billing_status: 'past_due', billing_past_due_at: '2026-10-18T00:00:00Z' })]);
  const r = await applySubscriptionEvent(db, 'invoice.paid', { subscription: 'sub_123' }, NOW);
  assert.equal(r.handled, 'recovered');
  assert.equal(writes[0].billing_status, 'active');
  assert.equal(writes[0].billing_past_due_at, null);
});

await t('the normal monthly payment on an active plan is a no-op', async () => {
  const { db, writes } = fakeDb([row()]);
  const r = await applySubscriptionEvent(db, 'invoice.paid', { subscription: 'sub_123' }, NOW);
  assert.equal(r.handled, 'noop');
  assert.equal(writes.length, 0);
});

await t('an ended subscription marks the plan cancelled', async () => {
  const { db, writes } = fakeDb([row()]);
  const r = await applySubscriptionEvent(db, 'customer.subscription.deleted', { id: 'sub_123' }, NOW);
  assert.equal(r.handled, 'canceled');
  assert.equal(writes[0].billing_status, 'canceled');
  assert.equal(writes[0].billing_canceled_at, NOW.toISOString());
});

await t('a cancelled plan is never moved to past due or active by a late event', async () => {
  const { db, writes } = fakeDb([row({ billing_status: 'canceled' })]);
  assert.equal((await applySubscriptionEvent(db, 'invoice.payment_failed', { subscription: 'sub_123' }, NOW)).handled, 'noop');
  assert.equal((await applySubscriptionEvent(db, 'invoice.paid', { subscription: 'sub_123' }, NOW)).handled, 'noop');
  assert.equal(writes.length, 0);
});

await t('a subscription we do not own (facility invoice, other business) is ignored', async () => {
  const { db, writes } = fakeDb([row()]);
  assert.equal((await applySubscriptionEvent(db, 'invoice.payment_failed', { subscription: 'sub_other' }, NOW)).handled, 'not_ours');
  assert.equal((await applySubscriptionEvent(db, 'invoice.payment_failed', {}, NOW)).handled, 'not_ours');
  assert.equal(writes.length, 0);
});

await t('database trouble asks Stripe to retry', async () => {
  const read = fakeDb([row()], { failRead: true });
  assert.equal((await applySubscriptionEvent(read.db, 'invoice.payment_failed', { subscription: 'sub_123' }, NOW)).retry, true);
  const write = fakeDb([row()], { failWrite: true });
  assert.equal((await applySubscriptionEvent(write.db, 'customer.subscription.deleted', { id: 'sub_123' }, NOW)).retry, true);
});

console.log(`\n${n} tests passed`);
