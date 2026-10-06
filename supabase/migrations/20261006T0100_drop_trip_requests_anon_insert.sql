-- ============================================================================
-- DO NOT APPLY UNATTENDED. WRITTEN 2026-10-06 FOR PHIL TO REVIEW AND APPLY.
-- public.trip_requests — drop the anonymous INSERT policy and grant
-- Project: knllznbdpejoaiexmdea (tassy-ops)
--
-- THE HOLE.
-- 20260923203600_trip_requests.sql created `trip_requests_anon_insert`
-- (FOR INSERT TO anon WITH CHECK (true)) and granted INSERT to anon. The anon
-- key ships in the browser bundle, so anyone can POST rows straight to
-- /rest/v1/trip_requests and skip the honeypot, the elapsed-time check, the
-- rate limit, zod validation and the facility-session check that
-- /api/trip-request enforces. They can also set facility_id, payer, status,
-- quoted_cents, is_test_data and so on, which the route never lets a form set.
--
-- IS IT LOAD-BEARING? Evidence says no, but it was established by reading code,
-- not by watching production:
--   * app/api/trip-request/route.ts inserts with supabaseAdmin()
--     (lib/supabase-admin.ts), a client built from SUPABASE_SERVICE_ROLE_KEY.
--     The service role bypasses RLS, and trip_requests_service_role_all covers
--     it anyway. That route uses neither policy.
--   * It also does `.insert(...).select('id').single()`. anon has no SELECT
--     grant or policy on this table, so an anon-keyed client could not return
--     the row; the route cannot be running on the anon key.
--   * Nothing in the browser bundle writes to trip_requests. The only place
--     the site uses the publishable key is facility-auth.ts, for auth only.
--   * tassytrucksops (read only) never inserts into trip_requests with the
--     anon key: its anon-key booking writers target `reservations`.
--
-- WHAT THIS DOES NOT PROVE. A third-party integration (Zapier, a form builder,
-- a script) that POSTs to PostgREST with the anon key would break. Nothing in
-- either repo does, but a repo cannot show what is configured elsewhere.
-- BEFORE APPLYING, make one real booking on the live form and confirm it still
-- lands (it should: it runs on the service role), then apply.
--
-- ROLLBACK is the two statements at the bottom, commented out.
-- Idempotent: safe to re-run.
-- ============================================================================

begin;

drop policy if exists trip_requests_anon_insert on public.trip_requests;

-- Policy and grant are two separate locks (see the original migration). With the
-- policy gone RLS already denies anon, but a stale grant is how this regresses
-- the next time someone adds a permissive policy, so take both.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke insert on public.trip_requests from anon';
  end if;
end
$$;

commit;

-- PostgREST caches the schema; tell it to reload after DDL.
notify pgrst, 'reload schema';

-- ── ROLLBACK (only if something outside this repo turns out to depend on it) ──
-- grant insert on public.trip_requests to anon;
-- create policy trip_requests_anon_insert on public.trip_requests
--   for insert to anon with check (true);
