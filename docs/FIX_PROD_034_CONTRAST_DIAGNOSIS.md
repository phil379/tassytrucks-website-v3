# FIX_PROD_034 — pricing contrast diagnosis + fix

## Root cause (different from the prompt's assumption)
The prompt assumed washed-out cards on a charcoal canvas. The real cause is a **token
remap left over from FIX_PROD_007** (which flipped the marketing site to the SaaS dark
theme but kept the legacy light-theme token *names*):

- `tailwind.config.ts`: `cream: '#0d1117'` (so **`bg-cream` is the DARK canvas**, not cream),
  `cream-text: '#F4EFE0'` (light text), `charcoal/ink: '#1B1A17'`.
- `app/globals.css`: `--ink: #F4EFE0` → the **default body text is light**.

`app/pricing/page.tsx` renders 5 sections, alternating `bg-cream` (even = dark canvas)
and `bg-charcoal text-cream-text` (odd). The three sections Phil flagged — VIP (idx 0),
B2B (idx 2), Guardian (idx 4) — are the **even/dark** ones. Their sibling cards used
`bg-white border-charcoal/8` with **no explicit text color**, so the title/price/features
inherited the light default (`#F4EFE0`) → **light text on a white card = near-invisible.**
The "popular" card set `bg-gold text-charcoal` explicitly, so it stayed readable. The
odd-section siblings (Winnie/Wellness) use `text-cream-text` on a transparent card → light
text on dark = readable, which is why Phil didn't flag them.

## Fix (Option A — cream sibling, dark text)
One shared-component change to the non-highlight, non-dark sibling branch in
`app/pricing/page.tsx`:
- card: `bg-white border-charcoal/8` → `bg-[#F4EFE0] text-[#1B1A17] border-gold/40`
  (real cream surface + explicit dark base text + gold border)
- blurb + feature text: `text-ink-muted` (light) → `text-[#444239]` (dark muted)
- price: `text-gold` for non-highlight (gold focal point on cream)
- CTA (`bg-charcoal text-cream-text`) and check icon (`text-gold`) already read fine on cream — unchanged.

Fixes all 6 cards (Companion/Recovery, B2B Starter/Premium, Guardian Essential/Elite) in
one edit. Popular cards untouched. Odd-section (Winnie/Wellness) siblings untouched (not
flagged, and readable).

## LPN → CNA sweep (the deferred FIX_PROD_028 work)
12 mentions replaced across `app/page.tsx` (2), `app/recover/page.tsx` (7),
`app/pricing/page.tsx` (3): "CNA / LPN" → "CNA-trained", "LPN driver option" → "CNA driver
option", "Dedicated LPN driver" → "Dedicated CNA driver", etc. `grep LPN` → 0.

## Verification
`next build` green. Screenshots @ 375/768/1440 in docs/FIX_PROD_034_SCREENSHOTS/:
VIP, B2B, Guardian siblings all readable; popular cards still gold-dominant; /recover shows
"CNA-trained". Brand intact (charcoal canvas, gold accents, serif titles).
