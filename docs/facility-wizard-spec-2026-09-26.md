# Facility onboarding wizard — buildable spec
2026-09-26 · decisions locked with Phil · supersedes the wizard portion of
`facility-accounts-spec-2026-09-26.md`

Phase 1 (the front door) is committed in `2201908` and deployed: facility name +
work email → magic link. **Everything in this document is what happens behind
that link, and none of it exists yet.**

---

## Decisions locked

| Question | Decision |
|---|---|
| Pet owner contact | **Capture it** — at booking, not signup |
| Service lines picked at signup | **No.** Facility type sets the default; every line is offered at booking |
| Approval step | **None.** Nobody waits on anybody |
| Account manager | **= the sales rep who signed them up.** Residual commission |

### Why no service-line picker (the decision Phil reversed himself on)

A checkbox at signup becomes a gate you must either enforce or ignore. A
dialysis center ticks "Care"; six weeks later they need an airport run. Refuse
it and you lost a Concierge booking to protect a form field. Allow it and the
field was decorative.

It also invents a second eligibility concept. Eligibility lives on the
**vehicle** — that rule is already enforced by `default_service_lines` and the
assignable-vehicle check. A facility "having" lines is a softer parallel idea
that can drift out of agreement with the real one. That class of bug cost a full
evening on 2026-09-25.

**Instead:** facility type sets the default line. Booking shows every line with
the default pre-selected. The rep's dashboard then reports *"Lakeside booked 3
Concierge trips last month"* — an upsell signal from behaviour, not a guess a
receptionist made once.

---

## Screen 0 — front door *(built, live)*

Facility name · Work email → magic link. No password.

## Screen 1 — About your facility

| Field | Notes |
|---|---|
| What kind of facility? | The 9 `FACILITY_KINDS`. Sets `defaultLine` and the passenger noun |
| Address | Google Places autocomplete; store `addressPlaceId` |
| Main phone | |
| Website | optional |
| Who should we ask for? | `primaryContactName` |
| Their direct line | optional |

Facility type quietly drives two things the facility never has to think about:

- hospital · dialysis · clinic · rehab · senior living → **Care**
- surgery centre · dental → **Recovery**
- **veterinary → Winnie**

and the rider noun — *patient*, *resident*, or *pet*.

## Screen 2 — Who books rides

Invite teammates by email. **Two roles offered:**

- **Books rides** (`requester`)
- **Manages the account** (`admin`) — books, invites, sees invoices

`billing` ("Sees invoices only") stays in the enum for an AP clerk but is not
offered in the UI until someone asks. `approver` is **deprecated** — no approval
gate. No enum migration; this is a UI-surface decision only.

## Screen 3 — How you pay

The two existing `BILLING_MODES`, with their existing blurbs:

- **Bill us weekly** — "No card at booking. One invoice every Monday for the week before."
- **The passenger pays** — "We send a secure payment link to the passenger. You never handle their card."

If weekly: *Do you require a PO number on invoices?* → PO number field.

## Screen 4 — Your Tassy contact *(read-only)*

Not a question. Resolved from the signup link and shown back as confirmation:

> Your account manager is **Marcus Bell** · marcus@tassytrucks.com

Rep attribution rides the URL — `/partners/signup?rep=<slug>` — so a hospital
never types a Tassy employee's name and attribution cannot be faked or
mistyped. No `rep` param → both fields null, flagged for manual assignment.

---

## Pet owner capture — booking, not signup

For `winnie` trips only, collected per booking:

- Pet owner name
- Pet owner mobile

**Reason it is not optional:** the clinic is not reachable at 7pm, the owner is.
If an animal is in distress in transit, or the return leg lands after the clinic
closes, the driver needs a human who can make a decision about that animal.

Goes in the existing `trip_details` jsonb, rendered by `describeDetails` — no
schema change.

---

## Commission — must be frozen, same as driver pay

`referred_by_rep` = who sold it. **Permanent.** Drives residual commission.
`account_manager` = who services it today. **Can change.**

Both set to the same rep at signup. They diverge the day a rep leaves or an
account is reassigned, and residual commission must keep following the seller.

**The requirement:** commission is computed once and written onto the trip when
it completes — never recalculated live from the facility's current rep.
Otherwise reassigning one account silently rewrites every historical commission
statement, and a rep who has already been paid against a printed statement will
notice.

`trip_requests` already does this correctly for drivers — `driver_pay_pct`,
`platform_fee_cents`, `card_fee_cents`, `tassy_net_cents`, all frozen at
assignment. Commission needs the same treatment beside them:

```sql
alter table public.trip_requests
  add column if not exists rep_slug            text,
  add column if not exists rep_commission_pct  numeric,
  add column if not exists rep_commission_cents integer;
```

Written at completion from the facility's `referred_by_rep` as it stands at that
moment. Needs a `staff` table — sales reps do not exist in tassy-ops today
(`provision-tassy-ops.ts` returns early for `sales_rep`, so they never reach the
dispatch database at all).

---

## What the wizard never asks

No diagnosis, procedure, condition or medication. No date of birth. No insurance
member ID. **No medical record number** — actively enforced, not merely policy:
the booking-reference field rejects any bare 6+ digit string with *"Please use
your own booking reference rather than a medical record number."*

Keep that guard on every free-text field added by this wizard.

---

## Specs required before it ships

Facility phase 1 went in with **none**, and `app/api/facility-signup/route.ts`
is a second public write path into the same database as `/api/trip-request` —
the exact route class that produced the 2026-09-25 silent drop.

- happy path stores a row and returns the id
- `hp_token` filled → rejected
- submit under `MIN_FILL_MS` → rejected
- duplicate email → idempotent, no second facility
- **a failed insert must NOT return success** ← the silent-drop assertion
- `?rep=` sets both `referred_by_rep` and `account_manager`
- no `rep` param → both null, no crash
- winnie booking without pet-owner phone → rejected
- MRN-shaped booking reference → rejected

---

## Follow-on: sales rep training

The rep compensation model is now defined, so the training course needs to
match it:

- account manager = the rep who signed the facility, and who keeps servicing it
- **residual** commission — the rep earns on that facility's trips over time,
  not a one-off signup bounty
- commission follows the **seller** through account reassignment
- the signup link is personal (`?rep=<slug>`) — that link *is* the attribution,
  so a rep who sends a generic link earns nothing on that facility
