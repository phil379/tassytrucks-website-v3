-- ============================================================================
-- facilities.requested_billing_mode
-- Project: knllznbdpejoaiexmdea (tassy-ops)
-- Additive only. One nullable column. Safe to re-run.
--
-- WHY A COLUMN AND NOT A NOTE.
--
-- Weekly invoicing is a credit account, so the facility lands on
-- status='pending' and is approved by hand. That left a dead window: onboarding
-- finished, but they could not book. Screen 3 closes it — "I need to book
-- before then" stores billing_mode='patient_card', which canBook() already
-- allows while pending, and Phil switches them to invoice_weekly on approval.
--
-- But then the row says patient_card and nothing records what they ASKED for.
-- The first implementation wrote a magic string into `notes`. That breaks the
-- first time anyone types a real note into that field, and an approval queue
-- cannot be built on a substring search of free text. This is the predicate:
--
--   select * from facilities
--    where status = 'pending' and requested_billing_mode = 'invoice_weekly';
--
-- Only set when they bridged. A facility that chose weekly and did NOT bridge
-- already reads billing_mode='invoice_weekly' with status='pending', which is
-- unambiguous on its own — so this stays null for them rather than duplicating
-- a fact the row already states.
-- ============================================================================

alter table public.facilities
  add column if not exists requested_billing_mode text;

comment on column public.facilities.requested_billing_mode is
  'What the facility asked for at signup when it differs from billing_mode. '
  'Set to invoice_weekly only when they chose weekly AND bridged onto '
  'patient_card so they could book before approval. NULL otherwise — '
  'billing_mode is then already the answer. This is the approval-queue '
  'predicate: status=pending and requested_billing_mode=invoice_weekly.';

-- The approval queue reads exactly this pair, so index it.
create index if not exists facilities_pending_credit_idx
  on public.facilities (status, requested_billing_mode);

notify pgrst, 'reload schema';
