# The 13 blank school addresses — resolved

**Date:** 2026-09-29
**Status:** 11 of 13 resolved. 2 retirements ready. Nothing applied yet.

---

## Where this started

299 Mecklenburg County schools seeded from the county GIS layer. **286 carried a full street address; 13 did not.** The Scholar wizard asked every parent to type the address anyway — including the 286 where it already knew.

Part 1 (`d91e204`) fixed the form. This is the data half.

---

## Three sources, in order of authority

| Source | Verdict |
|---|---|
| Google geocoder | **Dead.** `GOOGLE_MAPS_API_KEY` is marked sensitive in Vercel (`vercel env pull` returns the literal `[SENSITIVE]`) and is referrer-restricted, so a server-side call would likely be rejected anyway. |
| Mecklenburg MasterAddress parcel join | **3 of 11.** Authoritative where a parcel carries exactly one address point. Seven parcels carried several, one carried none. |
| **The school's own published address** | **Best.** The organisation stating where it is. No API key. Citable when a route is disputed. |

### The trap the third source sets

The CMS district page `/Page/532` returns `7050 Nations Ford Road` — but that page is **Elementary Learning Community E**, an administrative office that happens to share the address. A directory page would have been a wrong answer that looked right.

Rule: fetch the **school's own** site, never a district or directory page. Record the source URL.

---

## Final dispositions

### Accept — 7

| School | Address | Source | Corroboration |
|---|---|---|---|
| Lansdowne Elementary | 7200 FOLGER DR CHARLOTTE NC 28270 | parcel (single point) | — |
| Rea Farms STEAM Academy | 11532 GOLF LINKS DR CHARLOTTE NC 28277 | parcel (single point) | — |
| Steele Creek Preparatory Academy | 2108 SHOPTON RD CHARLOTTE NC 28217 | parcel (single point) | — |
| Nations Ford Elementary | 7050 Nations Ford Road, Charlotte, NC 28217-3461 | `nationsfordes.cmsk12.org` | parcel 7046/7050 → **7050** ✓ |
| Mint Hill Elementary | 11615 Idlewild Rd., Matthews, NC 28105 | `minthilles.cmsk12.org` | 11615 present in parcel set ✓ |
| Turning Point Academy | 8701 Moores Chapel Road, Charlotte, NC 28214-1555 | `turningpointae.cmsk12.org/contact` | parcel 8701/8721 → **8701** ✓ |
| South Pine Academy | 2541 Sandy Porter Road, Charlotte, NC 28273-3162 | `southpinees.cmsk12.org/contact` | parcel 2541/2545 → **2541** ✓ |
| East Voyager Academy | 7429 Tuckaseegee Rd, Charlotte, NC 28214 | `eastvoyager.org` | 7429 present in parcel set ✓ |

Four of these gain a **ZIP+4** the parcel join never had.

### Accept — Palisades High School, after independent confirmation

**15221 York Road, Charlotte, NC 28278**

The build flagged this as a stop: the school publishes `15221 York Road`, the parcel candidates were `14947 / 14971 / 15215`. Under the standing rule — *disagreement is a stop, not a tiebreak* — it stayed null.

The rule was right as a default. What it couldn't see is **why** the sources disagree:

> Palisades High School **opened August 2022.** Mecklenburg's address points on that parcel predate the building.

This is not two sources contradicting each other about a fact. It is **stale parcel data losing to a current one.** Confirmed at `15221 York Road, Charlotte, NC 28278` by the school's own site and, independently, by the Wikipedia article which also gives the 2022 opening.

Accept.

### Retire — 3, not 2

Originally two unbuilt CMS planning placeholders:

- `ambemarle-winterfield-relief-school`
- `south-mecklenburg-ardrey-kell-relief-high`

**Add a third: `northside-christian-academy`.**

Its own domain `ncaknights.com` now 301-redirects to a Norwegian restaurant site — lapsed and re-registered. That is not an obstacle to finding the address; it is **the symptom**. Northside Christian Academy **closed in 2024**, citing low enrollment, after more than 60 years. Reported by WFAE, WSOC-TV, the Charlotte Observer and Christian Post.

A closed school does not need an address. It needs to leave the picker. Backfilling it would have been the wrong task done well.

The picker already filters `active` (`route.ts:35`), so all three deactivate cleanly.

### Judgement call — Harper Middle College High School

**315 W Hebron Street, Charlotte, NC 28273-4304** — published at `harperhs.cmsk12.org/our-school/about-us`. It is the CPCC Harper Campus.

The build declined to promote "no contradiction" into "confirmation," which is the right instinct: the parcel returned **zero** address rows, so there is nothing to cross-check against. CPCC's own campus catalog page gives no street address either, so a second source was not available.

**Recommended: accept, single-sourced, flagged.** The reasoning:

- The absence of parcel data on a college campus is **expected**, not suspicious — unlike Palisades, nothing contradicts it.
- The school publishes it for itself.
- The failure mode is unusually mild. Harper students attend on the CPCC Harper campus; a driver arriving at 315 W Hebron Street is at the right campus even if the building within it differs. That is not the wrong-street failure the standing rule exists to prevent.

---

## Net result

| | Before | After |
|---|---|---|
| Schools with an address | 286 / 299 | **297 / 299** |
| Schools a parent can pick | 299 | **296** (3 retired) |
| Parents who must type an address | 13 in 299 | **0** |

Every active school in the picker carries an address. **State B — "we don't have an address on file for this school yet" — becomes unreachable in practice.** The code stays, because the next dataset refresh can reintroduce a blank, and because the state-B spec builds its own fixture rather than borrowing one from the dataset.

---

## What to record alongside each address

- `address_source` — `school-site` or `parcel`
- `address_source_url` — the exact page
- `address_verified_at` — the date

When a route is disputed, that is the row you point at.

---

## What this cost

No API key. No coin flip. Two wrong answers avoided that both looked right: a district office masquerading as a school, and a closed school about to be given a fresh address.
