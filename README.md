# Tassy Trucks — Marketing Website v3

Multi-page Next.js 14 marketing site for **tassytrucks.com**.
Replaces the single-page v2 landing. Every CTA deep-links into the SaaS
at `tassytrucksops.vercel.app` with the service pre-selected.

## What's in here

```
app/
  page.tsx           Home v3 (hero + 5 verticals + SDVOSB story)
  nemt/page.tsx      Medical transport
  vip/page.tsx       VIP Concierge (plastic surgery + aesthetic)
  winnie/page.tsx    Winnie Ride (pet transport)
  renew/page.tsx     Wellness (IV therapy + med-spa)
  recover/page.tsx   Oncology (CNA/LPN driver model)
  pricing/page.tsx   All subscription + per-service tiers
  layout.tsx         Shared header + footer + fonts
  globals.css        Tailwind + brand tokens

components/
  Header.tsx         Sticky top nav (Pinned · 5 verticals · Pricing · Book)
  Footer.tsx         Charcoal footer w/ SDVOSB credentials + USDOT
  VerticalTile.tsx   Reusable service card on Home
  ServicePage.tsx    Reusable layout for every vertical page

lib/
  saas-links.ts      Single source of truth for every CTA → SaaS URL
```

## Brand tokens

| Token | Color | Use |
|---|---|---|
| `charcoal` | #1B1A17 | Body text, header, footer |
| `gold` | #E5A93B | Accent CTAs, highlights |
| `cream` | #FAF7F0 | Background |

Fonts: **Inter** (body) + **Cormorant Garamond** (display).

## Local dev

```bash
cd tassytrucks-website-v3
npm install
npm run dev
# → http://localhost:3000
```

## Deploy

Push to a GitHub repo (`phil379/tassytrucks-website-v3`) → Vercel auto-deploys.
When ready, point `www.tassytrucks.com` DNS at the new Vercel project
(takes ~5 min via Squarespace DNS panel).

## Deep-link contract with SaaS

All CTAs route through `lib/saas-links.ts`. Pattern:

```
https://tassytrucksops.vercel.app/book/{vertical}?source=web
https://tassytrucksops.vercel.app/subscribe?source=web&product={product_key}
```

Product keys MUST match `subscription_products.product_key` in Supabase
(verified live — 16 products as of 2026-06-07).

## Sprint 2 (next)

- `/about` SDVOSB founder story page
- `/facility-partners` hospital + clinic recruit
- `/careers/sales` commission-only rep recruit
- `/careers/drivers` driver recruit with vehicle eligibility cascade
- `/blog` SEO content engine
- Booking widget embedded on home
