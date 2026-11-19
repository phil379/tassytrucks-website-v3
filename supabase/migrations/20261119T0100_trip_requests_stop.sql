-- Booking-time stops (Phil, 2026-11-19; lib/stops.ts on the website).
--
-- NOT APPLIED BY THIS CHANGE. Phil applies it before the code that writes
-- these columns is deployed.
--
-- A rider can add ONE stop per leg when booking: pickup -> stop ->
-- destination on the way there, and destination -> stop -> pickup on the way
-- back of a round trip (the pharmacy stop belongs on the way home). Each leg
-- prices on its own route through its stop, plus a flat stop fee per leg.
-- The stored estimate (estimate_low_cents / estimate_high_cents) already
-- includes the fees, so TassyOps confirms the stored total and never
-- recomputes; these columns are the record of what the stop was and what it
-- charged, per leg:
--
--   stop_address / stop_place_id / stop_lat / stop_lng / stop_fee_cents
--       the outbound leg's stop and its fee in cents.
--   return_stop_address / return_stop_place_id / return_stop_lat /
--   return_stop_lng / return_stop_fee_cents
--       the return leg's stop and its fee in cents.
--
-- Additive and nullable. Every booking without a stop leaves all ten empty,
-- so nothing else changes. The website writes these columns ONLY when the
-- booking has that leg's stop (conditional spread, the hotel-columns
-- pattern), so no-stop inserts keep working before this migration is
-- applied. TassyOps reads the columns best-effort (never in its main column
-- lists), so ops also keeps working before it is applied.
-- `if not exists` just makes re-running this file safe.

alter table public.trip_requests
  add column if not exists stop_address text,
  add column if not exists stop_place_id text,
  add column if not exists stop_lat double precision,
  add column if not exists stop_lng double precision,
  add column if not exists stop_fee_cents integer,
  add column if not exists return_stop_address text,
  add column if not exists return_stop_place_id text,
  add column if not exists return_stop_lat double precision,
  add column if not exists return_stop_lng double precision,
  add column if not exists return_stop_fee_cents integer;

comment on column public.trip_requests.stop_address is
  'Booking-time stop on the outbound leg (pickup -> stop -> destination), as picked/typed by the rider. Null when the leg has no stop.';
comment on column public.trip_requests.stop_place_id is
  'Google place id of the outbound stop, when the rider picked it from the list.';
comment on column public.trip_requests.stop_lat is
  'Latitude of the outbound stop, when picked. Null for a ZIP-only stop.';
comment on column public.trip_requests.stop_lng is
  'Longitude of the outbound stop, when picked. Null for a ZIP-only stop.';
comment on column public.trip_requests.stop_fee_cents is
  'The flat stop fee charged for the outbound leg''s stop, in cents (lib/stops.ts STOP_FEE_CENTS). Already included in estimate_low/high_cents.';
comment on column public.trip_requests.return_stop_address is
  'Booking-time stop on the return leg of a round trip (destination -> stop -> pickup). Null when the return leg has no stop.';
comment on column public.trip_requests.return_stop_place_id is
  'Google place id of the return stop, when the rider picked it from the list.';
comment on column public.trip_requests.return_stop_lat is
  'Latitude of the return stop, when picked. Null for a ZIP-only stop.';
comment on column public.trip_requests.return_stop_lng is
  'Longitude of the return stop, when picked. Null for a ZIP-only stop.';
comment on column public.trip_requests.return_stop_fee_cents is
  'The flat stop fee charged for the return leg''s stop, in cents (lib/stops.ts STOP_FEE_CENTS). Already included in estimate_low/high_cents.';
