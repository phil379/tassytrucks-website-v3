-- Two operating facts from Phil, 2026-09-25, that the v1 schema did not model.
--
-- 1. A DRIVER IS NOT INTERCHANGEABLE. Eligibility is a property of the
--    vehicle, not the person:
--      • a sedan compliant for Tassy Care and Tassy Scholar cannot run
--        Uber Black, Winnie Ride or WAV;
--      • Winnie Ride operators run Winnie Ride ONLY — pet hair means that
--        vehicle does not then carry people;
--      • Recovery and Concierge vehicles (premium large SUV) can run every
--        model, and can absorb Care/Scholar overflow *if the owner agrees*.
--    That last clause is why backup_opt_in exists as its own column. Phil's
--    words: "will be able to support if the owners agreed when Tassy Care and
--    Tassy Scholar are too busy." Consent, not capability.
--
-- 2. DRIVERS ARE PAID A PERCENTAGE PER RIDE, and when a ride is offered the
--    driver sees his cut — not the customer's price. So the percentage is
--    snapshotted onto the trip at offer time rather than read live off the
--    driver record, because changing a driver's default rate must never
--    retroactively rewrite what he was already promised, or what a statement
--    he already printed said.
--
-- Additive only. vehicles is 0 rows, drivers is 0 rows, trip_requests is 1 row.

-- ------------------------------------------------------- vehicle eligibility

alter table public.vehicles
  add column if not exists tier text
    check (tier in ('sedan', 'premium_suv', 'wav', 'pet_only')),
  add column if not exists service_lines text[] not null default '{}'::text[],
  add column if not exists backup_opt_in boolean not null default false,
  add column if not exists owner_name text;

comment on column public.vehicles.service_lines is
  'Authoritative list of what this vehicle may be dispatched for. Seeded from tier via default_service_lines(); hand-editable afterwards.';
comment on column public.vehicles.backup_opt_in is
  'Owner has agreed this premium vehicle may cover Tassy Care / Tassy Scholar overflow.';

/**
 * What a vehicle of this tier may run, before any hand-editing.
 *
 * winnie is exclusive in BOTH directions: a pet vehicle runs nothing else,
 * and nothing else runs a pet trip. That is the whole point of the rule --
 * the constraint is the hair in the upholstery, not the driver's skill.
 */
create or replace function public.default_service_lines(
  p_tier text,
  p_backup_opt_in boolean default false
)
returns text[]
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_tier
    when 'sedan'       then array['care', 'scholar']
    when 'pet_only'    then array['winnie']
    when 'wav'         then array['care_wav', 'recovery']
    when 'premium_suv' then
      case when p_backup_opt_in
        then array['recovery', 'concierge', 'uber_black', 'care', 'scholar']
        else array['recovery', 'concierge', 'uber_black']
      end
    else array[]::text[]
  end;
$$;

create index if not exists vehicles_service_lines_idx
  on public.vehicles using gin (service_lines);

-- ------------------------------------------------------------ driver pay

alter table public.drivers
  add column if not exists default_pay_pct numeric(5,2)
    check (default_pay_pct is null or (default_pay_pct > 0 and default_pay_pct <= 100));

comment on column public.drivers.default_pay_pct is
  'Default share of the customer fare this driver keeps, as a percentage. Snapshotted onto each trip at offer time.';

alter table public.trip_requests
  add column if not exists driver_pay_pct numeric(5,2)
    check (driver_pay_pct is null or (driver_pay_pct > 0 and driver_pay_pct <= 100));

comment on column public.trip_requests.driver_pay_pct is
  'The percentage agreed for THIS ride. Frozen at assignment. Changing a driver''s default rate must never rewrite a statement he has already printed.';
comment on column public.trip_requests.driver_pay_cents is
  'The driver''s cut in cents, = round(fare * driver_pay_pct). This is the only money figure a driver is ever shown; the customer price stays on the dispatch side.';
