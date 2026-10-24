# Licenses and credits

What the public website uses that Tassy did not write, where it came from, and what we know about the right to use it.
Checked 2026-10-24 from the repository and file metadata only. **Not legal advice.** Anything marked NEEDS EVIDENCE has
no proof in this repository and is waiting on Phil (see `docs/legal/`).

## Fonts

| Font | Use | Licence | Notes |
|---|---|---|---|
| Inter (weights 300 to 700) | Body text | SIL Open Font License 1.1 (as listed on Google Fonts) | Copyright The Inter Project Authors. Downloaded at build time through `next/font/google` and served from our own domain. Visitors' browsers do **not** contact Google Fonts. |
| Newsreader (400 to 700, roman and italic) | Headings | SIL Open Font License 1.1 (as listed on Google Fonts) | Copyright The Newsreader Project Authors. Same delivery as Inter. |

The OFL allows use on a website and does not require on-page credit. Font files are not committed to this repository.

## Code libraries (shipped to visitors)

| Package | Licence |
|---|---|
| next 14.2.5, react 18.3.1, react-dom 18.3.1 | MIT |
| lucide-react 0.400.0 (icons) | ISC |
| zod 4.6.5 | MIT |
| @supabase/supabase-js, @supabase/ssr | MIT |

Build and test tools (TypeScript, Tailwind CSS, Playwright, axe-core) are development-only and are not shipped.
Each package's full licence text is in its folder under `node_modules` after `bun install`.

## Images and brand files (`public/`)

| Files | What it is | Status |
|---|---|---|
| `public/tassy-logo.jpg`, `public/brand/logo*.svg`, `logo-master.png`, `logo-print-300dpi.png`, `logo-receipt.png`, `logo-mark.svg`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `og-image.png` | Tassy logo and files made from it | Tassy's own mark. OWN WORK (no creator record in the repo). |
| `public/brand/care-mascot.webp`, `recovery-mascot.webp`, `concierge-mascot.webp`, `winnie-mascot.webp`, `wellness-mascot.webp`, `scholar-mascot.webp` | Service illustrations on the home page | **NEEDS EVIDENCE.** All six carry an embedded content-credentials note saying the file was provided by Claude at a user's request, so they are AI-assisted or AI-generated, not commissioned or stock. Phil should confirm the terms they were generated under and whether Tassy holds the rights it assumes (AI-generated images may not be protectable by copyright). |
| `public/brand/hirevets-2023-gold.png` | "2023 HIRE Vets Medallion Award, Gold" badge, U.S. Department of Labor | **NEEDS EVIDENCE.** No award letter or permission to display the Department of Labor's mark is in the repository, and the file itself is not a pristine government download. Show it only if Phil holds the 2023 Gold award; follow the Department's rules for using the medallion. The careers page meta description says "HIRE Vets Gold" with no year; the badge is for 2023. |
| `public/tassy-founder.png` | Founder portrait in Army uniform | **NEEDS EVIDENCE.** Photographer and rights unknown. Phil should confirm he may publish it (and any Department of Defense rules on using uniform images in business marketing). |

## Data

| File | Source | Status |
|---|---|---|
| `data/mecklenburg-schools.json` (299 schools) | City of Charlotte / Mecklenburg County open GIS ("Housing Locational Tools" schools layer), fetched 2026-09-29, with a few addresses taken from the schools' own websites | Public open data; the layer's specific terms were not checked (no network). Facts such as school names and addresses are generally not copyrightable. |

## Google Maps Platform

Address suggestions use the Google Maps JavaScript API (Places). Google's terms ask for its logo or "Powered by Google" attribution when predictions are shown without a Google map. The custom dropdown shows none. **NEEDS DECISION** (low effort to add; see `docs/legal/assets-and-accessibility-audit-2026-10-24.md`).

## Keeping this current

`scripts/test-licenses.ts` (run in CI) fails if a file is added under `public/brand/` or `public/` without being listed in this document.
