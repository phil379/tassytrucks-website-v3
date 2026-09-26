-- ============================================================================
-- Facility accounts, users, standing orders and weekly invoicing
-- Project: knllznbdpejoaiexmdea (tassy-ops)
-- Additive only. Safe to re-run.
--
-- Design notes that matter:
--  * A facility trip is a NORMAL trip_requests row with a facility_id on it.
--    There is no parallel pipeline. It walks the same status ladder, appears
--    in the same /ops queue, and uses the same quote engine.
--  * Payment reuses what exists. payer='facility' sets payment_status
--    'on_account' (already supported) and no Stripe link is minted.
--    payer='passenger' mints a payment link exactly as a retail trip does.
--  * NO CLINICAL DATA. No diagnosis, procedure, condition, medication,
--    medical record number, insurance member id or date of birth anywhere
--    in this schema. facility_ref is the FACILITY'S OWN booking reference.
--  * RLS is enabled with no permissive policy: service role only, reached
--    through server actions. Facility-scoped policies come with portal auth.
-- ============================================================================

-- ---------------------------------------------------------------- facilities
create table if not exists public.facilities (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  name              text not null,
  kind              text not null default 'other',
    -- hospital | dialysis | veterinary | dental | clinic | surgery_center |
    -- rehab | senior_living | other
  status            text not null default 'pending',
    -- pending -> active -> suspended -> closed
    -- PENDING IS DELIBERATE. A weekly-invoice account is a credit decision.
    -- Nobody opens one without Phil approving it.

  -- where they are
  address           text,
  address_place_id  text,
  phone             text,
  website           text,

  -- who we talk to
  primary_contact_name   text,
  primary_contact_email  text,
  primary_contact_phone  text,

  -- billing
  billing_mode      text not null default 'invoice_weekly',
    -- invoice_weekly | patient_card   (the DEFAULT; overridable per trip)
  billing_email     text,
  billing_contact_name text,
  net_terms_days    smallint not null default 7,
  po_required       boolean not null default false,
  discount_pct      numeric(5,2) not null default 0,
    -- Facility Account pricing: 5% at 10-24 trips/month, 10% at 25+.
    -- Stored, not computed, so a negotiated rate survives a volume dip.

  -- who owns the relationship
  account_manager   text,   -- the Tassy person who services the account
  referred_by_rep   text,   -- the Tassy person who SOLD it (commission)
  referral_source   text,   -- how they found us, in their words

  -- ops
  service_lines     text[] not null default '{}',  -- what they actually book
  notes             text,
  approved_at       timestamptz,
  approved_by       text
);

create index if not exists facilities_status_idx on public.facilities (status);
create index if not exists facilities_kind_idx   on public.facilities (kind);
create index if not exists facilities_manager_idx on public.facilities (account_manager);

-- ----------------------------------------------------------- facility_users
create table if not exists public.facility_users (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  facility_id   uuid not null references public.facilities(id) on delete cascade,
  auth_user_id  uuid,          -- Supabase auth on THIS project. Magic link.
  email         text not null,
  full_name     text,
  job_title     text,
  phone         text,
  role          text not null default 'requester',
    -- requester | approver | billing | admin
  status        text not null default 'invited',
    -- invited | active | disabled
  invited_by    text,
  last_seen_at  timestamptz
);

create unique index if not exists facility_users_email_uniq
  on public.facility_users (lower(email));
create index if not exists facility_users_facility_idx
  on public.facility_users (facility_id);
create index if not exists facility_users_auth_idx
  on public.facility_users (auth_user_id);

-- --------------------------------------------------------- facility_invoices
create table if not exists public.facility_invoices (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  facility_id     uuid not null references public.facilities(id),
  period_start    date not null,
  period_end      date not null,
  status          text not null default 'draft',
    -- draft | sent | paid | void
  trip_count      integer not null default 0,
  subtotal_cents  integer not null default 0,
  discount_cents  integer not null default 0,
  total_cents     integer not null default 0,
  po_reference    text,

  sent_at         timestamptz,
  due_at          timestamptz,
  paid_at         timestamptz,
  stripe_payment_link_id text,
  payment_link_url       text,
  notes           text
);

create unique index if not exists facility_invoices_period_uniq
  on public.facility_invoices (facility_id, period_start, period_end);
create index if not exists facility_invoices_status_idx
  on public.facility_invoices (status);

-- ----------------------------------------------------------- standing_orders
-- Dialysis is three times a week for months. A facility that has to book each
-- ride separately will not stay. A standing order is materialised into real
-- trip_requests rows by a cron, N days ahead, so dispatch sees normal trips.
create table if not exists public.standing_orders (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  facility_id     uuid not null references public.facilities(id) on delete cascade,
  created_by      uuid references public.facility_users(id),

  label           text,            -- "Mrs A - Mon/Wed/Fri dialysis"
  service_line    text not null,
  passenger_name  text not null,
  passenger_phone text,
  mobility        text,
  facility_ref    text,            -- THEIR reference. Never a medical record number.

  pickup_address  text not null,
  pickup_place_id text,
  dropoff_address text not null,
  dropoff_place_id text,

  days_of_week    smallint[] not null,   -- 0=Sun .. 6=Sat
  pickup_time     time not null,
  return_trip     boolean not null default false,
  return_time     time,

  starts_on       date not null,
  ends_on         date,
  payer           text not null default 'facility',
  active          boolean not null default true,
  last_materialised_on date
);

create index if not exists standing_orders_active_idx
  on public.standing_orders (facility_id, active);

-- ------------------------------------------- trip_requests: facility columns
alter table public.trip_requests
  add column if not exists facility_id          uuid references public.facilities(id),
  add column if not exists facility_user_id     uuid references public.facility_users(id),
  add column if not exists facility_ref         text,
  add column if not exists authorized_by        text,
  add column if not exists payer                text,
    -- 'facility' | 'passenger'. NULL on retail trips.
  add column if not exists facility_invoice_id  uuid references public.facility_invoices(id),
  add column if not exists standing_order_id    uuid references public.standing_orders(id);

create index if not exists trip_requests_facility_idx
  on public.trip_requests (facility_id, requested_at);
create index if not exists trip_requests_invoice_idx
  on public.trip_requests (facility_invoice_id);

comment on column public.trip_requests.facility_ref is
  'The FACILITY''S OWN booking reference. Never a medical record number, '
  'insurance id or any clinical identifier. The UI says so and the server '
  'rejects long bare digit strings.';

comment on column public.trip_requests.payer is
  'Per-trip override of facilities.billing_mode. facility => payment_status '
  'on_account and no Stripe link. passenger => payment link as retail.';

-- -------------------------------------------------------------- updated_at
create or replace function public.facility_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['facilities','facility_users','facility_invoices','standing_orders']
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.facility_set_updated_at()', t, t);
  end loop;
end $$;

-- --------------------------------------------------------------------- RLS
-- Enabled with NO permissive policy: service role only, reached through
-- server actions. Facility-scoped read policies land with portal auth, and
-- must be written against facility_users.auth_user_id = auth.uid().
alter table public.facilities        enable row level security;
alter table public.facility_users    enable row level security;
alter table public.facility_invoices enable row level security;
alter table public.standing_orders   enable row level security;
