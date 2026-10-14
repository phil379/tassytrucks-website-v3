-- PAY_03 — Tassy Recovery driver share 55 -> 60. PROPOSED 2026-10-14. NOT APPLIED.
--
-- Goes with the Recovery launch ladder in lib/quote.ts (145/170/190/220/255/295).
-- Phil asked for the price change on 2026-10-14; the driver-pay row is a payout
-- change, so it is applied only on his explicit yes, in the same hour the
-- website change is merged and deployed.
--
-- WHAT IT DOES AT 13-17 MILES (round trip): price $195 -> $220, driver $107.25
-- -> $132.00, Tassy cash $70.80 -> $70.32. The driver gets about $25 more per
-- trip; Tassy keeps the same dollars. Margin moves from 36.3% to 32.0%.
--
-- ORDER OF OPERATIONS: deploy the website change and run this together. Run
-- alone it pays 60% of the OLD price; deploy alone leaves 55% of the NEW price.
-- The percentage is frozen at assignment, so trips already assigned keep the
-- share they were assigned at. Before running, check there are no unassigned
-- Recovery bookings still priced on the old card.
--
-- HELD, NOT INCLUDED: the second step (driver 62%, prices 160/185/210/240/275/320)
-- after a month of completed trips and facility feedback.

update public.pay_rates set
  driver_pct = 60,
  notes = 'Raised 55 -> 60 on 2026-10-14 with the Recovery launch ladder (145/170/190/220/255/295). At 13-17 miles the driver goes from about $107 to about $132 and Tassy keeps about $70. Held for later: 62% with the target ladder. See PAY_03.',
  updated_at = now()
where service_line = 'recovery';

-- Check after running (expect one row, driver_pct 60.00):
-- select service_line, driver_pct, updated_at from public.pay_rates where service_line = 'recovery';
