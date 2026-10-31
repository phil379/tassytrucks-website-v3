-- WAV_01 -- restore the partner share on Tassy Care WAV to 60%.
--
-- STATUS: PROPOSED. NOT APPLIED. Nothing in this PR runs it, and the website never reads pay_rates.
-- Only Phil applies it, and only after the read-back below. A separate session builds the ops side.
--
-- WHY. Phil (2026-10-31): wheelchair rides are run in partner-owned vehicles and the partner stays at
-- 60% of the card price (first partner agreed 60 / 35 / 5 on Oct 2); the 55% driver rule does NOT cover
-- WAV. PAY_04 (docs/proposed-migrations/PAY_04_cap_driver_share_55_2026_10_14.sql) records that it was
-- APPLIED 2026-10-14 and set care_wav 60 -> 55 (read back then: care 55, care_wav 55, concierge 55,
-- recovery 55, scholar 40, winnie 55). The live value has NOT been read back for this PR.
--
-- STEP 0, READ ONLY, before anything else:
--   select service_line, driver_pct, basis, notes, updated_at from public.pay_rates order by service_line;
-- If care_wav is already 60, do not run this file.
--
-- Trips already assigned keep the share frozen on them at assignment (trip_requests.driver_pay_pct), so
-- this changes only trips assigned after it runs.

update public.pay_rates set
  driver_pct = 60,
  notes = 'Partner-owned wheelchair vehicle: partner keeps 60% of the card price (60 / 35 / 5). Not covered by the 55% driver cap; see WAV_01.',
  updated_at = now()
where service_line = 'care_wav'
  and driver_pct <> 60;

-- Read back (expect care_wav 60, everything else unchanged):
-- select service_line, driver_pct, updated_at from public.pay_rates order by service_line;
