import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    default: 'Tassy — Premium transport. Veteran-owned.',
    template: '%s · Tassy',
  },
  description:
    'Charlotte-based premium transportation: NEMT, VIP concierge for plastic surgery & wellness, pet transport, and oncology recovery rides. SDVOSB certified.',
  metadataBase: new URL('https://www.tassytrucks.com'),
  openGraph: {
    type: 'website',
    siteName: 'Tassy',
    url: 'https://www.tassytrucks.com',
    images: ['/og-default.jpg'],
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.ico' },
};

const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Tassy Trucks',
  description:
    'Charlotte-based premium transportation: NEMT, VIP concierge, pet transport, wellness and oncology recovery rides. Service-Disabled Veteran-Owned Small Business.',
  url: 'https://www.tassytrucks.com',
  telephone: '+1-704-941-8508',
  email: 'booking@tassytrucks.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Charlotte',
    addressRegion: 'NC',
    addressCountry: 'US',
  },
  openingHours: 'Mo-Su 00:00-23:59',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Tassy Trucks transportation services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'NEMT — Non-Emergency Medical Transportation', url: 'https://www.tassytrucks.com/nemt' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'VIP Concierge Transport', url: 'https://www.tassytrucks.com/vip' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Winnie Ride — Pet Transportation', url: 'https://www.tassytrucks.com/winnie' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Renew — Wellness Transport', url: 'https://www.tassytrucks.com/renew' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy Recover — Oncology Recovery Rides', url: 'https://www.tassytrucks.com/recover' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tassy School — Alternative student transportation', url: 'https://www.tassytrucks.com/school' } },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
