import type { Metadata, Viewport } from 'next';
import { Newsreader, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN (Agent C) — was a render-blocking
// <link> to fonts.googleapis.com. next/font self-hosts (zero CLS, no
// third-party request, no preconnect) and exposes CSS variables consumed by
// globals.css (.serif → --font-newsreader · body → --font-inter).
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-newsreader',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

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
  name: 'Tassy Transportation',
  description:
    'Charlotte-based premium transportation: Tassy Care, VIP concierge, pet transport, wellness and oncology recovery rides. Service-Disabled Veteran-Owned Small Business.',
  url: 'https://www.tassytrucks.com',
  telephone: '+1-704-941-8508',
  email: 'book@tassytrucks.com',
  // MEGA_TASSY_PUBLISH_READY — operating authority + certification + motto
  slogan: 'We Transport With Care',
  identifier: [
    { '@type': 'PropertyValue', propertyID: 'USDOT', value: '3104152' },
    { '@type': 'PropertyValue', propertyID: 'MC', value: '79222' },
  ],
  hasCredential: 'SDVOSB — Service-Disabled Veteran-Owned Small Business',
  image: 'https://www.tassytrucks.com/brand/og-image.png',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Charlotte',
    addressRegion: 'NC',
    addressCountry: 'US',
  },
  openingHours: 'Mo-Su 00:00-23:59',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Tassy Transportation transportation services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Care — Non-Emergency Medical Transportation', url: 'https://www.tassytrucks.com/nemt' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'VIP Concierge Transport', url: 'https://www.tassytrucks.com/vip' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Winnie Ride — Pet Transportation', url: 'https://www.tassytrucks.com/winnie' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Wellness — Wellness Transport', url: 'https://www.tassytrucks.com/renew' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Guardian — Oncology Recovery Rides', url: 'https://www.tassytrucks.com/recover' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Scholar — Alternative student transportation', url: 'https://www.tassytrucks.com/school' } },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <head>
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
      </body>
    </html>
  );
}
