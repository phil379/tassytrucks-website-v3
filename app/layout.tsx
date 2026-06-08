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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
