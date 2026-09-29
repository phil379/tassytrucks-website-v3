# Scholar school address — Part 1 shipped, Part 2 blocked and re-routed

**Date:** 2026-09-29
**Status:** Part 1 committed (`d91e204`), not pushed. Part 2 stopped correctly; a better source found.

---

## The principle this came from

> Never present an empty required field for a fact the system already holds. If a selection resolves the fact, show the fact. Every field removed is a person who finishes.

Stated by Phil on 2026-09-29 after seeing the Scholar wizard ask for a school address it already had. It now applies to every form in both apps — parent, driver, CNA, facility, sales rep.

---

## Part 1 — done

`d91e204` *feat(scholar): stop asking for an address we already hold*

Three states, driven by whether the match resolved **and** whether the matched row has an address:

| State | Condition | Behaviour |
|---|---|---|
| **A** | matched + address (286/299) | No address input at all. Address rendered as confirmation under the school, title-cased for display, with "Not this one? Change school". |
| **B** | matched + no address (13 today) | Input appears, required, and says why: *"We don't have an address on file for this school yet."* |
| **C** | free text | Input appears, required. Unchanged — a null `school_id` stays the review predicate. |

Both surfaces share the states through `SchoolPicker`.

**Gates:** audit-saas-links 5/5 · tsc clean · build clean · **300 passed**

### A correction to the brief — the one that mattered

My spec said to apply the same hiding on `/request`. Wrong:

> `/request` has no "School address" field to remove. Its school address is the trip's `dropoffAddress`, whose **direction depends on the run** — an afternoon-only trip collects *from* the school.

Auto-hiding that would have pre-filled a drop-off field for a run where the school is the **pickup**. A wrong destination that looks like a completed form. The confirmation states were shared via the picker; no core routing field was auto-hidden.

*Open sub-question:* whether `dropoffAddress` should be prefilled from the school at all, run-direction-aware. Not done, awaiting a decision.

### Two build decisions worth keeping

- **Display casing is display only.** The county publishes `4100 GALLANT LN CHARLOTTE NC 28273`. Shouting a parent's own school back at them reads as a fault — but `schools.address` keeps the source value verbatim, because that is the value you point at when a route is disputed. State abbreviations and directionals stay upper (`Nc` is worse than leaving it alone).
- **Changing school clears the address.** The input remounts empty rather than re-seeding from the school just discarded. A stale address the parent can no longer see the source of is a wrong destination wearing the costume of a finished form.
- **Parent-typed addresses are never written back to `public.schools`.** It is a shared canonical list; user text is not a verified source.

### Two things the tests caught

- The **state-B fixture is created by the spec**, not borrowed from the dataset — so Part 2's backfill cannot silently retire that coverage.
- The full-wizard test initially failed because **Playwright completes six steps in 2.9s and tripped the 3s bot guard.** The guard was right.

---

## Part 2 — stopped, and correctly

### 2a — the two placeholders: ready, not applied

The picker already filters `active` (`route.ts:35`), so deactivating works as intended.

- `ambemarle-winterfield-relief-school`
- `south-mecklenburg-ardrey-kell-relief-high`

Both are unbuilt CMS planning sites. A parent should never see them.

### 2b — the geocode path is dead

`GOOGLE_MAPS_API_KEY` is marked **sensitive** in Vercel: `vercel env pull` returns the literal string `[SENSITIVE]`. It also appears to be **referrer-restricted**, so a server-side call would likely be rejected even with the value.

Correct stop. Nothing written, nothing committed.

### The county parcel join — tried, 3 of 11

An exact parcel-id join into Mecklenburg MasterAddress, which is more authoritative than a geocoder.

**Accept — 3** (single unambiguous address on the parcel):

| School | Address |
|---|---|
| Lansdowne Elementary | 7200 FOLGER DR CHARLOTTE NC 28270 |
| Rea Farms STEAM Academy | 11532 GOLF LINKS DR CHARLOTTE NC 28277 |
| Steele Creek Preparatory Academy | 2108 SHOPTON RD CHARLOTTE NC 28217 |

**Refuse — 8.** Seven parcels carry multiple address points; one has none.

- **Mint Hill Elementary** — 10 candidates including unit-numbered points (`11615 IDLEWILD RD M164/M300/M301`). Unit numbers on a school parcel means the join itself is suspect.
- **Northside Christian Academy** — 5, spanning two different streets (JEREMIAH BV and EQUIPMENT DR).
- **East Voyager** 5 · **Palisades High** 3 · **Nations Ford** 2 · **South Pine** 2 · **Turning Point** 2 — adjacent street numbers, genuinely 50/50.
- **Harper Middle College at CPCC** — no address point at all; it sits on a college campus.

Per the standing rule, a coin flip between `7046` and `7050 NATIONS FORD RD` is the silent-drop class. All 8 left null → parent lands in state B.

---

## The fourth way — a school's own published address

Neither a geocoder nor a parcel join. **Each school publishes its own address**, and that is more authoritative than either: it is the organisation stating where it is.

Proven on the hardest of the 8:

- CMS district page `/Page/532` gives `7050 Nations Ford Road` — but it is **Elementary Learning Community E**, an administrative office, not the school. That page would have been a wrong answer that looked right.
- The school's own site, `nationsfordes.cmsk12.org`, footer: **`7050 Nations Ford Road, Charlotte, NC 28217-3461`**

So Nations Ford's 50/50 is resolved — **7050**, with a ZIP+4 the parcel join never had. The district office happens to share the address, which is exactly why the school's own page had to be the one checked.

Every CMS school runs at `<slug>.cmsk12.org` with the address in the footer. East Voyager (charter) and Northside Christian (private) publish theirs on their own sites.

**No API key. No coin flip. A source that can be cited when a route is disputed.**

Requirements if this path is taken: fetch the **school's own** site, not a district or directory page; record the source URL next to each address so the provenance is auditable; anything that still doesn't resolve stays null and lands in state B.

---

## Options on the table

| | Option | Assessment |
|---|---|---|
| 1 | Ship 3 accepts + 2 retirements, leave 8 null | Safe, partial. 8 parents keep typing. |
| 2 | Put the Maps key in `.env.local` | **Worst option.** Puts a restricted key on disk to reach a *less* authoritative source than one that needs no key. |
| 3 | Eyeball the parcel candidates and pick | Turns a coin flip into Phil's coin flip. Same risk, now with a name on it. |
| **4** | **Resolve from each school's own published address** | **Recommended.** No key, better provenance, cites a source. |

Recommended sequence: ship 1 now (3 + 2 retirements are ready and safe), then run 4 for the remaining 8 and review the list with source URLs before it ships.

---

## Housekeeping

`5468a21 docs(scholar)` is unpushed. Code Mode noted it wasn't its commit and attributed it to Phil — it was **Claude's**, committed from this session while the Projects API was returning 502s. Repo `docs/` was chosen deliberately: Code Mode can read repo docs, it cannot read Project docs.
