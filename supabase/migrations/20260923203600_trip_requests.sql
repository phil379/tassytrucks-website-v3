-- ─────────────────────────────────────────────────────────────────────────────
-- 20260923203600_trip_requests.sql
--
-- The Trip Request pipeline's single table. This file is the SOURCE OF TRUTH for
-- the tassy-ops schema: nothing is applied to the database that does not exist
-- here first. (The predecessor project drifted precisely because migrations were
-- applied straight to prod with no repo file behind them.)
--
-- Target project: tassy-ops (knllznbdpejoaiexmdea, us-east-1).
-- Deliberately portable: plain SQL, no Supabase-only syntax. The role grants are
-- guarded so this file also applies cleanly to a vanilla Postgres where the
-- `anon` / `service_role` roles do not exist.
--
-- PRIVACY: this table must never carry clinical data. `vehicle_notes` is for
-- vehicle preparation only — no diagnosis, procedure, condition, or medication.
-- The form enforces this in copy and the server strips nothing, so the guardrail
-- is the UI + review. Do not add a clinical column to this table.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.trip_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  service_line      text not null,   -- care|recovery|wellness|pet|guardian|scholar
  status            text not null default 'new',
                                     -- new|quoted|confirmed|assigned|completed|closed|cancelled

  contact_name      text not null,
  contact_phone     text not null,
  contact_email     text,
  preferred_contact text,            -- phone|text|email

  pickup_address    text not null,
  dropoff_address   text not null,
  requested_at      timestamptz not null,
  return_trip       boolean not null default false,
  return_at         timestamptz,
  passengers        smallint default 1,
  mobility          text,            -- ambulatory|walker|wheelchair|pet_carrier|other
  vehicle_notes     text,            -- "anything to prepare the vehicle"
                                     -- NEVER diagnosis or procedure

  quoted_cents      integer,
  wait_included_min smallint,
  overage_cents_per_30min integer,
  payment_status    text default 'unpaid',

  source            text,            -- page path + utm
  user_agent        text,
  internal_notes    text
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- The ops queue reads newest-first, filtered by status or by service line.
create index if not exists trip_requests_status_created_idx
  on public.trip_requests (status, created_at desc);

create index if not exists trip_requests_service_line_created_idx
  on public.trip_requests (service_line, created_at desc);

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function public.trip_requests_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trip_requests_set_updated_at on public.trip_requests;
create trigger trip_requests_set_updated_at
  before update on public.trip_requests
  for each row execute function public.trip_requests_set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Exactly two policies. The public form may INSERT and nothing else; everything
-- that reads or mutates a request goes through the service role, server-side.
alter table public.trip_requests enable row level security;

drop policy if exists trip_requests_anon_insert on public.trip_requests;
drop policy if exists trip_requests_service_role_all on public.trip_requests;

create policy trip_requests_anon_insert
  on public.trip_requests
  for insert
  to anon
  with check (true);

create policy trip_requests_service_role_all
  on public.trip_requests
  for all
  to service_role
  using (true)
  with check (true);

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Supabase's default privileges hand every new public table to anon and
-- authenticated. Strip that back: anon gets INSERT and nothing more, and
-- authenticated gets nothing at all. RLS is the second lock, not the only one.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.trip_requests from anon';
    execute 'grant insert on public.trip_requests to anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.trip_requests from authenticated';
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant all on public.trip_requests to service_role';
  end if;
end
$$;

commit;

-- PostgREST caches the schema; tell it to reload after DDL.
notify pgrst, 'reload schema';
