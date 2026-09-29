# Tassy Scholar — shipped, verified live, and what's next

**Date:** 2026-09-29
**Status:** All Scholar work pushed and verified on production. Nothing pending from this run.

---

## What shipped

| Repo | Commits | What it does |
|---|---|---|
| SaaS (`tassytrucksops`) | `953dbcf..fcedd65` | The P0. `/book/school` no longer tells a parent their booking exists when nothing was stored. |
| Website (`tassytrucks-website-v3`) | `b3f0a6e..6c4e33a` | The Scholar wizard port — the six-step flow now lives on the marketing site. |
| Website | `618419c` | Three Scholar UX fixes. Deployed in 45s. |

`618419c` — *"feat(scholar): a decided service line, a student's full name, and a real school list"*

---

## Verified on production, not assumed

| Check | Result |
|---|---|
| Decided line on `?service=scholar` | "Booking:" present, **0** open selects, hidden input carries `scholar` |
| Fallback keeps the picker (`?service=guardian`) | 1 select, 0 decided line |
| Student last name | `details-student_last_name` renders |
| School type-ahead | Live |
| Wizard + legacy `?plan=` redirect | 200 / 307 → `/school/book/full-year` |

### The type-ahead is the whole argument for the fix

```
q=ardrey →
  Ardrey Kell High School             10220 ARDREY KELL RD CHARLOTTE NC 28277
  South Mecklenburg/Ardrey Kell Relief High
```

That second result is exactly what free text loses. A parent typing "Ardrey Kell" produces a string that matches neither building — and the run gets built wrong, or not at all.

### The guardian case

`?service=guardian` is a **retired** service line. The first cut of the fix told those visitors "Booking: Tassy Care," because `coerceServiceLine` always returns something and so cannot tell a choice from a fallback.

New rule, and it generalises: **a fallback is not a decision.** `serviceWasHonoured()` distinguishes the two. A visitor arriving on a line we no longer take gets the open picker, not words put in their mouth.

---

## The school list

**299 real Mecklenburg County schools** seeded from the county's open GIS layer — 185 public, 98 private, 16 charter.

- The source misspells its own ownership field (`Punlic`, `Priivate`, trailing spaces). The build **normalises rather than drops**.
- Dataset is committed. Seeding reads the file, **never the network**.
- Re-run is an upsert on `(source, source_key)` — proven 299 → 0 → 0.
- A missing school **never blocks a booking**: free text kept, `school_id` null, and that null is the review predicate.
- `bell_am` / `bell_pm` carried and currently empty.

---

## Gates

audit-saas-links 5/5 · `tsc` clean · build clean · **295 tests passed**

One documented flake: Supabase `/auth/v1/verify` per-IP rate limit on a facility spec. Two mid-run failures were the run's own test locators — `getByRole('combobox', {name: /School/i})` also matched "School address."

Four existing specs updated where behaviour legitimately changed.

---

## Open — the school address

Found immediately after this shipped, from a screenshot of step 2.

The form matches a school from the list, **then still presents "School address \*" as an empty required field.** Verified against the live table:

- 299 schools seeded
- **286 carry a full street address and lat/lng already**
- Only **13** have neither

So the form asked the parent to type an address it was already holding, in 286 of 299 cases. (The screenshot happened to land on one of the 13.)

**Standing principle, now in force for every form:**

> Never ask a user to type something the system already holds. If a selection resolves a fact, show the fact as confirmation — do not present an empty required field next to it. Every field removed is a person who finishes.

Fix is specified in two parts and handed to Code Mode:

1. **UI** — three states driven off whether the match resolved *and* whether the matched row has an address. Matched-with-address hides the input entirely and renders the address as confirmation text. Matched-without and free-text show one required input. Parent-typed addresses are **never** written back into the canonical `schools` table.
2. **Data** — backfill the 13 blanks in the committed dataset (not by direct `UPDATE`, which the seed would revert). Two of the 13 are CMS *planning placeholders* for unbuilt relief schools and should be deactivated, not addressed. The other 11 geocode through the existing Maps key, accepted only if the result lands in Mecklenburg County and types as a school — **anything that doesn't clear both stays null.** A null is honest; a confidently wrong address routes a child to the wrong building.

Part 1 ships independently of Part 2. Part 2 comes back for eyeball before it goes out.

### The 13 without an address

Retire (unbuilt CMS planning placeholders, a parent should never see them):
- `ambemarle-winterfield-relief-school`
- `south-mecklenburg-ardrey-kell-relief-high`

Backfill (real, operating schools):
- `east-voyager-academy-of-charlotte`
- `harper-middle-college-at-cpcc`
- `lansdowne-elementary`
- `mint-hill-elementary`
- `nations-ford-elementary`
- `northside-christian-academy`
- `palisades-high-school`
- `rea-farms-steam-academy`
- `south-pine-academy`
- `steele-creek-preparatory-academy`
- `turning-point-academy`

### The unrequested win

The 286 matched schools carry **lat/lng**. Mileage and pricing now compute the moment a school is picked — no geocoding a typed address later, no wrong-address trip.

---

## Radar items

**1. The 3 `tassy_archive.family_*` rows — resolved, do not re-raise.**
Code Mode flagged these again as possibly a real family. They were verified earlier this week: all three are Phil's own test signups (`P.T`, and the gmail address is his personal one). Consistent with the standing fact that **every record in tassy-ops is test data — zero real customers, drivers, vehicles, facilities or trips.**

**2. `NEXT_PUBLIC_SITE_URL` at domain cutover — still live.**
It now controls the facility setup-email link as well as ntfy tap-through. It must not move to `www.tassytrucks.com` before that domain actually serves this app. Today it serves a different site entirely.
**Order is fixed: DNS first, then `NEXT_PUBLIC_SITE_URL`.**

---

## Still ahead, unchanged in priority

1. **Make assignment transactional and idempotent** — must land *before* the repoint.
2. **The repoint** — `confirmed → assigned → completed` to the TassyOps engine. Still the highest-value commit on the board: one change turns on the event log, compliance gating and frozen economics at once.
3. **Fix `tierFor()`** — use `body_class` + `seats`, drop the `role === 'cna'` downgrade, re-derive stored `vehicles.service_lines`.
4. **Decide willingness semantics** — empty `drivers.service_lines` = *no restriction* (recommended) before any intersection logic ships. All three driver rows are currently `{}`; shipping `capability ∩ willingness` as written would make every driver unassignable.
5. **Revoke the `sbp_` personal access token** sitting in `tassytrucksops/.env.local`.

### Open decisions for Phil

- When is commission earned — at trip completion, or at customer payment?
- Willingness semantics (see 4 above).
- A date to revisit two-apps-or-one.
