# Marketing Claims Inventory

**Generated:** 2026-09-23 · commit `90b3489` · **inventory only — nothing was deleted, edited, or commented out.**

Every row below is a claim a human must adjudicate. Search covered `app/`, `components/`, and `lib/`
(source only — `node_modules/`, `.next/`, `test-results/` excluded).

---

## Headline finding: this is a cheap removal pass

**36 of 47 live instances (77%) sit in a single file — `app/page.tsx`.** There is no CMS, no content
JSON, and no constants module for marketing copy. Claims are hardcoded JSX, with one partial exception:

- **`verticals` array (`app/page.tsx:33–79`)** is a local const that feeds the `#services` section. It
  carries 4 claims (`Female drivers`, `HIPAA-aware`, `Photo + chip verification`, `real-time updates`,
  `CNA-trained`). Editing that one array fixes those everywhere the array renders.
- **`testimonials` array (`app/page.tsx:319–321`)** holds all 3 fabricated-looking testimonials
  (`Janelle R.`, `Marcus T.`, `Aesthetic Carolina`) in one place.
- Everything else is inline JSX at the line given.

The SEO pages under `app/charlotte/` carry a **second, separate** cluster (`Atrium Health`, `24/7`,
`on-time`) written into body prose — those need sentence-level edits, not a value swap.

---

## A. Fabricated / named third parties

| Exact string | File | Line | Rendered by |
|---|---|---|---|
| `Dr. Kim, RN · Discharge Planner, Atrium Health` | `app/page.tsx` | 269 | `<section id="facilities">` — testimonial attribution |
| `Atrium Health · "Outstanding service!" ★★★★★` | `app/page.tsx` | 162 | Hero visual — floating review card |
| `Atrium Health Charlotte` | `app/page.tsx` | 292 | `<section id="facilities">` — partner `pill` |
| `Aesthetic Carolina` | `app/page.tsx` | 293 | `<section id="facilities">` — partner `pill` |
| `Aesthetic Carolina · Anchor partner` | `app/page.tsx` | 321 | `testimonials` array → testimonials section |
| `Bataclan Pets` | `app/page.tsx` | 294 | `<section id="facilities">` — partner `pill` |
| `Janelle R. · Charlotte` | `app/page.tsx` | 319 | `testimonials` array |
| `Marcus T. · Discharge planner` | `app/page.tsx` | 320 | `testimonials` array |
| `Atrium Health or Novant Health` | `app/charlotte/veteran-transport/page.tsx` | 169 | SEO body prose |
| `Atrium Health Carolinas` | `app/charlotte/wheelchair-transport/page.tsx` | 150 | SEO body prose |
| `Atrium Health` | `app/charlotte/dialysis-transport/page.tsx` | 159 | SEO body prose |

> ⚠️ Lines 162, 269, 292–294, 319–321 name real, identifiable third-party organizations and a named
> clinician as endorsers. These are the highest-risk rows in this file.

## B. Unverifiable performance statistics

| Exact string | File | Line | Rendered by |
|---|---|---|---|
| `98%` (+ label `On-time arrival`) | `app/page.tsx` | 286, 287 | `<section id="facilities">` — stat block |
| `&lt; 30 min` | `app/page.tsx` | 282 | `<section id="facilities">` — stat block |
| `Dispatchers online now · Avg. response 8 min` | `app/page.tsx` | 114 | Hero — live-status strip |
| `2 min early` | `app/page.tsx` | 176 | Hero visual — floating stat card |
| `hundreds of clients` | `app/page.tsx` | 368 | `<section id="founder">` — founder bio prose |
| `On-time, every time` | `app/nemt/page.tsx` | 35 | NEMT feature card title |
| `On-time, every time` | `app/page.tsx` | 320 | `testimonials` array (inside Marcus T. quote) |
| `on-time` | `app/charlotte/best-nemt-providers/page.tsx` | 24, 88 | SEO `quickAnswer` + body prose |

> **`&lt; 30 min` is HTML-escaped in source** — a literal grep for `< 30 min` returns nothing. Worth
> knowing before anyone runs a find-and-replace.

## C. Compliance and credential claims

| Exact string | File | Line | Rendered by |
|---|---|---|---|
| `HIPAA-aware, judgment-free` | `app/page.tsx` | 44 | **`verticals` const** → `#services` |
| `HIPAA-compliant` | `app/page.tsx` | 101 | Hero subhead prose |
| `['HIPAA', 'PHI-compliant']` | `app/page.tsx` | 123 | Hero — trust-strip pair array |
| `HIPAA-aware` | `app/page.tsx` | 267 | `<section id="facilities">` — testimonial quote |
| `HIPAA-aware` | `app/recover/page.tsx` | 64 | Partner CTA body |
| health-information handling language | `app/privacy/page.tsx` | 18 | Privacy policy prose |
| `PHI-compliant messaging` | `app/partners/page.tsx` | 218 | Partners body prose |
| `CNA-trained drivers` | `app/page.tsx` | 64, 65 | **`verticals` const** → `#services` |
| `CNA-trained drivers` | `app/recover/page.tsx` | 8, 18, 19, 27 | Metadata description, hero tagline, hero description, feature card |
| `CNA-trained drivers` | `app/pricing/page.tsx` | 132 | Pricing tier body |

> `HIPAA-compliant` (line 101) and `PHI-compliant` (line 123) are stronger assertions than the
> `HIPAA-aware` used elsewhere in the same file. The site is internally inconsistent on this.

## D. Service-capability claims

| Exact string | File | Line | Rendered by |
|---|---|---|---|
| `Track in real time. Family gets pickup & dropoff alerts.` | `app/page.tsx` | 240 | `<section id="how">` — step 3 |
| `Owner gets real-time updates` | `app/page.tsx` | 51 | **`verticals` const** → `#services` |
| `Photo + chip verification` | `app/page.tsx` | 51 | **`verticals` const** → `#services` |
| `Female drivers on request` | `app/page.tsx` | 44 | **`verticals` const** → `#services` |
| `real-time ETA visibility` | `app/partners/page.tsx` | 96, 203 | Partners body prose |
| `answered by a person 24 hours a day` | `app/partners/page.tsx` | 88 | Partners body prose |
| `24/7 dispatch` | `app/charlotte/dog-grooming-pickup/page.tsx` | 65 | SEO body prose |
| `staff our dispatch line 24/7` | `app/charlotte/best-nemt-providers/page.tsx` | 157 | SEO body prose |
| `answers 24/7` | `app/charlotte/pet-boarding-transport/page.tsx` | 153 | SEO body prose |

> `Track in real time` / `pickup & dropoff alerts` / `real-time ETA visibility` describe tracking
> features. The request pipeline shipped in this repo does not provide tracking.

## E. Pricing claims

| Exact string | File | Line | Rendered by |
|---|---|---|---|
| `See the price upfront — no surge, no hidden fees, no booking fees` | `app/page.tsx` | 238 | `<section id="how">` — step 1 |
| `upfront pricing, no surge, no booking fees` | `app/page.tsx` | 386 | Final CTA section |
| `Pay upfront for the season` | `app/school/page.tsx` | 54 | School plan feature list |

> These now conflict with the `/request` page copy, which states pricing is **quoted** before
> confirmation. Worth reconciling in the same pass.

---

## F. Already resolved — no action needed

| String | File | Line | Status |
|---|---|---|---|
| `4.9★ Google` | `app/page.tsx` | 117, 310 | **Already removed** by FIX_PROD_131 — survives only inside explanatory `{/* … */}` comments |
| `15,000+ rides` | `app/page.tsx` | 117, 310 | **Already removed** by FIX_PROD_131 — comments only |

## G. False positive

| Match | File | Line | Why |
|---|---|---|---|
| `4.9` | `components/seo/PawIcon.tsx` | 13 | SVG path coordinate (`c2.6 0 5.4 2.1 6.1 4.9`) — not a rating |

---

## Removal-cost summary

| Location | Live claims | Cost to fix |
|---|---|---|
| `app/page.tsx` — `verticals` const (33–79) | 5 | **Cheap** — one array |
| `app/page.tsx` — `testimonials` array (319–321) | 3 | **Cheap** — one array |
| `app/page.tsx` — inline JSX (hero, `#how`, `#facilities`, founder, CTA) | 28 | Medium — 14 distinct edits |
| `app/charlotte/*` — SEO prose | 8 | Medium — sentence rewrites, 6 files |
| `app/partners/page.tsx` | 4 | Medium — prose |
| `app/recover/page.tsx` | 5 | Cheap — repeated tagline |
| `app/pricing/page.tsx`, `app/school/page.tsx`, `app/nemt/page.tsx`, `app/privacy/page.tsx` | 4 | Cheap — one line each |

**Total live instances: 47 across 13 files.** No shared constants module exists, so there is no
single switch — but `app/page.tsx` alone accounts for the majority, and two of its arrays cover 8 of
those in two edits.
