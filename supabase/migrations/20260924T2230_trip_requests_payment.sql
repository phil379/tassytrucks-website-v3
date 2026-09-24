-- ─────────────────────────────────────────────────────────────────────────────
-- 20260924T2230_trip_requests_payment.sql
--
-- Record the payment link and the moment the money actually landed.
--
-- Until now the request pipeline ended at "we will call you". A dispatcher
-- could set a quote and advance the status, and the customer was told none of
-- it: lib/confirmation-email.ts was written and imported by nothing, and
-- generateConfirmationCode() was called by nothing. The columns
-- confirmation_code, confirmed_at, agreed_cents and payment_status have been
-- sitting empty since they were created.
--
-- These three close the loop:
--   payment_link_url        what we emailed the customer, so it can be resent
--   stripe_payment_link_id  what the webhook matches on, when metadata is thin
--   paid_at                 when Stripe told us the money arrived
--
-- WHY NOT CHARGE AT REQUEST TIME. The /request page says in as many words that
-- the figure is an estimate and a dispatcher confirms the exact price. Taking
-- money before a human has confirmed contradicts that in writing and turns
-- every correction into a refund. The link is created at confirmation, when the
-- number is real, and never before.
--
-- SAFETY. Additive only: three nullable columns, ADD COLUMN IF NOT EXISTS. No
-- drop, no rename, no type change, no NOT NULL, no backfill. Safe against a
-- live site and safe to run twice.
--
-- Target project: tassy-ops (knllznbdpejoaiexmdea).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.trip_requests
  add column if not exists payment_link_url       text,
  add column if not exists stripe_payment_link_id text,
  add column if not exists paid_at                timestamptz;

comment on column public.trip_requests.payment_link_url is
  'The Stripe payment link sent in the confirmation email. Kept so the link '
  'can be resent without creating a second one. NULL until the trip is '
  'confirmed, and whenever Stripe is not configured on the deployment.';
comment on column public.trip_requests.stripe_payment_link_id is
  'plink_... id, matched by the webhook when a session arrives without our '
  'metadata. Never a secret: it identifies a link, it does not authorize one.';
comment on column public.trip_requests.paid_at is
  'Set by the Stripe webhook, never by a human in /ops. payment_status says '
  'what we believe; this says when Stripe told us.';

commit;
