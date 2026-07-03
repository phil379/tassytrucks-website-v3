# FIX_PROD_131 · Marketing Home Polish — change log

**Repo:** tassytrucks-website-v3 · **Date:** 2026-07-02 · **Scope:** refinement only (no route/token/brand-token/font changes)

## Reality vs. prompt (corrected before editing)
- Hero was already `Reliable rides. White-glove care.` (NOT `Ready when you are.` — that was the *final CTA*). The 3-equal-button pile was in the **final CTA**, and the hero already had 2 CTAs.
- The facility "banner interruption" lived in **Footer.tsx** (a top strip), while `page.tsx` already had a full, well-designed Facilities section → the fix was to **remove the redundant footer banner**, not rebuild the section.
- Site is dark-themed (`--ink` = cream text); light/dark section rhythm already existed.

## Changes (one line each)
1. **Footer** — 7-column grid (~33 links) + redundant facility banner → brand + **4 columns** (Services · Careers · Partners · Contact). Removed the SEO-stuffed Charlotte/Pet link columns (still reachable via the Header dropdown → **no orphans**, verified), the duplicate "Sign in", and the facility banner. Legal row now `© Tassy Trucks LLC · DBA Tassy Transportation · SDVOSB Certified` + Privacy/Terms/Accessibility.
2. **Footer + Header subtitle** — `Premium Transport · Veteran-Owned` → the motto **`We Transport With Care.`** (gold, serif italic) in both.
3. **Header nav** — trimmed to **Services▾ · Pricing · Partners · About** (+ phone · Sign in · Book a Ride). "How it works" relocated into the Services dropdown (kept reachable).
4. **Hero** — motto elevated to the H1 (`We Transport / With Care.`); honest value-prop line; **1 primary (Book a Ride) + 1 calm secondary text link (Explore our services)**; phone moved out of the hero (lives in nav).
5. **Final CTA** — 3 equal buttons → **1 primary + 1 secondary** text link; copy tightened.
6. **Hero trust strip** — see the honesty note below.

## ⚠️ HONESTY / CONTENT FLAG for Phil (pre-DNS blocker — task #222)
Removed the two **unverified** numeric claims from their most prominent placements and replaced with documentable credentials:
- Hero trust strip `15,000+ Rides since 2021` + `4.9★ Google rating` → `SDVOSB · HIPAA · USDOT #3104152 · Veteran-Owned`.
- Testimonials sub-header `4.9★ on Google · 15,000+ rides` → `Veteran-owned · SDVOSB certified · Serving Charlotte & the Carolinas`.

**STILL PRESENT and NOT modified (your call — do not publish if unverifiable):** the three testimonial quotes in the Testimonials section name specific people/orgs — **"Dr. Kim, RN · Atrium Health"**, "Janelle R.", "Marcus T.", "Aesthetic Carolina" — and the Facilities section quote **"Dr. Kim, RN · Discharge Planner, Atrium Health"**, plus the "Current facility partners" pills (Atrium Health, Aesthetic Carolina, Bataclan Pets). If any of these are illustrative rather than real+permissioned, they are a liability on a public site. I did not fabricate or delete your content — verify or replace before the DNS swap.

## Verification
- `npm run build` → **green** (34 routes).
- Screenshots 375/768/1440 in `test-results/fix_prod_131_home_polish/` (home + hero).
- Orphan check: `/partners/veterinary` linked from /partners, /winnie, /charlotte/*; `/charlotte/*` stay in Header dropdown → **0 orphans**. Sitemap unchanged (no routes added/removed).

## Known gap (out of refinement scope — flagged, not built)
- **No mobile nav menu exists** in this Header (nav is `hidden lg:flex`; mobile shows only logo + Book a Ride). Adding a hamburger drawer is net-new interactive functionality, not polish. Recommend a follow-up (`FIX_PROD_133`) to add a mobile menu before heavy mobile-traffic launch.
