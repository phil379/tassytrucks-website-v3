-- Driver pay is a percentage per ride, and the percentage belongs to the
-- SERVICE LINE, not the person.
--
-- Within a line the driver's share of the fare barely moves -- Tassy Care runs
-- 29.4-32.0% across every distance band, Recovery 33.9-35.2% -- because the
-- fare bands were priced against driver minutes in the first place. Across
-- lines it swings by a third. One company-wide percentage would overpay one
-- line and starve another; a per-line percentage tracks the work to within two
-- or three points.
--
-- driver_pct is what the DRIVER receives, on the 1099 basis these drivers are
-- actually on: the driver owns the vehicle, so fuel, tyres and depreciation
-- come out of the driver's share. The economics model charged Tassy for a
-- vehicle it does not own while also paying a wage, which understated the
-- driver's true share by roughly twelve points.
create table if not exists public.pay_rates (
  service_line  text primary key,
  driver_pct    numeric(5,2) not null check (driver_pct > 0 and driver_pct <= 100),
  basis         text not null default 'driver_owns_vehicle'
                  check (basis in ('driver_owns_vehicle', 'company_vehicle')),
  effective_from date not null default current_date,
  notes         text,
  updated_at    timestamptz not null default now()
);

alter table public.pay_rates enable row level security;

drop trigger if exists pay_rates_set_updated_at on public.pay_rates;
create trigger pay_rates_set_updated_at before update on public.pay_rates
  for each row execute function public.ops_set_updated_at();

insert into public.pay_rates (service_line, driver_pct, notes) values
  ('care',       40, 'Model: 38.1% wage+vehicle, 1099 driver-owned car.'),
  ('care_wav',   40, 'Model: 39.9%. WAV wage and vehicle cost are still estimates.'),
  ('recovery',   45, 'Model: 43.3%. Longest paid driver time; the 30 min discharge wait is paid and does not deadhead.'),
  ('concierge',  35, 'Model: 34.9%. Highest fare per driver minute — the lowest percentage still pays the best hourly.'),
  ('scholar',    40, 'Priced per family. Same basis as Care: same sedan, same driver, similar minutes.'),
  ('winnie',     45, 'Model: 43.5%. Thinnest line. If a partner operates it, a flat $8-10 per trip beats a split.')
on conflict (service_line) do nothing;

comment on table public.pay_rates is
  'What share of the fare the driver keeps, per service line. drivers.default_pay_pct overrides it for one person; trip_requests.driver_pay_pct freezes whichever applied, at assignment.';
