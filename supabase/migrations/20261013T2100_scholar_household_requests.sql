-- ============================================================================
-- DO NOT APPLY UNATTENDED. PROPOSED 2026-10-13 FOR PHIL TO REVIEW AND APPLY.
-- public.scholar_household_requests -- the Custom Household Request inbox.
-- Project: knllznbdpejoaiexmdea (tassy-ops)
--
-- WHAT IT IS. A lead, nothing more. A family with more than one child, school,
-- address or destination, or a nonstandard schedule, tells us about itself on
-- /school/household-request. The row is reviewed by a person. It does NOT
-- create a student, a standing order, a trip, a Stripe customer or
-- subscription, or any charge, and nothing is promised on it (driver, route,
-- price, start date).
--
-- WHY A NEW TABLE and not trip_requests. trip_requests is the dispatch board:
-- inserting a "pending" lead there would put an unreviewed, unpriced family on
-- the board and into the nightly materializer's neighbourhood, and
-- trip_requests has no status check constraint, so nothing would stop a stray
-- status from being read as a real ride. A separate table cannot be dispatched
-- by accident.
--
-- ACCESS. RLS on, no anon/authenticated policies. Only the service role (the
-- /api/school-household-request route, via supabaseAdmin) can read or write.
-- Same posture trip_requests has after 20261006T0100.
--
-- ORDER OF OPERATIONS. Apply this BEFORE the code that writes to it is merged
-- and deployed. Until it exists, the endpoint answers with a failure (never a
-- success) and tells the family to call, so nothing is silently lost.
--
-- ROLLBACK: the single drop at the bottom, commented out. The table holds only
-- leads, so dropping it loses requests but cannot affect any booking.
-- Idempotent: safe to re-run.
-- ============================================================================

begin;

create table if not exists public.scholar_household_requests (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Review state. Every row is born pending_review; a person moves it on.
  status           text not null default 'pending_review'
                   check (status in ('pending_review', 'contacted', 'plan_offered', 'declined', 'closed')),
  reviewed_at      timestamptz,
  reviewer_notes   text,

  -- The guardian.
  guardian_name    text not null,
  email            text not null,
  phone            text not null,
  home_address     text not null,

  -- The household.
  child_count      integer not null check (child_count between 1 and 8),
  children         jsonb not null,            -- [{ school_name, grade_or_age }]
  direction        text not null check (direction in ('am', 'pm', 'round_trip')),
  desired_start    date not null,
  schedule_notes   text not null,
  friday_differs   boolean not null default false,
  friday_schedule  text,
  extra_notes      text,

  -- Why they were sent here (keys from lib/school-household.ts) and the plan
  -- they were looking at. Context for the reviewer, not a commitment.
  reasons          text[] not null default '{}',
  plan_interest    text check (plan_interest in ('full-year', 'weekly', 'after-school')),

  -- Consent to be contacted about a transportation plan.
  consent_contact  boolean not null check (consent_contact is true),
  consent_at       timestamptz not null default now(),

  -- Same convention as trip_requests: plus-tagged / known test identities.
  is_test_data     boolean not null default false,
  source           text not null default 'school:household-request'
);

create index if not exists scholar_household_requests_status_created_idx
  on public.scholar_household_requests (status, created_at desc);

alter table public.scholar_household_requests enable row level security;

drop policy if exists scholar_household_requests_service_role_all on public.scholar_household_requests;
create policy scholar_household_requests_service_role_all
  on public.scholar_household_requests
  for all
  to service_role
  using (true)
  with check (true);

-- No anon / authenticated policy and no grants: the browser cannot touch this.
revoke all on public.scholar_household_requests from anon, authenticated;

commit;

-- ROLLBACK (leads only; no booking depends on this table):
-- drop table if exists public.scholar_household_requests;
