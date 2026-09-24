-- ─────────────────────────────────────────────────────────────────────────────
-- 20260924T2100_trip_requests_trip_details.sql
--
-- Store the per-service answers: who or what is actually travelling.
--
-- The request form asked every service line the same six questions. A Winnie
-- Ride booking captured a pet COUNT and nothing else — no name, no breed, no
-- weight, no rabies status, no carrier — and then asked for a first and last
-- name directly underneath, which reads as the form asking for the dog's
-- surname. Tassy Scholar captured no school and no grade. Tassy Recovery
-- captured nobody signing the patient out, which is the entire reason that
-- product exists. See lib/trip-details.ts for the questions themselves.
--
-- WHY ONE JSONB COLUMN RATHER THAN TWENTY-FIVE TYPED ONES.
--
-- The five service lines ask overlapping-but-different questions, so typed
-- columns would be twenty-five columns of which twenty are null on every row,
-- and every wording change a fresh migration against a live table. The shape of
-- these answers is still moving — the first fifty real bookings will change it.
-- A single nullable jsonb column lets the spec in lib/trip-details.ts evolve
-- without touching the database again, and the validator there is what keeps
-- the contents clean: unknown keys dropped, selects checked against their
-- options, text trimmed and truncated, numbers clamped.
--
-- The trade is queryability, and it is the right trade TODAY, with no rows in
-- the table. If a recurring report ever needs one of these answers indexed,
-- promote that single answer to a generated column — jsonb supports it and no
-- data has to move.
--
-- SAFETY. Additive only: one nullable column with no default, plus comment
-- changes. No drop, no rename, no type change, no NOT NULL, no backfill.
-- Existing rows are untouched and every earlier build keeps working, because
-- nothing reads a column it does not know about. This migration is safe to run
-- while the site is serving traffic and safe to run twice.
--
-- Target project: tassy-ops (knllznbdpejoaiexmdea).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.trip_requests
  add column if not exists trip_details jsonb;

comment on column public.trip_requests.trip_details is
  'Per-service-line answers about who or what is travelling, validated against '
  'the spec in lib/trip-details.ts before it is written. Keys differ by '
  'service_line: pet name/breed/rabies for Winnie, school/grade/schedule for '
  'Scholar, who signs the patient out for Recovery. NULL for a row captured '
  'before 2026-09-24, and for any line that asks nothing extra. '
  'HARD RULE: this column must never hold a diagnosis, procedure name, '
  'condition or medication - the questions are written to avoid asking.';

-- Correcting an earlier comment rather than the data it describes: since the
-- road-distance change, this is Google''s real driving distance whenever both
-- ends were picked addresses, and only falls back to a scaled straight line.
comment on column public.trip_requests.estimate_miles is
  'Estimated miles. Real driving distance from the Routes API when both ends '
  'were picked places; otherwise straight-line distance scaled by a road '
  'factor. Indicative only.';

commit;
