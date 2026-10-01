import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // FIX_PROD_007 — flipped to the SaaS dark theme. `ink`/`charcoal` stay the dark
      // color (#1B1A17) because they back `bg-ink`/`bg-charcoal` dark bands + dark
      // text-on-gold; `bg`/`cream` are the dark canvas; `cream-text` is the light text
      // (text-ink/text-cream usages were swept to text-cream-text).
      colors: {
        bg:         '#0d1117',
        // ⚠ NAME COLLISION. `ink` here is NOT `var(--ink)` in globals.css.
        //     tailwind  ink      = #1B1A17  near-black, a SURFACE
        //     css       var(--ink) = #F4EFE0  cream, the primary TEXT
        // Same word, opposite colours. Anyone reasoning from the stylesheet
        // reaches for `text-ink` and gets the inverse of what they meant:
        // near-black on a #0d1117 canvas, invisible.
        //
        // Light text is `text-cream-text`, or `text-[color:var(--ink)]`.
        // This token is for `bg-ink` / `bg-charcoal` bands and text ON gold.
        //
        // The FIX_PROD_007 sweep converted the text-ink usages and missed two
        // places, both found 2026-10-01: every surcharge amount on /pricing, and
        // the MOBILE MENU BUTTON in Header.tsx -- an invisible hamburger on
        // every page of the site below 1024px.
        ink:        '#1B1A17',                  // dark surface / on-gold text (unchanged)
        'ink-soft': 'rgba(244,239,224,0.72)',
        'ink-mute': 'rgba(244,239,224,0.68)',  // AAA 7:1 — see globals.css
        gold:       '#C8932E',
        'gold-warm':'#E5A93B',
        line:       'rgba(244,239,224,0.12)',
        surface:    '#161b22',
        // Aliases — keep existing vertical pages + ServicePage.tsx working
        charcoal:   '#1B1A17',                  // dark surface / on-gold text (unchanged)
        cream:      '#0d1117',                  // canvas (bg-cream → dark)
        'cream-text': '#F4EFE0',                // light text on dark (text-cream-text)
        // Winnie Ride pet-vertical accent (ADDITION — gold stays primary)
        'winnie-sage':      '#7C9A5C',
        'winnie-sage-soft': '#A8C088',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      maxWidth: {
        container: '80rem', // matches max-w-7xl used in live deploy
      },
      letterSpacing: {
        eyebrow: '0.2em',
        tight2:  '-0.02em',
      },
      borderRadius: {
        btn:  '10px',
        card: '16px',
        tile: '18px',
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'trip-cycle': 'tripCycle 12s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        tripCycle: {
          '0%, 5%':    { opacity: '0', transform: 'translateY(12px)' },
          '10%, 28%':  { opacity: '1', transform: 'translateY(0)' },
          '33%, 100%': { opacity: '0', transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
