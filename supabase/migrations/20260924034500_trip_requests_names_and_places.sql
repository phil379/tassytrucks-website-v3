-- ─────────────────────────────────────────────────────────────────────────────
-- 20260924034500_trip_requests_names_and_places.sql
--
-- Two changes the booking form asked for:
--
--   1. Split the single `contact_name` into first and last name. The first name
--      is what the auto-reply greets ("Hi Maria,"); the full name is what goes
--      on the driver's manifest. `contact_name` is KEPT and still written, as
--      the combined value, so /ops, the notification templates and every
--      existing row keep working untouched.
--
--   2. Store what the address picker already returns. Google Places hands back
--      place_id and coordinates in the same call the autocomplete already pays
--      for, so capturing them is free now and expensive later — without them,
--      mileage-based quoting means re-geocoding every historical row by hand.
--
-- Everything is nullable. A row written by the pre-existing route, or by a
-- visitor who typed an address instead of picking one from the dropdown, is
-- still valid.
--
-- Target project: tassy-ops (knllznbdpejoaiexmdea).
-- Portable: plain SQL, no Supabase-only syntax.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.trip_requests
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name  text,
  add column if not exists pickup_place_id    text,
  add column if not exists pickup_lat         double precision,
  add column if not exists pickup_lng         double precision,
  add column if not exists dropoff_place_id   text,
  add column if not exists dropoff_lat        double precision,
  add column if not exists dropoff_lng        double precision;

comment on column public.trip_requests.contact_first_name is
  'Given name. Used to greet the requester in the auto-reply.';
comment on column public.trip_requests.contact_last_name is
  'Family name. Used on the driver manifest and any invoice.';
comment on column public.trip_requests.contact_name is
  'Full name, kept as the combined first + last. Still the column /ops and the '
  'notification templates read, and still populated on every insert.';

comment on column public.trip_requests.pickup_place_id is
  'Google Places place_id, set only when the visitor PICKED a suggestion. NULL '
  'means they typed the address freehand and it was never resolved.';
comment on column public.trip_requests.pickup_lat is
  'Latitude from the resolved place. NULL when the address was typed freehand.';
comment on column public.trip_requests.dropoff_place_id is
  'Google Places place_id for the destination. NULL when typed freehand.';

-- Backfill: split the existing contact_name on the first space so old rows are
-- not blank in the new columns. Deliberately naive - a two-word name is the
-- common case and this is a convenience, not a source of truth. `contact_name`
-- remains the authoritative full name for every row written before today.
update public.trip_requests
   set contact_first_name = nullif(split_part(contact_name, ' ', 1), ''),
       -- A one-word name has no surname. Without this guard strpos() returns 0
       -- and substr(name, 1) hands back the WHOLE string, so "Cher" would be
       -- stored as first name Cher, last name Cher.
       contact_last_name  = case
                              when strpos(contact_name, ' ') > 0
                              then nullif(trim(substr(contact_name, strpos(contact_name, ' ') + 1)), '')
                            end
 where contact_name is not null
   and contact_first_name is null;

commit;
