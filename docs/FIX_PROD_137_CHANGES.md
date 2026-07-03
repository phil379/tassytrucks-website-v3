# FIX_PROD_137 · Header logo — enlarge + founder-tile frame

**Report:** logo "can't be seen." **Cause:** it rendered at 44px (`h-11 w-11`),
unframed, as an emblem-on-black raster on the dark header → low contrast, mark too
small to read. **Fix:** enlarge + apply the SAME container treatment as the founder
photo so the two brand marks rhyme.

## Phase 0
- Logo component: `components/Header.tsx` (inline `<img src="/brand/logo-cream.svg">`)
- Logo asset: `public/brand/logo-cream.svg` (1024×1024, square — so aspect wasn't the issue; size + contrast were)
- Founder photo: `app/page.tsx` #founder — `public/tassy-founder.png`
- **Founder container spec (target):** `aspect-square · rounded-tile (18px) · border border-line (1px, var(--line) faint cream) · overflow-hidden · object-cover object-top`

## Changes (components/Header.tsx)
1. **Enlarged** 44px → **44 (mobile) / 56 (md) / 64 (lg)** — `h-11 w-11 md:h-14 md:w-14 lg:h-16 lg:w-16`. Nav stays one line (nav is hidden lg:flex on mobile; desktop has room). No wrap.
2. **Framed** the logo in a `<span>` with the EXACT founder treatment: `rounded-tile border border-line overflow-hidden`, img `object-cover`. The header logo and founder portrait are now matching rounded-tile bordered squares (visual rhyme, verified in founder_compare_1440.png).
3. **Motto** bumped `text-[11px] → lg:text-[13px]` to balance the larger mark; placement unchanged (right of logo, per FIX_PROD_131).
4. **Hover** `hover:-translate-y-px hover:shadow-[...]` 200ms (per D.5).
5. **A11y/CLS:** `aria-label="Tassy Transportation home"` on the link; richer `alt`; explicit `width/height={64}` (no layout shift).

## Verify
- `npm run build` green. Screenshots 375/768/1440 + founder comparison in `test-results/fix_prod_137_logo/`.
- Brand tokens/fonts/motto placement/service names all UNCHANGED (FIX_PROD_131/132 preserved).
