# FIX_PROD_023 — accent inventory (yellow `#E5A93B` → gold `#C8932E`)

Tokens already exist (FIX_PROD_007): `--gold: #C8932E` (solid) + `--gold-warm: #E5A93B`.
The "yellow" perception is because PRIMARY surfaces reference gold-warm. This run promotes
primary → gold solid, keeps gold-warm for hover/secondary.

## PRIMARY → swap to gold solid `#C8932E`  (globals.css classes + inline)
| Location | Surface | Change |
|---|---|---|
| `globals.css` `.btn-gold` | every primary CTA (Book a Ride / Get started / Choose your plan) | bg `var(--gold-warm)` → `var(--gold)`; hover `#D49A2E` → `var(--gold-warm)` |
| `globals.css` `.number-bullet` | 7-safety-standards bullets | bg → `var(--gold)` |
| `globals.css` `.tier-card.is-popular` | popular plan card fill | bg + border → `var(--gold)` |
| `globals.css` `.quote-mark` | testimonial quote glyph | color → `var(--gold)` |
| `.gold-warm-text` usages (4) → `.gold-text` | headline accents ("Committed."), eyebrows | school hero + page eyebrow |
| `app/page.tsx` 152/183/242 | check icon, logo accent, border accent | → `var(--gold)` / `text-gold` |
| `app/school/page.tsx` 118/132 | non-popular plan card check + "Get started" button | → `var(--gold)` |
| `components/{Header,Footer}.tsx` | logo "T" wordmark accent | → `var(--gold)` |
| `app/og-image/[slug]/route.tsx` | OG image accent (non-Winnie) | `#E5A93B` → `#C8932E` |

## HOVER / SECONDARY → keep gold-warm `#E5A93B`  (35 usages, untouched)
- All `hover:text-[color:var(--gold-warm)]` (Header/Footer nav + service links)
- `.btn-gold:hover` (now resolves to gold-warm — the lighter "interactive feedback" shade)
- The `--gold-warm` token itself, and the `.gold-warm-text` class definition (left in place)

## Untouched brand tokens (locked per CLAUDE.md)
charcoal `#1B1A17` · cream `#FAF7F0` / cream-text `#F4EFE0` · line · sage `#7C9A5C` (Winnie) ·
medical-blue `#3B6EAA`. "Tassy Trucks LLC" legal unchanged.
