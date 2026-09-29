-- ============================================================================
-- public.schools — the list a parent picks from, instead of typing
-- Project: knllznbdpejoaiexmdea (tassy-ops)
-- Additive. Safe to re-run.
--
-- WHY THIS IS NOT A TIDINESS FEATURE.
--
-- The request form's own helper text says "routes are quoted by the run". A run
-- is several children going to THE SAME SCHOOL at the same time, so the margin
-- in Scholar lives entirely in shared runs. With a free-text box you get
-- "Ardrey Kell", "ardrey kell hs", "Ardrey Kell High" and "AK High School" —
-- four spellings of one building — and every grouping query becomes fuzzy
-- matching against strings parents typed. You cannot build a run from that.
--
-- Seeded ONCE from local data (data/mecklenburg-schools.json, built by
-- scripts/build-schools-dataset.ts from the Mecklenburg County open GIS layer).
-- No external call at request time: the list changes about once a year, and a
-- booking form must never depend on a third-party service being up.
--
-- A missing school NEVER blocks a booking. The form falls back to free text,
-- stores it on the trip and flags it for review.
-- ============================================================================

-- Trigram matching, so "ardrey" finds "Ardrey Kell High" and a typo still hits.
create extension if not exists pg_trgm;

create table if not exists public.schools (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  org_id        text not null default 'tassy',

  name          text not null,
  aka           text[] not null default '{}',   -- "AK", "Ardrey Kell HS"
  nces_id       text,                            -- null for private/charter
  district      text,                            -- 'Charlotte-Mecklenburg Schools'
  kind          text not null default 'public',  -- public | charter | private
  level         text,                            -- elementary | middle | high | k8 | other
  grade_span    text,                            -- as published: 'K-5', '9-12'

  address       text,
  place_id      text,                            -- Google Places, for routing
  lat           numeric,
  lng           numeric,

  /**
   * Bell times. Empty at seed and cost nothing to carry.
   *
   * Once populated they let the system PROPOSE a pickup window rather than ask
   * a parent to guess it — a parent should not have to know that a 7:25 arrival
   * means a 6:45 pickup from their address.
   */
  bell_am       time,
  bell_pm       time,

  active        boolean not null default true,

  -- Provenance, and the idempotency key for re-seeding. SchoolID in the source
  -- layer is '0' for most private schools, so it cannot be the key; name plus
  -- address is unique across all 301 source rows.
  source        text,
  source_key    text
);

comment on table public.schools is
  'Schools a parent can pick on /request and in the Scholar wizard. Seeded from '
  'data/mecklenburg-schools.json; never fetched at request time. A school absent '
  'from this table must never block a booking — the form falls back to free text '
  'and flags it for review.';

comment on column public.schools.bell_am is
  'School start time. Null until populated. Drives the proposed pickup window so '
  'a parent does not have to work backwards from arrival time themselves.';

-- Re-seeding upserts on this, which is what makes the seed script re-runnable.
-- Deliberately NOT partial. PostgREST's upsert infers the conflict target from
-- a unique index, and it cannot express a partial index's predicate — a
-- WHERE-qualified index here makes the seed fail to be idempotent, which is the
-- one property it has to have. NULLs are distinct in a unique index, so a
-- hand-added school with no source is unaffected.
create unique index if not exists schools_source_key_uq
  on public.schools (source, source_key);

-- The type-ahead: trigram on name, so partial and misspelt input still matches.
create index if not exists schools_name_trgm
  on public.schools using gin (name gin_trgm_ops);

create index if not exists schools_active_idx
  on public.schools (org_id, active);

notify pgrst, 'reload schema';

-- ── students.school_id ───────────────────────────────────────────────────────
-- Run grouping needs the resolved id, not the string. NULL is meaningful: it
-- means the parent typed a school we do not have, which is the review queue's
-- predicate. school_name always keeps what they actually wrote.
alter table public.students
  add column if not exists school_id uuid references public.schools(id) on delete set null;

comment on column public.students.school_id is
  'Resolved school, when the parent picked one from the list. NULL means the '
  'school was typed free-hand and needs review: select * from students where '
  'school_id is null. school_name always holds what the parent wrote.';

create index if not exists students_school_idx on public.students (school_id, status);

notify pgrst, 'reload schema';

-- ── address provenance ──────────────────────────────────────────────────────
-- A school's address is the thing a driver acts on, so "where did this come
-- from" must be answerable without archaeology. Three sources so far:
-- charlotte-gis (the county schools layer), mecklenburg-masteraddress (an exact
-- parcel-id join) and school-site (the school's own published footer).
alter table public.schools
  add column if not exists address_source text,
  add column if not exists address_source_url text;

comment on column public.schools.address_source is
  'charlotte-gis | mecklenburg-masteraddress | school-site';
comment on column public.schools.address_source_url is
  'The exact URL the address was read from, so a disputed route can be traced.';

notify pgrst, 'reload schema';
