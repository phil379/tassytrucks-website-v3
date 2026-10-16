-- ============================================================================
-- Community Rate foundation (Veteran Rate + Senior Day). INERT by design:
--   * new trip columns are nullable and nothing writes them yet,
--   * both programs are seeded with active = false,
--   * payment_attempts starts empty and the webhook only enforces it for links that have a row.
-- Project: knllznbdpejoaiexmdea (tassy-ops). Idempotent. Spec: claude/community-rate-implementation-spec-2026-10-15.md (section 11 final).
-- Rollback: drop table public.payment_attempts; drop table public.discount_programs;
--           alter table public.trip_requests drop constraint trip_requests_discount_money_chk,
--             drop column list_cents, drop column discount_code, drop column discount_pct,
--             drop column discount_verified_at, drop column discount_verification_ref;
-- ============================================================================

-- A. Trip snapshot. list_cents = full price; agreed_cents = what the rider pays.
--    discount_label and discount_cents already exist. Old trips keep list_cents null.
alter table public.trip_requests
  add column if not exists list_cents integer,
  add column if not exists discount_code text,
  add column if not exists discount_pct numeric(5,2),
  add column if not exists discount_verified_at timestamptz,
  add column if not exists discount_verification_ref text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trip_requests_discount_money_chk') then
    alter table public.trip_requests add constraint trip_requests_discount_money_chk check (
      (list_cents is null or list_cents >= 0)
      and (discount_cents is null or discount_cents >= 0)
      and (list_cents is null or agreed_cents is null or agreed_cents <= list_cents)
      and (list_cents is null or agreed_cents is null or agreed_cents = list_cents - coalesce(discount_cents, 0))
    );
  end if;
end $$;

-- B. Rules table. Changes need no deploy. Service role only (RLS on, no policies).
create table if not exists public.discount_programs (
  code text primary key,
  label text not null,
  pct numeric(5,2) not null check (pct > 0 and pct <= 50),
  service_lines text[] not null,
  weekday smallint check (weekday between 1 and 7),          -- ISO, 1 = Monday; null = every day
  requires_verification boolean not null default true,       -- online verification only; no self-attestation
  min_contribution_cents integer not null default 600 check (min_contribution_cents >= 0),
  active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.discount_programs enable row level security;

insert into public.discount_programs (code, label, pct, service_lines, weekday, requires_verification, min_contribution_cents, active)
values
  ('veteran',    'Veteran Rate', 5.00, array['care','recovery','winnie'], null, true, 600, false),
  ('senior_day', 'Senior Day',   5.00, array['care','recovery'],          2,    true, 600, false)
on conflict (code) do nothing;

-- C. One row per payment link minted for a trip. The webhook compares the amount Stripe collected
--    with the row for that link. At most ONE active link per trip is enforced by the database.
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip_requests(id),
  stripe_payment_link_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'active'
    check (status in ('active','superseded','paid','void_failed','amount_mismatch','paid_on_superseded')),
  note text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index if not exists payment_attempts_one_active_per_trip
  on public.payment_attempts (trip_id) where status = 'active';
create index if not exists payment_attempts_link_idx on public.payment_attempts (stripe_payment_link_id);
alter table public.payment_attempts enable row level security;
