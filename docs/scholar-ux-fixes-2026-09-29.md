# Tassy Scholar — three UX fixes
2026-09-29 · addendum to `school-wizard-port-spec-2026-09-29.md` · raised by Phil

Standing instruction attached to all three: *"every time you build something,
make sure the experience we offer the user is smooth and super convenient."*

---

## 1. The service selector stays open after the choice is already made

Arriving at `/request?service=scholar` pre-selects Tassy Scholar correctly, but
renders an open dropdown still offering Care, Recovery, Concierge and Winnie.
The choice has been made and the UI does not say so.

**Fix.** When `/request` is entered with a `?service=` parameter, render the
selection as a decided line, not a picker:

> **Booking: Tassy Scholar** — school and after-school · *change*

`change` reveals the full selector. A parent who lands on school and realises
they need Care for a grandparent keeps the escape hatch; nobody else is invited
to wander.

**Also check:** the URL carries `plan=full-year`. If the service is switched to
a non-scholar line, does that parameter survive onto the trip? A stale plan on
a Care booking is the same class of defect as `pet`/`winnie` — a value carried
into a context that does not understand it. Assert it is dropped.

---

## 2. There is no student last name

`/request` collects **"Student's first name"** and nothing else. This is a
problem in three directions:

- **`students.last_name` is `NOT NULL`.** The wizard port cannot write a
  student row without it. (Already flagged as a blocker in the port spec; it is
  also a gap in the form that exists today.)
- **A school needs it.** "Which Marcus?" is not a question a driver should have
  to resolve at a school gate.
- **Trusted handoff depends on it.** The policy promises a driver releases a
  child only to an authorised adult. Identifying the child unambiguously is the
  other half of that promise.

**Fix.** Add **Student's last name**, required, beside the first name. Same in
the ported wizard's step 2.

---

## 3. The school is a free-text box. It should be a list.

Today a parent types their school. That produces "Ardrey Kell", "ardrey kell
hs", "Ardrey Kell High", "AK High School" — four spellings of one building.

**This is not a tidiness problem. It breaks the business model.**

The form's own helper text says it:

> *"Routes are quoted by the run, so the schedule matters as much as the
> address."*

A run is several children going to **the same school** at the same time. You
cannot group students by school, build a run, or quote by the run if the school
is a string somebody typed. Every grouping query becomes fuzzy matching, and
the margin in Scholar lives entirely in shared runs.

### The data exists

NCES publishes a public-school universe file — name, street address, latitude
and longitude, county FIPS, grade span, NCES id — as open data. Mecklenburg
County is FIPS **37119**. Charlotte-Mecklenburg Schools also publishes its own
directory, and private and charter schools can be added by hand as they come up.

Seed it **once** into a table. Do not call an external API at request time: the
list changes about once a year, and a booking form must never depend on a
third-party service being up.

### Proposed

```sql
create table if not exists public.schools (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  org_id        text not null default 'tassy',
  name          text not null,
  aka           text[] not null default '{}',   -- "AK", "Ardrey Kell HS"
  nces_id       text,                            -- null for private/charter
  district      text,                            -- 'Charlotte-Mecklenburg Schools'
  kind          text not null default 'public',  -- public | charter | private
  level         text,                            -- elementary | middle | high | k8 | other
  address       text,
  place_id      text,                            -- Google Places, for routing
  lat           numeric,
  lng           numeric,
  bell_am       time,                            -- start; drives pickup windows
  bell_pm       time,                            -- dismissal
  active        boolean not null default true
);
create index if not exists schools_name_trgm on public.schools using gin (name gin_trgm_ops);
```

Then on both forms: **type-ahead against `schools`**, with

> *Can't find your school?* → free text, stored on the trip and flagged for
> review so it can be added properly.

Never block a booking because a school is missing from a list.

### Why `bell_am` / `bell_pm` are in there now

They are empty at seed time and cost nothing. Once populated they let the
system propose the pickup window instead of asking a parent to guess it — which
is exactly the "smooth and super convenient" the instruction asks for. A parent
should not have to know that a 7:25 arrival means a 6:45 pickup from their
address. The system should say so.

### Sequencing

The `schools` table and the type-ahead should land **with** the wizard port, not
after it. Porting the wizard with a free-text school field means porting the
problem and migrating later, once real families have typed real strings.

---

## Acceptance

- `/request?service=scholar` shows a decided line, not an open picker; `change`
  reveals the selector
- switching away from scholar drops a stale `plan` parameter
- student last name required on both `/request` and wizard step 2
- school type-ahead resolves to a `schools` row and stores `school_id`
- "can't find your school" accepts free text, stores it, flags for review, and
  **never blocks the booking**
- seeding is idempotent and re-runnable
