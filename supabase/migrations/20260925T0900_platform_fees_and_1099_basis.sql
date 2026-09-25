-- FEES ARE TASSY'S, NOT THE DRIVER'S.
--
-- Website, software, dispatch line, commercial insurance and card processing
-- all come out of Tassy's share. The driver's percentage is struck against the
-- gross fare and is never reduced by any of them. A trip splits three ways and
-- the arithmetic has to be visible:
--
--     fare  =  driver share  +  platform fees  +  Tassy net
--
-- Most of these are FIXED per trip, not a percentage. Insurance is an annual
-- premium divided by trips; the dispatch line costs the same whether the fare
-- is $49 or $259. Only card processing scales. One blended percentage would
-- overstate a short trip's cost and understate a long one — exactly the error
-- that hides a thin line. Winnie 0-5 mi is 33% net; Care 23-30 mi is 50%.
--
-- EVERY DRIVER IS 1099. No payroll load anywhere: no employer taxes, no
-- workers comp, no 1.15 multiplier.
alter table public.pay_rates
  add column if not exists insurance_cents      integer not null default 600,
  add column if not exists dispatch_cents       integer not null default 300,
  add column if not exists card_fee_pct         numeric(5,3) not null default 2.900,
  add column if not exists card_fee_fixed_cents integer not null default 30;

comment on column public.pay_rates.insurance_cents is
  'Commercial auto premium amortised per completed trip. Tassy''s cost, never deducted from the driver.';
comment on column public.pay_rates.dispatch_cents is
  'Website, software, phone line and admin, per completed trip. Tassy''s cost.';
comment on column public.pay_rates.card_fee_pct is
  'Processor percentage. The only fee that scales with the fare.';

update public.pay_rates set insurance_cents = 800 where service_line in ('recovery','care_wav');
update public.pay_rates set insurance_cents = 700 where service_line = 'concierge';

alter table public.pay_rates drop constraint if exists pay_rates_basis_check;
alter table public.pay_rates add constraint pay_rates_basis_check
  check (basis in ('driver_owns_vehicle', 'company_vehicle'));

-- The split freezes onto the trip at assignment, for the same reason
-- driver_pay_pct does: a fee changed next month must not rewrite what a
-- completed trip earned, or a statement already printed.
alter table public.trip_requests
  add column if not exists platform_fee_cents integer,
  add column if not exists card_fee_cents     integer,
  add column if not exists tassy_net_cents    integer;

comment on column public.trip_requests.platform_fee_cents is
  'Insurance + dispatch for this trip, frozen at assignment. Tassy''s cost.';
comment on column public.trip_requests.tassy_net_cents is
  'fare − driver_pay_cents − platform_fee_cents − card_fee_cents.';

alter table public.drivers
  add column if not exists employment_type text not null default '1099'
    check (employment_type in ('1099', 'w2'));

comment on column public.drivers.employment_type is
  'Standing policy: every Tassy driver is a 1099 contractor. The w2 value exists only so the column could record an exception if the policy ever changed; no economics anywhere applies a payroll load.';

create or replace view public.pay_rate_economics as
select r.service_line, r.driver_pct, r.insurance_cents, r.dispatch_cents,
       r.insurance_cents + r.dispatch_cents as fixed_fee_cents,
       r.card_fee_pct, r.card_fee_fixed_cents, r.basis, r.notes
from public.pay_rates r;
