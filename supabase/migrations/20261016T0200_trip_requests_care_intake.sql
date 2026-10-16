-- Tassy Care shared booking form: medical-booking intake.
-- Additive and nullable. Existing rows are untouched.
-- Applied to tassy-ops (knllznbdpejoaiexmdea) on 2026-10-16.
-- Rollback: alter table public.trip_requests drop column care_intake;
-- PRIVACY: never store diagnosis, procedure, condition or medication here.
alter table public.trip_requests add column if not exists care_intake jsonb;
comment on column public.trip_requests.care_intake is 'Medical-booking intake for Tassy Care: dob, payer, member_id, authorization_no, consent (version, text hash, signer, signed_at, ip, ua). Never diagnosis/procedure/medication.';
