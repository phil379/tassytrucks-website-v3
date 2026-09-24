-- ─────────────────────────────────────────────────────────────────────────────
-- trip_requests_confirmation.sql
--
-- A confirmed booking is a different object from a request, and until now the
-- table could not tell them apart. `id`/`shortRef` is an enquiry handle. A
-- confirmation code is issued only once a dispatcher has agreed a price, and it
-- is the thing a caregiver reads down a phone line from a hospital corridor.
--
-- agreed_cents is deliberately separate from estimate_low/high_cents. The
-- estimate is what the website showed; the agreed price is what a human
-- committed to. When those two disagree, you want both numbers, not one.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.trip_requests
  add column if not exists confirmation_code text,
  add column if not exists confirmed_at      timestamptz,
  add column if not exists agreed_cents      integer,
  add column if not exists discount_label    text,
  add column if not exists discount_cents    integer,
  add column if not exists driver_name       text,
  add column if not exists vehicle_description text;

-- UNIQUE, because the code is what the operator searches by. A duplicate means
-- two customers share a booking reference and dispatch cannot tell them apart.
-- Partial: only confirmed rows carry a code, and NULLs must not collide.
create unique index if not exists trip_requests_confirmation_code_key
  on public.trip_requests (confirmation_code)
  where confirmation_code is not null;

-- The ops queue's main lookup: find a booking by the code the customer quoted.
create index if not exists trip_requests_confirmed_idx
  on public.trip_requests (confirmed_at desc)
  where confirmed_at is not null;

comment on column public.trip_requests.confirmation_code is
  'TT-XXXXXX, issued only on confirmation. Unambiguous alphabet (no 0/O/1/I/L/2/Z/5/S/8/B/U) because it is read aloud over the phone.';
comment on column public.trip_requests.agreed_cents is
  'The price a human agreed with the customer. NOT the website estimate - compare against estimate_low_cents/estimate_high_cents when they diverge.';
comment on column public.trip_requests.discount_cents is
  'Amount taken off, when a discount applied. Kept beside the label so a customer asking "what was my discount" has one answer.';

commit;
