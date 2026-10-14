-- PAY_04 -- cap the driver share at 55% on every service line. PROPOSED 2026-10-14. NOT APPLIED.
--
-- Phil, 2026-10-14: "cap the driver share to 55 for all the different service
-- lines ... our pay is good ... mine will be at the difference", out of which
-- Tassy pays insurance, dispatch and the rest. This REPLACES PAY_03 (Recovery
-- 55 -> 60), which is withdrawn: Recovery simply stays at 55.
--
-- WHAT IT CHANGES (pay_rates.driver_pct):
--   care_wav   60 -> 55
--   concierge  60 -> 55
-- UNCHANGED: care 55, recovery 55, winnie 55, scholar 40.
-- Scholar is NOT raised to 55. "Cap" is read as a ceiling. At 55% Scholar loses
-- money (about -$0.18 a leg at $839 a month). Scholar stays at 40% until Phil
-- decides the route-length gate or a new price.
--
-- EFFECT AT A TYPICAL TRIP (Tassy cash goes up by the share removed):
--   Care WAV  11-15 mi $155: driver $93.00 -> $85.25, Tassy $46.21 -> $53.96 (34.8%)
--   Concierge 13-17 mi $129: driver $77.40 -> $70.95, Tassy $37.56 -> $44.01 (34.1%)
--
-- DRIVER-SIDE RISK, read before running: against Phil's own Uber Black earnings,
-- Concierge at 55% pays a driver about 20% less than Uber on the 13-17 mile
-- band after vehicle costs (about $58 net against about $74). On 0-3 and 4-7 mile
-- trips it still pays more than Uber. Care WAV drivers carry lift-equipped
-- vehicles; 55% may be hard to recruit against. Check driver-facing pay copy
-- (careers page) before running.
--
-- ORDER OF OPERATIONS: pay % is frozen at assignment, so trips already assigned
-- keep their share. Run after the website change is merged, in the same hour.
-- Run only on Phil's explicit yes.

update public.pay_rates set
  driver_pct = 55,
  notes = 'Capped at 55 on 2026-10-14 (was 60), same cap as every other line except Scholar. See PAY_04.',
  updated_at = now()
where service_line in ('care_wav', 'concierge');

-- Check after running (expect care 55, care_wav 55, concierge 55, recovery 55, scholar 40, winnie 55):
-- select service_line, driver_pct, updated_at from public.pay_rates order by service_line;
