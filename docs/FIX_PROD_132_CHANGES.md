# FIX_PROD_132 · Service-line icon system — change log

**Repo:** tassytrucks-website-v3 · **Date:** 2026-07-02 · **Scope:** icons only (no route/name/slug/brand-token/font changes)

## Reality vs. prompt (checked before editing)
- The letter-chip monogram existed in **exactly one place**: the home Services grid (`app/page.tsx`, a `bg-ink` rounded square with `v.monogram ?? v.name.charAt(0)`). There is **no shared `ServiceCard` component**.
- **Individual service pages** (`/nemt`…`/school`) render through `components/ServicePage.tsx`, whose hero is **text-only (eyebrow + title)** — no monogram/icon chip to replace. So "6 service-page heros" was a non-issue (0/6 needed changes).
- **`VerticalTile.tsx`** has no monogram either. **Footer/Header** carried no letter chips.
- `app/og-image/[slug]/route.tsx` uses `charAt` only to format slugs into OG-image text — NOT a service icon; left untouched.

## Changes
1. **Home Services grid** (`app/page.tsx`) — replaced the letter chip with the mapped Lucide icon per the locked table:
   - Tassy Care → `HeartPulse` · VIP Concierge → `Sparkles` · Winnie Ride → `PawPrint` · Tassy Wellness → `Droplets` · Tassy Guardian → `Shield` · Tassy Scholar → `GraduationCap`
   - Icon spec: 32px, `strokeWidth={1.75}`, gold-solid `var(--gold)` stroke, no fill, `aria-hidden`.
   - Container treatment per spec: **bare icon → 24px gap → 24px hairline gold underline (1px) → eyebrow → headline** (no more heavy tinted square).
   - `Vertical` type: `monogram?: string` → `Icon: LucideIcon` + `anim: string`.
2. **Micro-interactions** (`app/globals.css`) — per-service one-shot hover animation (heartbeat / sparkle-rotate / paw-step / drip / shield-flex / cap-tip), plus the underline widens 24→40px on hover. All `prefers-reduced-motion: reduce` guarded (motion off, underline static).

## Deliberately NOT done (with reason)
- **Header Services dropdown icons** — SKIPPED. The dropdown is a set of heterogeneous **SEO landing links** grouped by medical/pet/schools (e.g. "Dialysis transport", "Grooming pickup"), **not** a clean 6-service-line list, so a per-line icon doesn't map. Adding icons to those links would look arbitrary. (If Phil wants icons there, the dropdown would first need restructuring into the 6 lines — a FIX_PROD_131-scope decision, not this ticket.)

## Verification
- Grep: **0** letter-chip monograms remain (`monogram` / `charAt(0)`) outside the og-image slug formatter.
- `npm run build` → green ("Compiled successfully").
- Screenshots 375/768/1440 in `test-results/fix_prod_132_service_icons/` — all 6 icons render, gold stroke uniform, hairline accent present, layout intact at every breakpoint.
