-- TassyOps v1 — operating core.
-- Project: knllznbdpejoaiexmdea (tassy-ops). Additive only.
-- No drop, no rename, no NOT NULL on an existing column, no backfill.
-- trip_requests is 48 columns and 1 row before this file; 55 columns and 1 row after.
--
-- RLS is enabled on every new table with NO permissive policy. That is
-- deliberate: nothing but the service role reaches these tables today, and
-- deny-by-default is the correct posture until driver/CNA auth exists.
-- Self-read policies land with auth, in their own migration.

-- ---------------------------------------------------------------- helpers

create or replace function public.ops_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- drivers

create table if not exists public.drivers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  org_id          text not null default 'tassy',
  auth_user_id    uuid,
  first_name      text not null,
  last_name       text not null,
  phone           text not null,
  email           text,
  role            text not null default 'driver'
                    check (role in ('driver', 'cna', 'both')),
  status          text not null default 'applicant'
                    check (status in ('applicant', 'active', 'inactive', 'suspended')),
  hire_date       date,
  home_zip        text,
  notes           text
);

create unique index if not exists drivers_auth_user_id_key
  on public.drivers (auth_user_id) where auth_user_id is not null;
create index if not exists drivers_status_idx on public.drivers (status);

drop trigger if exists drivers_set_updated_at on public.drivers;
create trigger drivers_set_updated_at before update on public.drivers
  for each row execute function public.ops_set_updated_at();

alter table public.drivers enable row level security;

-- --------------------------------------------------------------- vehicles

create table if not exists public.vehicles (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  org_id                  text not null default 'tassy',
  make                    text not null,
  model                   text not null,
  model_year              smallint,
  color                   text,
  plate                   text,
  vin                     text,
  seats                   smallint not null default 4,
  wheelchair_accessible   boolean not null default false,
  status                  text not null default 'active'
                            check (status in ('active', 'maintenance', 'retired')),
  assigned_driver_id      uuid references public.drivers (id) on delete set null,
  odometer_miles          integer,
  notes                   text
);

create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists vehicles_assigned_driver_idx on public.vehicles (assigned_driver_id);

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at before update on public.vehicles
  for each row execute function public.ops_set_updated_at();

alter table public.vehicles enable row level security;

-- ------------------------------------------------------------ credentials
-- One row per expiring thing. The compliance dashboard is one query
-- against this table; a sixth credential type is a row, not a migration.

create table if not exists public.credentials (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  org_id         text not null default 'tassy',
  subject_type   text not null check (subject_type in ('driver', 'vehicle')),
  subject_id     uuid not null,
  kind           text not null check (kind in (
                   'drivers_license',
                   'auto_insurance',
                   'vehicle_registration',
                   'vehicle_inspection',
                   'cna_certification',
                   'cpr',
                   'tb_test',
                   'background_check'
                 )),
  identifier     text,
  issuer         text,
  issued_on      date,
  expires_on     date not null,
  document_url   text,
  verified_at    timestamptz,
  notes          text
);

create index if not exists credentials_expires_on_idx on public.credentials (expires_on);
create index if not exists credentials_subject_idx on public.credentials (subject_type, subject_id);

drop trigger if exists credentials_set_updated_at on public.credentials;
create trigger credentials_set_updated_at before update on public.credentials
  for each row execute function public.ops_set_updated_at();

alter table public.credentials enable row level security;

-- --------------------------------------------------------------- students
-- Tassy Scholar. No health fields, by standing rule.

create table if not exists public.students (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  org_id               text not null default 'tassy',
  first_name           text not null,
  last_name            text not null,
  grade                text,
  school_name          text,
  school_address       text,
  home_address         text,
  parent_name          text not null,
  parent_phone         text not null,
  parent_email         text,
  pickup_window_start  time,
  pickup_window_end    time,
  authorized_adults    jsonb not null default '[]'::jsonb,
  status               text not null default 'active'
                         check (status in ('active', 'paused', 'withdrawn')),
  notes                text
);

create index if not exists students_status_idx on public.students (status);
create index if not exists students_parent_email_idx on public.students (parent_email);

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at before update on public.students
  for each row execute function public.ops_set_updated_at();

alter table public.students enable row level security;

-- ------------------------------------------------------------ trip_events
-- Append-only timeline. Lateness = scheduled_for vs the picked_up row.

create table if not exists public.trip_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  org_id      text not null default 'tassy',
  trip_id     uuid not null references public.trip_requests (id) on delete cascade,
  event       text not null check (event in (
                'created', 'confirmed', 'assigned', 'unassigned',
                'en_route', 'arrived', 'picked_up', 'dropped_off',
                'completed', 'no_show', 'cancelled', 'note'
              )),
  at          timestamptz not null default now(),
  actor       text,
  notes       text
);

create index if not exists trip_events_trip_idx on public.trip_events (trip_id, at);
create index if not exists trip_events_event_idx on public.trip_events (event, at);

alter table public.trip_events enable row level security;

-- ------------------------------------------- trip_requests: assignment cols

alter table public.trip_requests
  add column if not exists driver_id        uuid references public.drivers (id) on delete set null,
  add column if not exists cna_id           uuid references public.drivers (id) on delete set null,
  add column if not exists vehicle_id       uuid references public.vehicles (id) on delete set null,
  add column if not exists student_id       uuid references public.students (id) on delete set null,
  add column if not exists scheduled_for    timestamptz,
  add column if not exists completed_at     timestamptz,
  add column if not exists driver_pay_cents integer;

create index if not exists trip_requests_driver_idx on public.trip_requests (driver_id);
create index if not exists trip_requests_cna_idx on public.trip_requests (cna_id);
create index if not exists trip_requests_scheduled_idx on public.trip_requests (scheduled_for);
create index if not exists trip_requests_status_idx on public.trip_requests (status);
