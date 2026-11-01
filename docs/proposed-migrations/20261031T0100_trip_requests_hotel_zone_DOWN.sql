-- DOWN for supabase/migrations/20261031T0100_trip_requests_hotel_zone.sql
--
-- NOT APPLIED. Kept OUTSIDE supabase/migrations so a migration runner never applies it by accident.
-- Only Phil runs it, and only to undo the up migration.
--
-- WARNING: dropping these columns DELETES their data (the stored card price, hotel and zone of
-- every hotel booking). Ops reads card_price_cents to work out driver pay, so do not run this while
-- the ops follow-up PR that reads it is deployed. Deploy the code that no longer writes these
-- columns first, then run this.

drop index if exists public.trip_requests_hotel_zone_idx;

alter table public.trip_requests
  drop column if exists card_price_cents,
  drop column if exists hotel_slug,
  drop column if exists hotel_zone,
  drop column if exists hotel_intro;
