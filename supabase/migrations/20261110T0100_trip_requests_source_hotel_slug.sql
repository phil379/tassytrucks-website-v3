-- Hotel concierge card attribution (website PR "Hotel concierge QR cards").
--
-- NOT APPLIED BY THE PR. The website code does not need it: the booking route stores the slug in
-- trip_details.source_hotel_slug (jsonb, already exists), so bookings never fail before or after
-- this runs. This migration only exposes that value as a real column for reports and the ops repo.
--
-- source_hotel_slug  the listed hotel (lib/hotel-zones.ts) whose card or /airport?hotel=<slug> link
--                    the guest arrived from. ATTRIBUTION ONLY: it never sets or changes a price.
--                    Generated from trip_details, so nothing can write it out of step.
-- Additive. `if not exists` makes a re-run safe.

alter table public.trip_requests
  add column if not exists source_hotel_slug text
  generated always as (trip_details ->> 'source_hotel_slug') stored;

create index if not exists trip_requests_source_hotel_slug_idx
  on public.trip_requests (source_hotel_slug)
  where source_hotel_slug is not null;

comment on column public.trip_requests.source_hotel_slug is
  'Hotel card / link the booking came from (attribution only, never a price input). Generated from trip_details.source_hotel_slug.';
