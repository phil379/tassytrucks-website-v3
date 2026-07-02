# PUBLISH READINESS — 2026-07-02 (MEGA_TASSY_PUBLISH_READY, Workstream C)

Verdict: **READY TO PUBLISH.** Build green (34 routes), every top-level route 200,
display-name rebrand clean, motto everywhere it must be, no dead internal links,
all SaaS CTAs verified live. Remaining items are Phil-manual (below).

## 1 · Content — PASS (fixed this sweep)
- Service display names verified across all .tsx: nemt→**Tassy Care**, vip→**VIP Concierge**,
  winnie→**Winnie Ride**, renew→**Tassy Wellness**, recover→**Tassy Guardian**, school→**Tassy Scholar**.
  Zero old names used as service names ("NEMT" survives only as the regulatory acronym in body copy/SEO — allowed).
- "LPN": **zero occurrences** (task #180 already clean; CNA copy everywhere).
- Motto **"We Transport With Care"** added to: every service-line hero
  (`components/ServicePage.tsx` → /nemt /vip /winnie /renew /recover, plus /school hero) and the
  footer (gold italic, `components/Footer.tsx`). Also added as `slogan` in JSON-LD.
- Founder photo: **a real photo exists** (`public/tassy-founder.png`, Phil in Army uniform, tracked
  in git) but the home page rendered a "drop a photo here" placeholder — now renders the real
  portrait with `alt="Phil Tassy · Founder · Tassy Transportation"`. No Phil action needed.

## 2 · Brand — PASS (no regressions)
- Tokens hold: charcoal `#1B1A17`, gold-solid `#C8932E` primary (FIX_PROD_023), gold-warm
  `#E5A93B` hover-only; dark canvas `#0d1117` (tailwind.config.ts).
- Pricing-card contrast (FIX_PROD_034 Option A — cream card + charcoal text + gold italic price
  + gold CTA) verified by screenshot at 375/768/1440.
- Fonts: Newsreader (display) + Inter (body) via Google Fonts in `app/layout.tsx`. ✓
- Note: email everywhere is **book@tassytrucks.com** (FIX_PROD_040 swept booking@→book@ in this
  repo). Kept — the MEGA prompt's "booking@" is pre-040 drift.

## 3 · SEO — PASS (fixed this sweep)
- Unique `<title>` (<60 chars incl. " · Tassy" template) + meta description per route.
  Trimmed over-length titles on /vip /winnie /renew /recover /school.
- Canonicals: SEO landing pages already had them; **added** to /, /nemt, /vip, /winnie, /renew,
  /recover, /pricing, /school(og:url) + the 3 new legal pages. Verified in built HTML.
- OG: og:title/description (Next fallback) + per-page og:image via `/og-image/[slug]` + og:url
  added on all service pages + home. Added `vip`/`winnie`/`pricing` display names to the OG
  image generator. Twitter `summary_large_image` inherited from layout.
- robots: `app/robots.ts` (allow all + sitemap link). sitemap: `app/sitemap.ts` (now 33 URLs,
  legal pages added).
- JSON-LD LocalBusiness (layout): now includes **USDOT #3104152 + MC #79222** (PropertyValue
  identifiers), **SDVOSB** credential, slogan, phone `(704) 941-8508`, email book@tassytrucks.com.

## 4 · CTA audit — PASS (2 lib fixes)
- No `href="#"` anywhere. All book CTAs flow through `lib/saas-links.ts`.
- All 22 SaaS deep-link targets curled on tassytrucksops.vercel.app (2026-07-02): every
  `/book/*` (incl. 3 school plan setups), `/careers/{driver,sales-rep,companion,cna}`,
  `/facility/signup`, `/login`, `/subscribe?product=` → **200**.
- Fixed in `lib/saas-links.ts`:
  - `portal.driver` `/driver-app`→`/driver`, `portal.sales` `/sales-app`→`/sales` (old paths 404).
  - `facilityIntake()` `/facility/intake`→`/facility/signup` — the SaaS 307s intake→signup and
    **drops the query string**, killing attribution; now points straight at signup (used by
    /partners + /partners/veterinary).

## 5 · Addresses — PASS (n/a)
- Zero raw `<input>` elements in the repo; no forms collect addresses. All booking flows
  deep-link into the SaaS wizards (which have predictive address inputs). No component needed.

## 6 · Build & smoke — PASS
- `npm run build` green — 34 routes (33 static + og-image edge route).
- Every top-level route returns 200 locally under `next start` (incl. 3 new legal pages).
- Fixed footer 404s: `/privacy`, `/terms`, `/accessibility` were linked but didn't exist —
  created (baseline copy; **TODO(phil): counsel review** before paid acquisition).
- Screenshots 375/768/1440 of home + /pricing + /nemt (`scripts/publish-ready-shots.mjs`),
  visually inspected: dark theme, motto, founder photo, pricing contrast all correct.

## Needs Phil
1. **Legal copy review** — /privacy and /terms are honest baselines written from known facts
   (USDOT/MC, no-surge pricing, school no-show protocol, in-vehicle recording). Get counsel eyes.
2. **Home-page claims spot-check** — "15,000+ rides since 2021", "4.9★ Google", "Dr. Kim, RN"
   quote, "<30 min discharge pickup", "98% on-time" predate this sweep; confirm they're real
   before the domain swap.
3. **DNS swap** (out of scope for this workstream — steps below).

---

# DNS swap runbook (tassytrucks.com → this site)

Current state: `tassytrucks.com` serves the OLD v1 site; this repo deploys to
`tassytrucks-website-v3.vercel.app`. Canonical/OG/sitemap/JSON-LD in this repo already point at
`https://www.tassytrucks.com`, so the swap needs **zero code changes**.

1. **Vercel — attach the domain to THIS project**
   - Vercel dashboard → project `tassytrucks-website-v3` → Settings → Domains.
   - Add `tassytrucks.com` and `www.tassytrucks.com`. Set `www.tassytrucks.com` as primary
     (matches the canonical) and let Vercel redirect apex → www.
   - If the domain is currently attached to the old v1 Vercel project, remove it there first
     (same-account moves are instant; Vercel will prompt).
2. **DNS records** (at the registrar/DNS host):
   - Apex `tassytrucks.com`: `A` → `76.76.21.21` (Vercel).
   - `www`: `CNAME` → `cname.vercel-dns.com.`
   - Delete/replace any old A/CNAME records pointing at the v1 host. Keep MX/TXT (email!) untouched.
   - Low TTL (300s) beforehand if you want a fast, reversible cutover.
3. **Verify** (5–30 min for DNS):
   - `https://www.tassytrucks.com` shows the new dark site; apex redirects to www; padlock valid
     (Vercel auto-issues certs).
   - Spot-check `/nemt`, `/pricing`, `/sitemap.xml`, `/robots.txt`, one `/book` CTA into the SaaS.
   - Google Search Console: submit `https://www.tassytrucks.com/sitemap.xml`.
4. **Rollback** (if anything is wrong): point the DNS records back at the old host (or re-attach
   the domain to the v1 Vercel project). Nothing in this repo needs reverting — the preview
   domain keeps serving.
