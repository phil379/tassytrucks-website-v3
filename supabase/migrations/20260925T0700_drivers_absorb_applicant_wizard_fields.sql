-- The applicant wizard in tassytrucksops already collects all of this across
-- eleven steps. It was writing it into public.drivers on the OTHER project --
-- another business's table. These columns let tassy-ops receive the same data
-- unchanged, so the bridge could be repointed rather than rebuilt.
--
-- Banking follows the wizard's own design (FIX_PROD_057): the server keeps the
-- LAST FOUR DIGITS only. No column here can hold a full routing or account
-- number, deliberately.
alter table public.drivers
  add column if not exists emergency_contact_name          text,
  add column if not exists emergency_contact_phone         text,
  add column if not exists emergency_contact_relationship  text,
  add column if not exists reference_1_name                text,
  add column if not exists reference_1_phone               text,
  add column if not exists reference_1_relationship        text,
  add column if not exists reference_2_name                text,
  add column if not exists reference_2_phone               text,
  add column if not exists reference_2_relationship        text,
  add column if not exists payout_method text
    check (payout_method is null or payout_method in
      ('direct_deposit','check','cashapp','paypal','venmo','zelle')),
  add column if not exists payout_day              smallint,
  add column if not exists bank_name               text,
  add column if not exists bank_account_last4      text
    check (bank_account_last4 is null or bank_account_last4 ~ '^[0-9]{4}$'),
  add column if not exists bank_account_type       text,
  add column if not exists mailing_address         text,
  add column if not exists cashapp_tag             text,
  add column if not exists paypal_email            text,
  add column if not exists venmo_handle            text,
  add column if not exists zelle_identifier        text,
  add column if not exists service_lines           text[] not null default '{}'::text[],
  add column if not exists source_application_id   uuid,
  add column if not exists source_application_table text,
  add column if not exists invited_at              timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.drivers.bank_account_last4 is
  'Last four digits only. The wizard never persists a full account number (FIX_PROD_057).';
comment on column public.drivers.source_application_id is
  'The tassy_archive.{driver|cna|companion|sales_rep}_applications row this driver was approved from. Cross-project reference, not an FK.';
comment on column public.drivers.service_lines is
  'Which lines this PERSON is cleared to work. Distinct from vehicles.service_lines, which is what the VEHICLE may run.';
