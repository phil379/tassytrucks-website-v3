# D - Asset licensing inventory + accessibility static sweep

Repo: `/home/user/tassytrucks-website-v3` (branch main, read-only). Static code review only. I am not a lawyer and not an accessibility certifier. Everything below is read from code, files and file metadata. No production network calls were made.

Method notes:
- Contrast ratios computed with WCAG 2.x relative-luminance math (`/tmp/claude-0/-home-user/8bb284ef-0a3e-5bc3-a238-b81037194618/scratchpad/cr.py`). Semi-transparent colours were alpha-blended over the real background before computing.
- Git provenance is unusable: the repo is a **shallow clone with 6 commits**. Every `public/` and `data/` file shows its first appearance as commit `2013cd5` ("[QA] CI now runs the website's unit tests", 2026-10-23), which is clearly not the commit that created them. No creation history, authorship or commit-message provenance exists for any asset.
- No LICENSE, NOTICE, CREDITS or ATTRIBUTION file exists in the repo. No docs file mentions where the mascots, medallion or logo came from.

---

## TASK 1 - ASSET LICENSING INVENTORY

### 1A. Findings that need a human decision (most serious first)

| # | Sev | Finding | Evidence | Needed from Phil |
|---|---|---|---|---|
| 1 | HIGH | **The HIRE Vets medallion PNG is not a pristine DOL download.** The file carries an embedded C2PA/Content-Credentials manifest stating "Claude provided this file at the request of a user and may have created or modified the file contents" (`origin-confidence: unknown`, action `c2pa.opened`). It may be an unaltered upload that passed through Claude, or a re-creation. Cannot tell from the repo. | `strings public/brand/hirevets-2023-gold.png` shows `c2pa.actions.v2`, `claim_generator_info`, `com.anthropic.origin-confidence`. Displayed at `components/Footer.tsx:42-49`, `app/page.tsx:444-451`, `app/partners/page.tsx:257-264`. | Replace with the official file downloaded from the DOL HIRE Vets portal for the 2023 award, or confirm this is that file. |
| 2 | HIGH | **No evidence of the award or of permission to display the mark anywhere in the repo.** No award letter, certificate, DOL correspondence, medallion-program terms, or docs mention. The only claims are the page copy. Checked `CLAIMS_INVENTORY.md`, `docs/`, `README.md`, `public/llms.txt`, `scripts/banned-claims`: zero hits for medallion/HIRE Vets (CLAIMS_INVENTORY does not list it). | grep across repo. | Keep the DOL award notice/certificate on file. Re-read DOL's current medallion usage terms (I did not fetch them; no network). The badge reads "U.S. DEPARTMENT OF LABOR", so it is a federal-agency mark and misuse/implied-endorsement risk applies. |
| 3 | MED | **Year drift on the award claim.** The badge is a 2023 award, shown in Oct 2026. Home/partners/footer all say "2023". But `app/careers/page.tsx:39` (meta description) says "HIRE Vets Gold" with no year, which reads as current. | `app/careers/page.tsx:39` vs `:91` (which does say 2023). | Add "2023" at `app/careers/page.tsx:39`, or drop. The code comment at `app/page.tsx:433-438` already says it "must not be presented as a current-year one". |
| 4 | HIGH | **All six mascot webps carry the same Claude C2PA manifest** (care, recovery, concierge, winnie, wellness, scholar). So they were produced or handled via Claude, and are AI-assisted or AI-generated, not commissioned illustration or stock. Visual evidence agrees: care/recovery/concierge/wellness/scholar are flat gradient emoji-style icon art. `winnie-mascot.webp` is a painterly French bulldog in reindeer antlers and a black sweater whose pattern is letter-like gibberish (typical generative-image artefact). | Same `strings` output on each file. No docs mention mascots at all. Used `app/page.tsx:59-103`, rendered `app/page.tsx:195-204`. | Decide if AI-generated art is acceptable for the brand. Check whether the winnie image was generated from a photo of Phil's actual dog (the alt text claims "Winnie, the Tassy French bulldog"). AI-generated images may not be copyrightable and carry no licence from a human author. |
| 5 | MED | **Winnie mascot is Christmas-themed** (antlers, holiday sweater) but is the year-round card on the home page. Not a licence issue, a brand/relevance note. | `public/brand/winnie-mascot.webp`, `app/page.tsx:80`. | Optional. |
| 6 | MED | **Founder photo `public/tassy-founder.png` is a U.S. Army uniform portrait** ("TASSY" / "U.S. ARMY" name/service tapes, unit flag with red/white colours and "500" visible). It looks like an official military portrait, re-photographed or screenshotted (1242x1206, no EXIF). Photographer and rights unknown. A veteran in uniform on a commercial marketing page can imply DoD/Army endorsement. | Image inspected. `docs/PUBLISH_READINESS_2026_07_02.md:15` only says "a real photo exists ... Phil in Army uniform ... No Phil action needed". Used `app/page.tsx:347-352`. | Phil owns the likeness. Confirm who took the photo and that the license covers commercial use. Ask counsel about DoD guidance on uniforms in commercial promotion. Consider a civilian portrait. |
| 7 | MED | **Google Places autocomplete shows predictions in a custom dropdown with no "Powered by Google" attribution** anywhere (`grep -i "powered by google"` finds nothing). Google Maps Platform terms normally require attribution when predictions are shown without a Google map. | `components/request/AddressAutocomplete.tsx:347-383`, `lib/google-maps.ts:120`. | Verify against current Google Maps Platform terms. Not an asset file, but it is third-party branding/licence exposure. |
| 8 | LOW | **Logo SVGs are not vector.** `logo.svg`, `logo-cream.svg`, `logo-charcoal.svg`, `logo-mark.svg` are byte-identical (md5 `7052aad6...`, 328,540 B) and each is a wrapper around one embedded 1024x1024 PNG (`<image href="data:image/png;base64,...">`). The "cream/charcoal/mark" names promise colour variants that do not exist. The logo has a solid black background and shows illustrated trucks/vans resembling Ford Transit and a Freightliner-style box truck (generic illustration; mention only for completeness). | `md5sum`, `grep -c "<image"` = 1. | Confirm who drew the logo (designer contract / own work). Provide real vector sources. |
| 9 | LOW | Stale README: says fonts are "Inter + Cormorant Garamond" and gold `#E5A93B`; code uses Newsreader and `#C8932E`. | `README.md` brand section vs `app/layout.tsx:2,12-23`. | Fix when convenient. |

### 1B. Fonts

| Family | Where | What it is | Apparent source | Repo licence evidence | Status |
|---|---|---|---|---|---|
| Inter (300/400/500/600/700) | `app/layout.tsx:2,18-23`; `app/globals.css:36`; `tailwind.config.ts:46` | Body sans | `next/font/google`, self-hosted at build time (comment `app/layout.tsx:6-10`). Inter is by Rasmus Andersson. | None in repo (no font files committed; fetched at build). Licence is SIL OFL 1.1 per Google Fonts (my knowledge, not repo evidence). | CLEAR (OFL) |
| Newsreader (400/500/600/700, normal+italic) | `app/layout.tsx:2,12-17`; `app/globals.css:118,274`; `tailwind.config.ts:47` | Serif display | `next/font/google`. By Production Type. | Same as above. OFL 1.1 per Google Fonts. | CLEAR (OFL) |
| Georgia / system-ui / -apple-system stacks | `app/og-image/[slug]/route.tsx:57`, `app/r/[token]/page.tsx:28`, `app/rate/page.tsx:80`, emails in `lib/*-email.ts`, `app/pay/[token]/route.ts:38` | Fallback/system fonts, nothing shipped | OS fonts | n/a, not redistributed | CLEAR (not bundled) |
| Unicode emoji (rating faces) | `app/rate/page.tsx:28` etc. | Rendered by the viewer's OS emoji font | OS | n/a | CLEAR (not bundled) |

### 1C. Icon / code libraries

| Library | Version | Licence evidence | Status |
|---|---|---|---|
| lucide-react | 0.400.0 (`package.json:23`) | `node_modules/lucide-react/package.json` `"license": "ISC"`; `node_modules/lucide-react/LICENSE` present: ISC, with portions MIT (Feather, Cole Bemis) | CLEAR (ISC/MIT) |
| next 14.2.5 / react 18.3 | `package.json` | `"license": "MIT"` in each package.json | CLEAR (MIT) |
| `components/seo/PawIcon.tsx` | n/a | Hand-written inline SVG paw, sage `#7C9A5C`, comment "No emoji - brand stays restrained". No source cited. Looks like generic geometry. | OWN WORK (unstated; probably Claude/dev-authored) |
| Google Maps JS API + Places | loaded at runtime `lib/google-maps.ts:120` | Governed by Google Maps Platform ToS (API key based, not a file licence). See item 7 above. | UNKNOWN (attribution) |

### 1D. Every file under `public/` and `data/`

| Path | What it is | Apparent source | Licence evidence in repo | Status |
|---|---|---|---|---|
| `public/brand/hirevets-2023-gold.png` (320x320) | 2023 HIRE Vets Medallion Award, Gold, U.S. Department of Labor | U.S. DOL program badge, but file carries Claude C2PA manifest | No award letter or terms in repo (see 1A #1-3) | **UNKNOWN - third-party federal mark** |
| `public/brand/winnie-mascot.webp` | Winnie, French bulldog, reindeer antlers | AI-assisted/generated (C2PA from Claude) | none | UNKNOWN (AI-generated; no human-author licence) |
| `public/brand/care-mascot.webp` | Heart with heartbeat line | Same C2PA | none | UNKNOWN (AI-generated) |
| `public/brand/recovery-mascot.webp` | Heart with crossed bandages | Same C2PA | none | UNKNOWN (AI-generated) |
| `public/brand/concierge-mascot.webp` | Plane, golf flag, martini glass | Same C2PA | none | UNKNOWN (AI-generated) |
| `public/brand/wellness-mascot.webp` | Lotus under water drop (per alt) | Same C2PA | none | UNKNOWN (AI-generated) |
| `public/brand/scholar-mascot.webp` | Graduation cap over open book (per alt) | Same C2PA | none | UNKNOWN (AI-generated) |
| `public/tassy-founder.png` (1242x1206) | Phil in U.S. Army uniform, unit flag | Army-style portrait, rights unknown | `docs/PUBLISH_READINESS_2026_07_02.md:15` says "real photo", nothing on rights | OWN WORK (subject is owner) but photographer/uniform rights UNKNOWN |
| `public/tassy-logo.jpg` (4167x4167 JPEG) | High-res "Tassy Trucks" logo source. Not referenced by any code (`grep tassy-logo` finds only itself). EXIF `Software: Picasa`. | Phil's own file, edited in Picasa | none | OWN WORK (strong hint: owner-edited; no designer contract in repo) |
| `public/brand/logo-master.png` (1024x1024) | "TASSY TRUCKS - WE TRANSPORT WITH CARE" oval logo on black; same artwork as the SVG-wrapped PNG | Tassy brand | none | OWN WORK (no commissioning evidence) |
| `public/brand/logo.svg`, `logo-cream.svg`, `logo-charcoal.svg`, `logo-mark.svg` | Identical raster-in-SVG of the same logo | Same | none | OWN WORK |
| `public/brand/logo-print-300dpi.png` (600x600), `logo-receipt.png` (420x282) | Logo derivatives. `logo-receipt.png` metadata contains an "adobe" string (likely an Adobe ICC profile; tool-made, not a stock source). | Same | none | OWN WORK |
| `public/brand/og-image.png` (1200x630, RGBA 16-bit) | Social card | Tassy brand (`app/layout.tsx:39` comment "real Tassy og-image") | none | OWN WORK |
| `public/brand/favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` | Favicons | Derived from logo | none | OWN WORK |
| `public/llms.txt` | Text file for AI crawlers | Authored in repo (git touched by recent QA commits #52, #55) | n/a | OWN WORK |
| `data/mecklenburg-schools.json` (299 schools) | School name, kind (185 public, 98 private, 16 charter), grade span, address, lat/lng | See 1E | Header block documents the source; no licence text | see 1E |

No stock-photo, hotlink or third-party logo found: `next.config.mjs:5` records that the Unsplash host was dropped, and `app/globals.css` (hero comment) says the Unsplash hero was replaced by a CSS gradient. No Unsplash/Shutterstock/Getty strings remain in code. Also no third-party partner logos (hospitals, Uber, Lyft, CMS, etc.) are shipped as images; they appear only as text names (compare pages, school pages, `CharlotteDayMap` place names; the map caption `components/CharlotteDayMap.tsx:441-443` already says place names imply no affiliation).

### 1E. `data/mecklenburg-schools.json` origin

- Header: `source: "charlotte-gis"`, `source_url: https://gis.charlottenc.gov/arcgis/rest/services/HNS/HousingLocationalToolLayers/MapServer/1/query`, description "Mecklenburg County / City of Charlotte open GIS - Schools (view of points). CMS plus private and charter schools in the county", `fetched_at: 2026-09-29`, `count: 299`.
- Built by `scripts/build-schools-dataset.ts:1-18` ("Source: Mecklenburg County / City of Charlotte open GIS").
- Per-record `address_source`: charlotte-gis 286, school-site 7 (addresses taken from the schools' own websites, URLs recorded), mecklenburg-masteraddress 3 (county parcel/address table), null 3.
- Licence evidence: **none in the repo.** No licence/terms text, no attribution line (`grep -i licen|terms of use|public domain|attribution` in the build script and school docs: no hits). The data is government open data, which is typically permissive, but the specific layer's terms were not checked (no network). Facts (school names, addresses) are generally not copyrightable, but the dataset as compiled is a derived copy. Status: **CLEAR (government open data, source documented) - confirm layer terms/attribution requirement on the City of Charlotte open data portal.**
- School names appear on `/school` and in the picker as factual identification only (not logos). No school logos shipped.

---

## TASK 2 - ACCESSIBILITY STATIC SWEEP

The site is dark-theme (canvas `#0d1117`, surface `#161b22`, section `#14181f`, text cream `#F4EFE0`), set in `app/globals.css:8-30`. The accessibility statement (`app/accessibility/page.tsx:25-27`) claims "WCAG 2.1 AA ... keyboard-navigable menus, text alternatives on images, and motion kept subtle". Several items below conflict with that sentence.

### 2-SUMMARY. Prioritised fix list

| # | Sev | Issue | File:line | Fix |
|---|---|---|---|---|
| 1 | HIGH (WCAG 2.4.7, 1.4.11) | **Radio "pill" choices have no visible keyboard focus and a ~1.35:1 boundary.** The real radio is `sr-only`, so the global `:focus-visible` outline lands on a clipped element. The label pill only changes border/background on *checked*, never on focus. Unselected pill border is `border-line` (1.35:1). Affects "Who pays for this trip" and "Preferred contact". | `components/request/RequestForm.tsx:1104-1119` (payer), `:1192-1207` (preferred contact; `className="sr-only"` at `:1117` and `:1205`) | Add `focus-within:outline focus-within:outline-[3px] focus-within:outline-[color:var(--gold-warm)] focus-within:outline-offset-2` to both `<label>` class strings; change unselected `border-line` to `border-[rgba(244,239,224,0.40)]` (3.5:1). |
| 2 | HIGH (1.4.3) | **Day map text fails contrast** - five greys on `#13161B`/`#181C22` at 8-10.5px. See table 2B. | `components/CharlotteDayMap.tsx:273,286,297,298,299` | Use `#7C8491` for `.cdm-where/.cdm-when/.cdm-cap/.cdm-ticks` (4.53:1 on the lighter `#181C22`), `#748598` for `.cdm-rl`. |
| 3 | MED (1.4.13, 4.1.2) | **Header "Services" dropdown**: CSS-only (`hidden group-hover:block group-focus-within:block`). No `aria-expanded`/`aria-haspopup`, **cannot be dismissed with Escape** (1.4.13 "dismissible"), opens on hover only. Keyboard users can reach it (opens on focus-within) so it is operable, but not dismissible. | `components/Header.tsx:81-112` (class at `:85`) | Add a small client component: `aria-expanded`, `aria-controls`, Escape closes and returns focus to the trigger. Or make it a `<details>`/button disclosure. |
| 4 | MED (2.4.7 weak) | **Facility partner signup inputs remove the outline** (`outline-none`) and replace it only with a 1px border colour change from `--line` to gold. Border at rest is 1.35:1. | `components/partners/FacilitySignupForm.tsx:238` | Replace className with `form-field` (already has 3px gold-warm focus ring and a 3.5:1 border), or add `focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--gold-warm)]`. |
| 5 | MED (1.4.11) | **Form inputs with a 1.35:1 border** (`border-[color:var(--line)]` on `#0f141a`), unlike `.form-field` (3.5:1): HouseholdRequestForm, SchoolPicker, SchoolSetupWizard (and #4 above). | `components/school/HouseholdRequestForm.tsx:15`, `components/school/SchoolPicker.tsx:145`, `components/school/SchoolSetupWizard.tsx:25` | Switch the shared `field` constant to `className="form-field"` or border `rgba(244,239,224,0.40)`. |
| 6 | MED (1.4.3) | **School plan card text on gold**: eyebrow and cadence at 70% ink on `#C8932E` = 3.76:1; "Pricing" label at 60% = 3.07:1. | `app/school/page.tsx:120` (eyebrow), `:125` (cadence), `:140` (Pricing label) | Change `rgba(27,26,23,0.7)`/`0.6` to `rgba(27,26,23,0.85)` (5.02:1). |
| 7 | MED (1.4.3) | **Careers role eyebrow**: `eyebrow ... opacity-70` stacks opacity on ink-mute = 4.36:1 on card surface. | `app/careers/page.tsx:101` | Drop `opacity-70` (restores 7.5:1). |
| 8 | MED (1.4.11) | **Selected-option highlight in the breed list and the address list is near-invisible**: `bg-white/10` over `#0f141a` = 1.31:1; `gold/20` = 1.36:1. The active option (aria-activedescendant) is the only focus cue because DOM focus stays on the input. | `components/request/BreedCombobox.tsx:163`, `components/request/AddressAutocomplete.tsx:364` | Add a left bar: `border-l-4 border-[color:var(--gold-warm)]` plus `bg-[color:var(--gold)]/25` on the active row (also the `SchoolPicker` rows, which have no active state at all, see 2G). |
| 9 | MED (1.3.1, 3.3.1) | **Error messages not tied to fields** in several forms: `<p className={err}>` with no `id`, inputs without `aria-invalid`/`aria-describedby`. Only a generic `role="alert"` banner is announced. See 2D. | `components/school/HouseholdRequestForm.tsx:143` and every input at `:157-250`; `components/facility/FacilityWizard.tsx:252,269,312,428`; `components/facility/PatientForm.tsx:133,187,199,208` | Give each error `id={`${id}-error`}`, add `aria-invalid` and `aria-describedby` to the control (pattern already used correctly in `components/request/RequestForm.tsx:520-536` and `components/partners/FacilitySignupForm.tsx:236-243`). |
| 10 | MED (2.1.1, 4.1.2) | **SchoolPicker is declared `role="combobox"`/`listbox` but has no keyboard model at all**: no `onKeyDown`, no Escape, no arrows, no `aria-activedescendant`. Options are `<li role="option"><button>` (interactive control nested inside an option). Keyboard users must Tab into each button. | `components/school/SchoolPicker.tsx:154-168` (input), `:178-200` (list) | Reuse the keyboard handling from `BreedCombobox.tsx:78-105` (Arrow/Enter/Escape + `aria-activedescendant`), drop the inner `<button>`, put `onClick` on the `<li>`. |
| 11 | MED (native control rendering) | **No `color-scheme: dark` anywhere** (`grep color-scheme` = 0 hits). Native `datetime-local`/`date` pickers and `<select>` popups render with the light-mode calendar glyph (dark icon) on the dark `#0f141a` field, so the calendar/clock indicator is likely close to invisible, and the picker popup is light. Browser-dependent, not verified in a browser. | `components/request/RequestForm.tsx:927-936` (`requestedAt`), `:959` (`returnAt`); `components/request/TripDetailsFields.tsx:193` (date); `components/school/HouseholdRequestForm.tsx:224` (`hh-start`) | Add `color-scheme: dark;` to `.form-field` (`app/globals.css:77`) and to `html` (`:30`). |
| 12 | MED (landmarks) | **Nested `<main>` landmarks.** `app/layout.tsx:121` already wraps `{children}` in `<main id="main">`, and three pages render a second `<main>` inside it. | `app/partners/signup/page.tsx:30`, `app/rate/page.tsx:72`, `app/r/[token]/page.tsx:52` | Change inner `<main>` to `<div>`/`<section>`. |
| 13 | LOW (2.4.1) | Skip link target `<main id="main">` has no `tabIndex={-1}`, so some older browsers move the viewport without moving focus. | `app/layout.tsx:121` | `<main id="main" tabIndex={-1}>`. |
| 14 | LOW (2.4.7) | Mobile menu `<details>`: summary label is always "Open navigation menu" (even when open); no Escape; and because Header lives in the root layout, `open` stays set across client-side navigation, so the panel likely stays open on the next page (not verified in browser). | `components/Header.tsx:140-147` | Small client wrapper that closes on route change/Escape/outside click and flips the label. |
| 15 | LOW (1.1.1) | Redundant/long alt text and decorative images that should be `alt=""`. See table 2A. | `components/Footer.tsx:18`; `app/page.tsx:59-103,197`; `components/Header.tsx:57` | See 2A. |
| 16 | LOW (2.5.8 passes; 2.5.5 AAA/house standard 44px not met) | Footer links and legal row are 16-20px tall hit areas. See 2E. | `components/Footer.tsx:60-136,142-148` | Add `py-2`/`tap-target` class. |
| 17 | LOW (1.4.3) | Day map text is 8-10.5px (below any practical size even where contrast passes), and rendered inside an SVG that scales with width. | `components/CharlotteDayMap.tsx:264,269-273,280,285,297-298` | Raise to at least 12px for the HTML parts (legend, ticks, caption). |
| 18 | LOW | Intended 3px outline on school/wizard inputs is really 2px: `focus-visible:outline-3` is not a Tailwind 3.4 utility (scale is 0,1,2,4,8; no `outlineWidth` extension in `tailwind.config.ts`). `outline-none` supplies `outline: 2px solid transparent` and the colour utility turns it gold-warm, so a 2px gold ring still shows. | `HouseholdRequestForm.tsx:15`, `SchoolPicker.tsx:145`, `SchoolSetupWizard.tsx:25` | Use `focus-visible:outline-[3px]` or `form-field`. |
| 19 | LOW (2.2.2) | The 12s auto-cycling "Live Trip Board" (`.trip-card`) and the CSS `animate-float-slow` have no pause control. They are frozen only when the OS has `prefers-reduced-motion` (`app/globals.css:345-359`). Day-map animation is also skipped under reduced motion (`CharlotteDayMap.tsx:202`) but has no on-screen pause. | `app/globals.css:279-299`, `components/CharlotteDayMap.tsx:202` | Add a visible Pause button, or keep as is and note in the statement. |

---

### 2A. Images (`<img>` / `<Image>` in `app/` and `components/`)

No image is missing `alt`. No alt text is a filename. Findings are about redundancy and decorative handling.

| File:line | Element | alt value | Verdict / recommendation |
|---|---|---|---|
| `components/Header.tsx:55-61` | `<img logo-cream.svg>` inside `<Link aria-label="Tassy Transportation home">` | "Tassy Transportation - veteran-owned premium transport in Charlotte NC" | Redundant: the link's `aria-label` already names it, and `aria-label` overrides the image alt. Marketing copy in alt is noise. Use `alt=""` here (name carried by the link label), `Header.tsx:57`. |
| `components/Footer.tsx:18` | `<img logo-cream.svg>` immediately followed by visible text "Tassy Transportation" | "Tassy Transportation" | Duplicate announcement ("Tassy Transportation, Tassy Transportation"). Should be `alt=""` (decorative next to the wordmark text). |
| `components/Footer.tsx:42-49` | HIRE Vets medallion | "2023 HIRE Vets Medallion Award, Gold -- U.S. Department of Labor" | Informative, accurate. Caption text beside it repeats it (`Footer.tsx:52-53`); acceptable, or switch to `alt=""` since the caption carries the content. |
| `app/page.tsx:444-451` | HIRE Vets medallion | same | Heading beside it repeats it (`:455`). Acceptable; `alt=""` would be cleaner. |
| `app/partners/page.tsx:257-264` | HIRE Vets medallion | same | Same as above (heading `:269`). |
| `app/page.tsx:195-204` via data at `:59` | care mascot (inside a `<Link>` that also contains the `<h3>` service name at `:210`) | "A heart with a steady heartbeat line" | Decorative: the card link's text is the service name. Should be `alt=""`. Otherwise the link's accessible name becomes "A heart with a steady heartbeat line Tassy Care ...". |
| `app/page.tsx:67` | recovery mascot | "A heart with crossed bandages" | Same, set `alt=""` |
| `app/page.tsx:75` | concierge mascot | "A plane, a golf flag and a martini glass" | Same. Also puts a martini glass description in the name of a medical-transport card. |
| `app/page.tsx:80` | winnie mascot | "Winnie, the Tassy French bulldog, in reindeer antlers" | Same. Keep a name only if Winnie is meant as content. |
| `app/page.tsx:92` | wellness mascot | "A lotus flower under a water drop" | Same |
| `app/page.tsx:103` | scholar mascot | "A graduation cap over an open book" | Same |
| `app/page.tsx:348-352` | founder photo | "Phil Tassy - Founder - Tassy Transportation" | Good (meaningful, names the person). No change. |
| `app/rate/page.tsx:96` | logo in rating page | "Tassy Transportation" | Fine (sole brand text in that block). |
| `components/facility/ConsoleShell.tsx:102-108` | logo inside `<Link>` with visible text | `alt=""` | Correct. |
| `components/seo/PawIcon.tsx:4-12` | inline SVG | `aria-hidden="true"` | Correct (decorative). |
| `components/CharlotteDayMap.tsx:312-318` | inline SVG | `role="img"` + long `aria-label` (`:317`) | Good. Legend text is real HTML text. |
| `app/compare/tassy-vs-uber-health-vs-lyft-healthcare/page.tsx:17-18`, `app/compare/winnie-vs-uber-pet-vs-lyft-pet/page.tsx:18-19` | lucide `Check`/`Minus` | `aria-label="No"` on a bare `<svg>` | Add `role="img"` so the label is reliably exposed. lucide-react 0.400 does not add `aria-hidden`/`role` itself. |
| Header/Footer/CTAs (`ArrowRight`, `ChevronDown`, `Phone`, `Menu`, `X`) | lucide icons | `aria-hidden` set on `Menu`/`X` only (`Header.tsx:145-146`) | The chevrons/arrows/phone icons lack `aria-hidden="true"` (`Header.tsx:83,108,125,132`, `Footer.tsx:99`). They have no accessible name so low impact. Add `aria-hidden="true"`. |

### 2B. Colour contrast (computed)

Backgrounds: canvas `#0d1117`, surface `#161b22`, section `#14181f` (footer), form field `#0f141a`, day-map card `#13161B`/`#181C22`.

**Pairs that FAIL (below 4.5:1 text, 3:1 UI):**

| Pair | Foreground / background | Ratio | Where (file:line) | Suggested same-hue fix |
|---|---|---|---|---|
| Day map road labels (77/85/277/485) | `#39424D` on `#13161B` | **1.78** | `CharlotteDayMap.tsx:273` (used `:344-347`) | `#748598` (4.5:1 on `#181C22`, 4.79 on `#13161B`) |
| Day map hour ticks "4 AM / 8 / 12 / 4 PM / 8 PM" | `#4B535E` on `#13161B` | **2.33** | `CharlotteDayMap.tsx:286` | `#7C8491` (4.53 / 4.81) |
| Day map "where" line (Airport, Schools, Hospitals) | `#5A626D` on `#13161B`; on active row `#181C22` | **2.94 / 2.77** | `CharlotteDayMap.tsx:297` | `#7C8491` |
| Day map caption (disclaimer) | `#5F6773` on `#13161B` | **3.17** | `CharlotteDayMap.tsx:299` | `#7C8491` |
| Day map "when" (4-8 AM...) | `#6B7380` on `#13161B` | **3.79** | `CharlotteDayMap.tsx:298` | `#7C8491` |
| Day map time bands vs track | each series at `opacity .55` over `#1B2027`: gold 2.73, scholar 2.76, care 2.67, recovery 2.28, winnie 2.84 (need 3:1 for the graphic) | **2.28-2.84** | `CharlotteDayMap.tsx:283` | `.cdm-band{opacity:.8}` (recovery needs .8; others pass at .7) |
| Day map inactive swatch | care `#5B9DD9` at `.3` on `#13161B` | 1.65 | `CharlotteDayMap.tsx:292` | Informational only (active state also bolds the name); raise to `.5` or add text "Active" marker |
| Day map track vs card | `#1B2027` on `#13161B` | 1.11 | `CharlotteDayMap.tsx:282` | Decorative track; bands carry the info once opacity fixed |
| School plan card eyebrow / cadence on gold | `rgba(27,26,23,.7)` on `#C8932E` = `#4F3E1E` | **3.76** | `app/school/page.tsx:120,125` | `rgba(27,26,23,.85)` = 5.02 |
| School plan "Pricing" label on gold | `rgba(27,26,23,.6)` = `#604A20` on `#C8932E` | **3.07** | `app/school/page.tsx:140` | `rgba(27,26,23,.85)` |
| Careers eyebrow on card | ink-mute at `opacity-70` => `#80807C` on `#161b22` | **4.36** | `app/careers/page.tsx:101` | remove `opacity-70` (7.52) |
| Input borders using `--line` | cream at 12% on `#0f141a` | **1.3-1.35** (need 3:1) | `HouseholdRequestForm.tsx:15`, `SchoolPicker.tsx:145`, `SchoolSetupWizard.tsx:25`, `FacilitySignupForm.tsx:238` | `rgba(244,239,224,0.40)` = 3.50 (the `.form-field` value, `globals.css:83`) |
| Radio pill (unselected) border | `--line` on canvas | 1.35 | `RequestForm.tsx:1110`, `:1198` | same 0.40 border |
| Active listbox row fill | `bg-white/10` 1.31; `gold/20` 1.36 | | `BreedCombobox.tsx:163`; `AddressAutocomplete.tsx:364` | add left border bar (see summary #8) |

**Pairs that PASS (for completeness):**

| Pair | Ratio |
|---|---|
| `--ink` `#F4EFE0` on canvas | 16.46 |
| `--ink-soft` (0.72) on canvas / surface | 8.81 / 8.32 |
| `--ink-mute` (0.68) on canvas / surface | 7.95 / 7.52 |
| Placeholder (ink-mute) on `#0f141a` | 7.86 |
| `--gold` `#C8932E` on canvas / surface / footer section | 6.91 / 6.32 / 6.50 |
| `--gold-warm` `#E5A93B` on canvas | 9.07 |
| `--on-gold` `#1B1A17` on gold / gold-warm | 6.36 / 8.34 |
| `.pill-vet` gold on its tint | 5.09 |
| `.form-error` `#f87171` on `#0f141a` / canvas | 6.69 / 6.84 |
| `.form-alert` `#fca5a5` on its tint | 9.08 |
| `FacilitySignupForm` danger `#E06A6A` on canvas | 5.80 |
| Status badges (`.status-*`) | 4.96 to 8.73 |
| **Footer** `opacity-60` text (`Footer.tsx:31,136,142`) = `#9A9993` on `#14181f` | 6.23 |
| Footer `opacity-70` (`Footer.tsx:51`) = `#B1AEA6` | 8.03 |
| Footer eyebrows `eyebrow opacity-60 text-current` (`Footer.tsx:60,77,107,128`): `text-current` overrides `.eyebrow`'s ink-mute so it is cream at 60% | 6.23 |
| School page eyebrows `opacity-70 text-current` (`school/page.tsx:168,236,241`) | passes (cream at 70% = 8.03 on section) |
| Day map `#878D97` (title/name/nodes) on `#13161B` | 5.43; big nodes `#A3A9B3` 7.67 |
| Rating page `#6B6455` on paper / white (`app/rate`, `app/r/[token]`) | 5.53 / 5.87 |
| Compare pages `Minus` icon at `opacity-40` | about 3.5 (UI, passes 3:1) |

Notes: the "dark footer opacity-60/70" concern is **not** a failure. The dark theme tokens were already tuned (`app/globals.css:15-21` comments document the AAA work). The failures are concentrated in the hand-coloured day map, the school plan card, the careers eyebrow and non-text borders.

### 2C. Focus styles

Global rule (good): `app/globals.css:61-65` `:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible { outline: 3px solid var(--gold-warm); outline-offset: 2px; }` (specificity 0, so any outline utility class overrides it). `.form-field:focus-visible` at `:91-95` repeats it. Skip link `:54`.

Elements that remove the outline without an equivalent replacement, or hide the focused control:

| File:line | Element/class | Problem |
|---|---|---|
| `components/request/RequestForm.tsx:1112-1118` / `:1200-1206` | Radio `className="sr-only"` inside a pill `<label>` (Who pays; Preferred contact) | The focused element is clipped, its ring is invisible, and the label has no `focus-within` style. **Keyboard users cannot see which option is focused.** |
| `components/partners/FacilitySignupForm.tsx:238` | `outline-none ... focus:border-[color:var(--gold)]` | Only a 1px border colour change. |
| `components/school/HouseholdRequestForm.tsx:15`, `SchoolPicker.tsx:145`, `SchoolSetupWizard.tsx:25` | `outline-none focus-visible:outline-3 focus-visible:outline-[color:var(--gold-warm)]` | A 2px gold ring still appears (see summary #18) because `outline-3` is not generated; acceptable but not the intended 3px. |
| `components/request/RequestForm.tsx:927-936,959` (date-time) and `TripDetailsFields.tsx:193` (date) | Use `.form-field` | Focus ring is fine. The *native picker icon* rendering is the issue (summary #11). |
| `components/request/BreedCombobox.tsx:116-143` | Input is `.form-field` (ring OK). The options never take DOM focus, and the active row is only `bg-white/10` | Active option indicator is weak (1.31:1), see summary #8. |
| `components/request/AddressAutocomplete.tsx:311-335` | Same: input ring OK, active option `gold/20` weak | Same |
| `components/Header.tsx:140-147` | `<summary>` | Covered by the global rule. |

No other `outline-none`, `outline: none`, `focus:outline-none`, `ring-*` usages exist in `app/` or `components/` (grep confirmed). No `:focus` rules besides those above.

### 2D. Form label and error wiring

| Area | Label wiring | Error wiring | File:line |
|---|---|---|---|
| Main request form | Every control has `<label htmlFor>`; required marked with `*` plus sr-only "(required)" | **Good.** Per-field `aria-invalid` + `aria-describedby` (`:520-526`), `<p id=...-error className="form-error">` (`:533`), plus a focusable `role="alert"` summary with working anchor links (`:810-841`) | `components/request/RequestForm.tsx` |
| `requestedAt` | label + help text id wired (`:933`) | yes | `RequestForm.tsx:923-940` |
| `returnAt` | label `htmlFor="returnAt"` | yes via `fieldProps` | `RequestForm.tsx:956-960` |
| Trip details block (pet/school) | labels + `aria-describedby` for help and error | good (`TripDetailsFields.tsx:95-131`, `:203-212`) | `TripDetailsFields.tsx` |
| Care intake | labels + aria-invalid/describedby | good | `CareIntakeFields.tsx:95-110,127-140,204-216` |
| Address autocomplete | label `htmlFor`, `aria-describedby`, live status | good | `AddressAutocomplete.tsx:301-335` |
| Partner signup | `Field` wires id/invalid/describedby (`FacilitySignupForm.tsx:228-246`) | good | |
| **School household form** | labels present (`htmlFor`) | **gap**: `fe()` (`HouseholdRequestForm.tsx:143`) renders `<p className={err}>` with no id; inputs lack `aria-invalid`/`aria-describedby` (`:157-250`) | `HouseholdRequestForm.tsx` |
| **Facility wizard** | labels present; invite-email and role labels are `sr-only` | **gap**: errors at `FacilityWizard.tsx:252,269,312,428` have no id or describedby (only `address` is wired, `:234-240`); no `aria-invalid` | `FacilityWizard.tsx` |
| **Patient form** | labels present | **gap**: `PatientForm.tsx:133,187,199,208` no id/describedby | |
| School setup wizard | labels present; only a global `role="alert"` (`:287`) | no per-field errors to wire | `SchoolSetupWizard.tsx` |
| Placeholder-only labels | None found. The sr-only-label inputs have a real (hidden) `<label>`: `components/facility/MessageComposer.tsx:31-39` (label "Message dispatch"), `TeamPanel.tsx:76-92,152-163`, `FacilityWizard.tsx:299-322`. A visible label would be better for the two team inputs, but they are not unlabelled. | | |
| Placeholders that carry format hints | `SchoolSetupWizard.tsx:420` "(704) 555-0148", `:480` "3rd"; fine since the labels exist. | | |
| `app/ops/page.tsx:49` | `autoFocus` on the password field (page load focus jump, minor) | `role="alert"` on errors (`:52,57,62,143`) | |

### 2E. Tap targets (nav and footer)

| Element | Classes | Approx. size | Verdict |
|---|---|---|---|
| Header nav links (`Pricing/Partners/About`, `Services`) | `.nav-link` = `inline-flex min-h-[44px]` (`globals.css:182-190`) | 44px tall | OK |
| Services dropdown links | `nav-link text-sm block` (`Header.tsx:94`) | 44px min-height, `space-y-2` | OK |
| Mobile menu links | `nav-link text-sm block py-1` (`Header.tsx:155,164,166`) | 44px | OK |
| Mobile menu button | `h-11 w-11` (`Header.tsx:142`) | 44x44 | OK |
| Header phone, Request-a-Ride | `.nav-link` / `.btn-gold` | 44px+ / about 48px | OK |
| **Footer link lists** (Services, Careers, Partners, Contact) | `text-sm`, `space-y-2`, no padding (`Footer.tsx:61,78,108,132`) | about 20px tall x text width, 8px apart | Below the repo's own 44px rule (`.tap-target`, `globals.css:105`). Passes WCAG 2.2 AA 2.5.8 (24px) only via the spacing exception. |
| **Footer legal row** (Privacy / Terms / Accessibility) | `text-xs`, `gap-4`, `opacity-60` (`Footer.tsx:142-148`) | about 16px tall | Same: passes 2.5.8 by spacing exception only. Fix: add `inline-flex min-h-[44px] items-center` (`.tap-target`) to each link. |
| Footer email/phone links | `text-sm`, `break-words` (`Footer.tsx:133-135`) | about 20px | Same fix |
| "View all careers" | `inline-flex items-center gap-1` (`Footer.tsx:95-100`) | about 20px | Same fix |

### 2F. Skip link

- CSS: `app/globals.css:42-54` (`.skip-link`): `position: fixed; left: 1rem; top: -4rem; z-index: 60;` gold background `#C8932E`, dark text (6.36:1), `transition: top`. On `:focus` it moves to `top: 1rem` with a 2px cream outline. Fine, and it is first in `<body>` (`app/layout.tsx:112-115`), above the sticky header (`z-30`).
- Target: `<a href="#main">` to `<main id="main">` (`app/layout.tsx:112,121`). Exists. Only gap: no `tabIndex={-1}` on `<main>` (summary #13), and three pages add a second `<main>` (summary #12).

### 2G. Dialogs / dropdowns / comboboxes

No modal dialogs exist (`role="dialog"`, `aria-modal`, `<dialog>` grep = 0), so no focus trap is required. The interactive widgets:

| Widget | Escape | Arrow keys | aria-expanded | Other | File:line |
|---|---|---|---|---|---|
| **Header Services dropdown** | **No** | n/a (plain links) | **No** (no `aria-haspopup`/`aria-expanded`) | CSS `group-hover`/`group-focus-within`; moving the pointer away is the only way to dismiss (fails 1.4.13 "dismissible") | `components/Header.tsx:81-112` |
| **Mobile nav `<details>`** | No (native `<details>` does not close on Escape) | n/a | Native, via `summary` | Label never changes; likely stays open across route changes | `components/Header.tsx:140-179` |
| **Breed combobox** | Yes (`:97-103`, stops propagation) | Up/Down/Enter (`:78-96`), Down reopens | Yes (`:129`), plus `aria-controls`, `aria-autocomplete`, `aria-activedescendant` (`:130-132`), sr-only live count (`:173-175`) | Best-built widget. Gaps: `aria-controls` points at an id that exists only while open; weak active-row contrast (summary #8). Closes on blur/outside mousedown. | `components/request/BreedCombobox.tsx` |
| **Address autocomplete** | Yes (`:283-287`) | Up/Down/Enter (`:251-282`), Tab closes (`:288`) | Yes (`:329`), `aria-activedescendant` (`:332`), live status (`:341-345`) | Good. Gap: weak active-row contrast (`:364`). | `components/request/AddressAutocomplete.tsx` |
| **School picker** | **No** | **No** | `aria-expanded` set (`:160`) but no `aria-activedescendant` | No `onKeyDown` at all; options contain nested `<button>` inside `role="option"` (`:182-196`) | `components/school/SchoolPicker.tsx` |
| Ops `<details>` | native | n/a | native | min-h-[44px] summary (`app/ops/page.tsx:373-374`) | fine |

Recommended order of work: 1 (radio focus), 2 (day map greys), 11 (`color-scheme`), 3 and 10 (keyboard behaviour), then 9/4/5/6/7/8, then the low items. For Task 1, items 1-4 and 6 need a decision from Phil before launch.
