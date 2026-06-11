# SEO Phase 0 Audit — MEGA_SEO_001 + MEGA_SEO_002

Date: 2026-06-11 · Autonomous Code Mode session

Location decision: committed inside `tassytrucks-website-v3/docs/` so the audit
travels with the repo it describes (the master Projects folder is not a git repo
shared with this deploy).

## Existing routes (baseline, commit 5b30978)

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Marketing home |
| `/nemt` | `app/nemt/page.tsx` | Vertical page (ServicePage shell) |
| `/vip` | `app/vip/page.tsx` | Vertical page |
| `/winnie` | `app/winnie/page.tsx` | Vertical page — MEGA_SEO_002 Phase 3 hub target |
| `/renew` | `app/renew/page.tsx` | Vertical page |
| `/recover` | `app/recover/page.tsx` | Vertical page |
| `/pricing` | `app/pricing/page.tsx` | Pricing |

No `app/charlotte/`, `app/partners/`, `app/compare/` — **zero collisions** with the
18 new routes (10 from MEGA_SEO_001 + 8 from MEGA_SEO_002).

Note: `Footer.tsx` links to `/privacy`, `/terms`, `/accessibility` which do not
exist yet (pre-existing 404s, out of scope tonight — left as-is).

## Deep-link contract (`lib/saas-links.ts`)

- `SAAS_BASE = https://tassytrucksops.vercel.app`
- `book.{nemt,vip,winnie,renew,recover,quick}` — all carry `source=web`
- `subscribe.*`, `apply.*`, `portal.*`, `contact.*` present
- SEO pages need per-page `source=` attribution → added `seoBook()` helper and
  `facilityIntake()` helper (additive, nothing existing changed)

## Brand tokens / fonts

- `tailwind.config.ts` + `app/globals.css` tokens intact and match the standing
  rules exactly (charcoal/gold/cream/line). Untouched.
- Fonts: Newsreader (display) + Inter (body) loaded via Google Fonts in
  `app/layout.tsx`. Untouched.
- MEGA_SEO_002 adds `winnie-sage #7C9A5C` + `winnie-sage-soft #A8C088` as
  **additive** accent colors.

## Toolchain

- Next.js 14.2.5 (App Router) · bun 1.3.14 · TypeScript strict
- `bunx tsc --noEmit` baseline: **0 errors**
- `bun run build` baseline: **clean**, 10 static pages
- No sitemap/robots/OG infra → built in Phase 4 (`app/sitemap.ts`,
  `app/robots.ts`, `app/og-image/[slug]/route.tsx` using built-in `next/og`)
- No Playwright → installed as devDependency for Phase 5 smoke tests

## MEGA_SEO_001 status at MEGA_SEO_002 start

MEGA_SEO_002 was queued first; audit found MEGA_SEO_001 had NOT shipped (no
`components/seo/LandingPageShell.tsx`). Phil then supplied the MEGA_SEO_001 spec —
executed MEGA_SEO_001 in full first, then MEGA_SEO_002, in this session.

## Rule #12

`src/pages/winnie-facility/schedule/**` does not exist in this repo (it lives in
the SaaS repo, which this session does not touch). Honored throughout.
