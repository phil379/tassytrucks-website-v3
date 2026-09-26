-- 20260925T2230_backend_cleanup.sql
-- Light fixes found in the 2026-09-25 backend merge audit.
-- Target: tassy-ops (knllznbdpejoaiexmdea).
--
-- Deliberately NOT included: the tier-matrix change (WAV taking Care work,
-- sedan taking ambulatory Recovery). That is a business decision, not a
-- defect, and it is Phil's call.

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Remove uber_black from the eligibility matrix.
--
-- default_service_lines gave every premium SUV the line 'uber_black', but
-- pay_rates has no such row. Assignment therefore refuses with
-- "Cannot assign: no pay percentage for uber_black" -- a dead end sitting
-- in the middle of the matrix. Tassy runs six lines; this is not one.
-- Reversible: add the array element back and insert a pay_rates row.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.default_service_lines(
  p_tier text,
  p_backup_opt_in boolean default false
) returns text[] language sql immutable set search_path to '' as $fn$
  select case p_tier
    when 'sedan'       then array['care', 'scholar']
    when 'pet_only'    then array['winnie']
    when 'wav'         then array['care_wav', 'recovery']
    when 'premium_suv' then
      case when p_backup_opt_in
        then array['recovery', 'concierge', 'care', 'scholar']
        else array['recovery', 'concierge']
      end
    else array[]::text[]
  end;
$fn$;

-- Re-derive every vehicle's stored service_lines from the corrected matrix.
-- Two premium SUVs already carry 'uber_black' in their stored array, so
-- replacing the function alone would leave those rows stale and still
-- unassignable.
update public.vehicles
   set service_lines = public.default_service_lines(tier, backup_opt_in)
 where tier is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. One service line, two spellings.
--
-- The marketing site writes service_line = 'pet'. pay_rates, the eligibility
-- matrix and the dispatch engine all use 'winnie'. A pet trip can therefore
-- never match an eligible vehicle and can never be paid -- it just sits on
-- the board. 'winnie' is canonical: it is the brand, and it is what five
-- other places already use.
--
-- Normalising in the database rather than the app means no deploy is needed
-- and the fix cannot be lost. Once the site sends 'winnie' this becomes a
-- harmless no-op. The public URL (?service=pet) is unaffected.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.trip_requests_normalize_service_line()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  if lower(coalesce(new.service_line, '')) = 'pet' then
    new.service_line := 'winnie';
  end if;
  return new;
end;
$fn$;

drop trigger if exists trip_requests_normalize_service_line on public.trip_requests;
create trigger trip_requests_normalize_service_line
  before insert or update of service_line on public.trip_requests
  for each row execute function public.trip_requests_normalize_service_line();

update public.trip_requests set service_line = 'winnie' where service_line = 'pet';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. LPN.
--
-- drivers.role was driver | cna | both. Widening only -- no existing row
-- can fail this.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.drivers drop constraint if exists drivers_role_check;
alter table public.drivers add constraint drivers_role_check
  check (role = any (array['driver'::text, 'cna'::text, 'lpn'::text, 'both'::text]));

-- ─────────────────────────────────────────────────────────────────────────
-- 4. is_test_data on trip_requests.
--
-- drivers and vehicles both carry this flag; trip_requests did not, so a
-- demo trip could not be told apart from a real one. Needed for the VA
-- demo: build a full ladder walkthrough, then filter it out afterwards.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.trip_requests
  add column if not exists is_test_data boolean not null default false;

commit;
