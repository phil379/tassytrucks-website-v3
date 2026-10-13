-- PROPOSED. NOT APPLIED. Applying it needs Phil's explicit approval.
--
-- Tassy Scholar: card on file and billing state, kept on the recurring schedule.
--
-- WHY standing_orders: it is the row that represents the committed plan (one per child
-- per plan), it already has a parent-direct owner, and TassyOps reads it. A card belongs
-- to the plan being billed, not to the child record.
--
-- NOTHING here stores a card number. Stripe keeps the card; we keep Stripe's ids and the
-- brand and last four digits that Stripe returns for display.
--
-- SAFE TO APPLY BEFORE OR AFTER THE CODE: the website writes these columns best-effort and
-- never lets a missing column fail a booking. Existing rows default to 'not_required'.
--
-- Run each statement on its own in the Supabase SQL editor (long multi-statement
-- migrations have timed out through the API before).

alter table public.standing_orders add column if not exists billing_status text not null default 'not_required';

alter table public.standing_orders add column if not exists stripe_customer_id text;

alter table public.standing_orders add column if not exists stripe_payment_method_id text;

alter table public.standing_orders add column if not exists card_brand text;

alter table public.standing_orders add column if not exists card_last4 text;

alter table public.standing_orders add column if not exists card_saved_at timestamptz;

-- Set by TassyOps when Phil approves and the monthly subscription is created.
alter table public.standing_orders add column if not exists stripe_subscription_id text;

alter table public.standing_orders add column if not exists billing_started_at timestamptz;

alter table public.standing_orders add column if not exists billing_started_by uuid;

alter table public.standing_orders add constraint standing_orders_billing_status_ck check (billing_status in ('not_required', 'card_pending', 'card_saved', 'active', 'canceled'));

-- Lets the admin list find bookings waiting on a card or on approval without a scan.
create index if not exists standing_orders_billing_status_idx on public.standing_orders (billing_status) where service_line = 'scholar';
