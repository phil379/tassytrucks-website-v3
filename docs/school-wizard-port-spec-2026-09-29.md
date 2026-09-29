# Bringing the Tassy Scholar wizard home — port spec
2026-09-29 · port `book/school` from TassyOps into `tassytrucks-website-v3`

## Why

Phil built a parent-direct school transport product — three plans and a
six-step setup wizard — believing he was building it on the marketing site. It
landed in TassyOps. The marketing site's `/request?service=scholar` form has
one student and five fields, which is a different and much smaller thing.

The bridge is already half-built: the marketing site links out with
`?plan=full-year`, and `full-year` is a real slug in `schoolFormulas.ts`. The
site already speaks the wizard's vocabulary; it just lands somewhere that does
not understand it.

**This spec ports the wizard into the website rather than linking out to it.**
Linking out fails `audit-saas-links.ts` check 4 ("no file may re-render the
`book.*` surface"), sends customers across two visual designs mid-purchase, and
lands them on an intake path with none of the hardening the `/request` pipeline
has.

---

## ⚠️ Read this first: the wizard has never stored a booking

`src/lib/school-booking.functions.ts` writes to `family_accounts`,
`family_members` and `family_school_subscriptions`. **None of those three
tables exist in tassy-ops.** The migration is staged at
`docs/migrations_pending/MEGA_PROD_001_*.sql` and was never applied.

The handler's own comment:

> *"On ANY failure (missing table, RLS without service-role key) we capture the
> full payload to `audit_log` for later backfill and **STILL return success to
> the UI**, so the parent's commitment completes."*

A parent completes six steps, accepts seven policies, confirms a year-long
commitment, and sees **"You're all set."** Nothing is stored in any operational
table. The trip does not exist. Dispatch cannot see it.

**This is the silent-drop pattern, written deliberately and documented as a
feature.** It is the same failure that cost a production incident on
2026-09-25, where the booking form said "Request received" for rows it never
stored.

The port must not carry this behaviour across. **A failed write returns a
failure. Always.**

*(This also corrects a claim in the master architecture document, which said no
medication or PHI field "exists anywhere in any form." That was true of the
website and false of TassyOps.)*

---

## ⚠️ Second: the wizard collects health data on a child

`schoolBookingInput` collects, for a named minor:

```
allergies · carries_medications · medication_details · special_needs_notes
```

This violates the project's standing rule — *no diagnosis, condition or
medication in any form, anywhere* — and does so for the most sensitive possible
subject: an identified child, tied to a home address, a school address and a
daily pickup time.

Tassy has no BAA, no HIPAA program, and one employee.

**Recommendation: do not port these four fields.**

Replace with a single non-medical safety field:

> **Anything your driver should know to keep your child safe?**
> *Please don't include medical details — for anything medical, call us and
> we'll arrange a CNA-escorted ride.*

That preserves the real operational need (a driver who should know a child gets
anxious, or doesn't speak much English, or needs the seat behind the driver)
without turning a booking form into a medical record. A child who needs
medication administered in transit is a `care` trip with a CNA, not a
`scholar` trip — a different service with a different rate.

If Phil wants to keep allergy capture specifically, that is a decision he
should make explicitly and in writing, not one that arrives by porting a file.

---

## What gets ported

| From `tassytrucksops` | Lines | To `tassytrucks-website-v3` |
|---|---|---|
| `components/booking/school/schoolFormulas.ts` | 134 | `lib/school-plans.ts` |
| `components/booking/school/SchoolLanding.tsx` | 105 | `app/school/book/page.tsx` |
| `components/booking/school/SchoolSetupWizard.tsx` | 473 | `components/school/SchoolSetupWizard.tsx` |
| `components/booking/school/PolicyBody.tsx` | 24 | `components/school/PolicyBody.tsx` |
| `components/booking/school/schoolWizardPersistence.test.ts` | 55 | port as a spec |

791 lines. Comparable in size to the facility wizard shipped 2026-09-26.

**Port unchanged:** the three plans and their slugs (`full-year`, `weekly`,
`after-school`), all seven policies and their exact wording, the six step
titles, `PRICING_PLACEHOLDER` ("Pricing varies by school" — there are
deliberately zero dollar amounts), and the sessionStorage resume behaviour
including `restoreStep()`'s rule that step 6 is never restored.

**Rewrite:** the submit path, the UI primitives (TanStack/shadcn → the
website's own components), `AddressAutocomplete` (the website has its own
Google Places component), and routing (`useNavigate` → Next).

---

## Routes

```
/school            → existing marketing page (unchanged)
/school/book       → SchoolLanding, three plans
/school/book/[plan]→ SchoolSetupWizard, plan resolved by slug
```

Keep the slugs exactly. Any existing link carrying `?plan=full-year` must
continue to resolve — redirect `/request?service=scholar&plan=<slug>` to
`/school/book/<slug>` so nothing already in the wild breaks.

`audit-saas-links.ts` check 5 asserts every `/request?service=X` names a
requestable line; `scholar` stays requestable, so the redirect is additive and
the check still passes.

---

## Data model — two tables that already exist and are empty

### `students` (18 columns, 0 rows) — near-perfect fit

| Wizard field | `students` column |
|---|---|
| parent first + last | `parent_name` |
| parent email / phone | `parent_email` / `parent_phone` |
| parent home address | `home_address` |
| child first name | `first_name` |
| child grade | `grade` |
| school name / address | `school_name` / `school_address` |
| emergency contact name + phone | `authorized_adults` (jsonb, defaults `[]`) |
| AM / PM window | `pickup_window_start` / `pickup_window_end` |

`authorized_adults` as jsonb is exactly right — the "trusted handoff" policy
promises the driver releases a child only to someone on a pickup list, and that
list belongs in one structured place.

**Blocker: `students.last_name` is `NOT NULL` and the wizard never asks for the
child's last name.** Either add the field to step 2 (recommended — a school
needs it anyway) or make the column nullable. Do not insert an empty string.

### `standing_orders` (24 columns, 0 rows) — for the recurring schedule

`days_of_week[]`, `pickup_time`, `return_time`, `starts_on`, `ends_on`,
`active`, `last_materialised_on`. Built for exactly this.

**Blocker: `standing_orders.facility_id` is `NOT NULL`.** A parent-direct
booking has no facility. Options, in order of preference:

1. Make `facility_id` nullable and add a check that a standing order has either
   a `facility_id` or a `student_id` — the honest model, since Tassy now has
   two recurring-booking channels.
2. Add a nullable `student_id` column alongside.
3. Do not use `standing_orders` yet; store the schedule as jsonb on the first
   trip and revisit.

`payer` defaults to `'facility'` and is `NOT NULL` — a parent-direct order
needs `'passenger'`.

### Do **not** create `family_accounts` / `family_members` / `family_school_subscriptions`

The staged migration introduces a third model for people, alongside `students`
and `facility_users`. `students` already carries the parent on the child row,
which fits a one-child-per-signup wizard. If multi-child families become real,
revisit then — with data, not in advance.

---

## Submit path

Replace the TanStack server function with a Next route handler at
`app/api/school-booking/route.ts`, mirroring `app/api/trip-request/route.ts`:

- Zod validation, `hp_token` honeypot, `elapsedMs` minimum fill time
- Service-role insert into `students`, then the schedule, then a
  `trip_requests` row with `service_line = 'scholar'` and
  `trip_details` carrying the plan and the policy acknowledgements
- **Return the row id. A failed insert returns a failure.** No `audit_log`
  fallback, no success-on-error.
- On success: ntfy push (no PII), operator email, the `TASSY-SCHOOL-XX-0000`
  reference shown on step 6

Policy acknowledgements — seven keys, each `{accepted: true, ts}` — are a
commitment record with legal weight. Store them in `trip_details` jsonb on the
trip, and keep the exact policy text under version control so an acknowledgement
can be tied to what was actually shown.

---

## Specs required

- happy path stores a `students` row and a `trip_requests` row and returns an id
- **a failed insert returns a failure and the UI does not say "You're all set"**
  ← the regression guard for the behaviour being removed
- `hp_token` filled → rejected; submit under `MIN_FILL_MS` → rejected
- each of the three plan slugs resolves; an unknown slug redirects to
  `/school/book`
- all seven policies must be accepted before step 5 unlocks
- sessionStorage resume restores steps 1–5 and never step 6
- `/request?service=scholar&plan=full-year` redirects to
  `/school/book/full-year`
- `audit-saas-links.ts` passes all five checks
- no field in the payload accepts medication, diagnosis or condition text

---

## Sequencing

This is a P2 item. It does not block the repoint, and the repoint is still the
commit that matters most.

But **the false-success behaviour should not wait for the port.** While
`/book/school` is reachable on `tassytrucksops.vercel.app`, a real parent can
complete it and be told they have a booking that does not exist. Either take
that route down or make it fail honestly — today, independent of this port.
