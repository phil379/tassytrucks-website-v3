import type { Metadata, Viewport } from 'next';
import './fonts.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConsentManager from '@/components/ConsentManager';

// Fonts are self-hosted from public/fonts via app/fonts.css (same files, weights and subsets that
// next/font/google used to download on every build). app/fonts.css defines the CSS variables
// consumed by globals.css (.serif -> --font-newsreader, body -> --font-inter) on :root.
// The Latin files are preloaded below, exactly as next/font did.
const PRELOAD_FONTS = [
  '/fonts/4b9bb515ce6d026f.p.woff2', // Newsreader italic, latin
  '/fonts/5611c55482296524.p.woff2', // Newsreader normal, latin
  '/fonts/e4af272ccee01ff0-s.p.woff2', // Inter, latin
];

export const metadata: Metadata = {
  title: {
    // Agent D — keyword-front-loaded (location + services) for the homepage.
    default: 'Charlotte Medical, Pet & Recovery Transport | Tassy',
    template: '%s · Tassy',
  },
  description:
    'Charlotte-based premium transportation: Tassy Care, VIP concierge for plastic surgery & wellness, pet transport, and oncology recovery rides. SDVOSB certified.',
  metadataBase: new URL('https://www.tassytrucks.com'),
  openGraph: {
    type: 'website',
    siteName: 'Tassy',
    // Agent D — the site-wide `url` was making every sub-page OG resolve to the
    // homepage. Removed; each page sets its own openGraph.url.
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630 }], // FIX_PROD_038 — real Tassy og-image
  },
  twitter: { card: 'summary_large_image', images: ['/brand/og-image.png'] },
  // FIX_PROD_038 — real Tassy favicons (public/brand/).
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/logo-mark.svg', type: 'image/svg+xml' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
};

// Agent C — mobile browser chrome matches the charcoal canvas.
export const viewport: Viewport = {
  themeColor: '#1B1A17',
};

const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  // Stable identity so every per-page Service block can point at one business
  // record instead of re-declaring an anonymous provider.
  '@id': 'https://www.tassytrucks.com/#business',
  name: 'Tassy Transportation',
  description:
    'Charlotte-based premium transportation: Tassy Care, VIP concierge, pet transport, wellness and oncology recovery rides. Service-Disabled Veteran-Owned Small Business.',
  url: 'https://www.tassytrucks.com',
  telephone: '+1-704-941-8508',
  email: 'book@tassytrucks.com',
  // MEGA_TASSY_PUBLISH_READY — certification + motto
  // TODO(FMCSA): Phil's USDOT 3808299 / MC-1373369 are Inactive at FMCSA, so no USDOT/MC number is published on any public page. Add them back (footer, JSON-LD, trust chips) only once FMCSA shows Active. The USDOT/MC numbers that used to be here belonged to another company (Tassy Logistics LLC) and must never return; scripts/test-banned-claims.ts enforces that.
  slogan: 'We Transport With Care',
  hasCredential: 'SDVOSB — Service-Disabled Veteran-Owned Small Business',
  priceRange: '$$',
  image: 'https://www.tassytrucks.com/brand/og-image.png',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Charlotte',
    addressRegion: 'NC',
    addressCountry: 'US',
  },
  // The market, stated machine-readably. Previously the geography existed only
  // in prose and in the 16 SEO landing pages — the root business record, which
  // is what an assistant reads first, did not say where the company operates.
  areaServed: [
    { '@type': 'City', name: 'Charlotte', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
    { '@type': 'AdministrativeArea', name: 'Mecklenburg County', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Tassy Transportation transportation services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Care — Non-Emergency Medical Transportation', url: 'https://www.tassytrucks.com/nemt' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'VIP Concierge Transport', url: 'https://www.tassytrucks.com/vip' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Winnie Ride — Pet Transportation', url: 'https://www.tassytrucks.com/winnie' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Wellness — Wellness Transport', url: 'https://www.tassytrucks.com/renew' } },
      // Tassy Guardian is intentionally absent: the line is not accepting
      // requests (no CNA-trained drivers), and this catalog is what an assistant
      // reads as 'what they currently offer'. /recover stays published and keeps
      // its own Service description.
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Scholar — Alternative student transportation', url: 'https://www.tassytrucks.com/school' } },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {PRELOAD_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
      </head>
      <body>
        {/* Agent E (WCAG 2.4.1) — keyboard/AT users can jump past the nav. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        {/* Vercel Web Analytics is NOT a tag here any more: components/ConsentManager.tsx injects
            /_vercel/insights/script.js only after the visitor presses Accept. Do not add it back
            as a static <script> (scripts/test-consent.ts fails if it returns). */}
        <ConsentManager />
      </body>
    </html>
  );
}
