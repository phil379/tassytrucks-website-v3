-- Hotel zone prices (Tassy Concierge, hotel <-> CLT).
--
-- NOT APPLIED BY THIS PR. Phil applies it before the code that writes these columns is deployed.
--
-- A hotel-zone booking stores the price charged (estimate_low_cents = estimate_high_cents, one
-- number) AND the standard Concierge card price beside it:
--
--   card_price_cents   what the card price is for this booking (both legs on a round trip), BEFORE
--                      any hotel introductory price. Ops works out the driver's fixed pay from
--                      this, floor(0.55 x card / 100), never from the charged price.
--   hotel_slug         which listed hotel matched (lib/hotel-zones.ts)
--   hotel_zone         uptown | southpark | airport-area. The intro ride cap counts rows by this.
--   hotel_intro        true when the introductory price was charged
--
-- Additive and nullable. Every non-hotel row leaves all four empty, so nothing else changes.
-- `card_price_cents` is created ONLY by this migration. The ops [Pay] PR (#113) does not create,
-- read or write it: it works the card price out of list_cents / agreed_cents / quoted_cents. A
-- separate ops follow-up PR will read card_price_cents, so apply this migration BEFORE that PR is
-- deployed. `if not exists` just makes re-running this file safe.

alter table public.trip_requests
  add column if not exists card_price_cents integer,
  add column if not exists hotel_slug text,
  add column if not exists hotel_zone text,
  add column if not exists hotel_intro boolean;

create index if not exists trip_requests_hotel_zone_idx
  on public.trip_requests (hotel_zone)
  where hotel_zone is not null;

comment on column public.trip_requests.card_price_cents is
  'Standard Concierge card price for this booking in cents (both legs on a round trip), before any introductory price. Driver pay is derived from this, never from the charged amount.';
comment on column public.trip_requests.hotel_slug is
  'Listed hotel that priced this ride (lib/hotel-zones.ts). Null for every non-hotel ride.';
comment on column public.trip_requests.hotel_zone is
  'Hotel price zone: uptown, southpark or airport-area. Null for every non-hotel ride.';
comment on column public.trip_requests.hotel_intro is
  'True when the zone introductory price was charged instead of the card price.';
