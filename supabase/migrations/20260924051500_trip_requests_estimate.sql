-- ─────────────────────────────────────────────────────────────────────────────
-- 20260924051500_trip_requests_estimate.sql
--
-- Record the estimate the customer was actually shown.
--
-- The point is not analytics. If a rider is quoted "$85 – $105" on the website
-- and invoiced $140 six weeks later, that argument is settled by a record or by
-- two people's memories. `quoted_cents` already exists for the final agreed
-- price; these columns are the DIFFERENT number the website displayed before a
-- human ever saw the request.
--
-- estimate_shown is deliberately separate from the amounts being non-null: an
-- estimate can be computed server-side for the ops queue while the public
-- display is still switched off, and only the shown one is a promise.
--
-- Target project: tassy-ops (knllznbdpejoaiexmdea).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.trip_requests
  add column if not exists estimate_low_cents  integer,
  add column if not exists estimate_high_cents integer,
  add column if not exists estimate_miles      numeric(6,1),
  add column if not exists estimate_shown      boolean not null default false;

comment on column public.trip_requests.estimate_low_cents is
  'Low end of the range the website computed for this trip. NULL when the '
  'addresses were typed rather than picked, so no distance was measurable.';
comment on column public.trip_requests.estimate_high_cents is
  'High end of that range.';
comment on column public.trip_requests.estimate_miles is
  'Estimated ROAD miles (straight-line distance scaled by a road factor), not '
  'a routed distance. Indicative only.';
comment on column public.trip_requests.estimate_shown is
  'True only when the range was actually displayed to the customer before they '
  'submitted. This is the column that matters in a billing dispute.';

commit;
