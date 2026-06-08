import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // EXACT palette from live deploy (tassytrucks-landing-deploy/index.html)
      // + back-compat aliases used by ServicePage.tsx and vertical pages
      colors: {
        bg:         '#FAF7F0',
        ink:        '#1B1A17',
        'ink-soft': '#444239',
        'ink-mute': '#76736B',
        gold:       '#C8932E',
        'gold-warm':'#E5A93B',
        line:       '#E8E1D1',
        surface:    '#FFFFFF',
        // Aliases — keep existing vertical pages + ServicePage.tsx working
        charcoal:   '#1B1A17',
        cream:      '#FAF7F0',
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
