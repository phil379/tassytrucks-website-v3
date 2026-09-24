-- ─────────────────────────────────────────────────────────────────────────────
-- 20260923214500_trip_requests_escalated_at.sql
--
-- Speed-to-lead escalation: one column so the cron can page the operator about
-- a stale request exactly once.
--
-- Without this the cron re-pages every run for as long as a request sits in
-- 'new' — the operator would get an URGENT SMS every 15 minutes for the same
-- trip, learn to ignore URGENT, and the safety net would be worse than nothing.
--
-- Target project: tassy-ops (knllznbdpejoaiexmdea).
-- Portable: plain SQL, no Supabase-only syntax.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.trip_requests
  add column if not exists escalated_at timestamptz;

comment on column public.trip_requests.escalated_at is
  'When the stale-request escalation SMS was sent. NULL = never escalated. '
  'Set once; the cron skips any row where this is already set.';

-- The cron's only query: rows still 'new', older than the threshold, never
-- escalated. Partial index keeps it cheap as the table grows.
create index if not exists trip_requests_pending_escalation_idx
  on public.trip_requests (created_at)
  where status = 'new' and escalated_at is null;

commit;

notify pgrst, 'reload schema';
