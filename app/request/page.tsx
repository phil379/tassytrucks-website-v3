import type { Metadata } from 'next';
import { Suspense } from 'react';
import RequestForm from '@/components/request/RequestForm';
import { COPY, coerceServiceLine } from '@/lib/trip-request';

export const metadata: Metadata = {
  title: 'Request a ride in Charlotte NC',
  description:
    'Request medical, recovery, wellness, pet, or student transport in Charlotte NC. A dispatcher confirms every request by phone or text and quotes pricing before the trip is confirmed.',
  alternates: { canonical: '/request' },
  openGraph: { url: '/request' },
};

/**
 * Structured data for the conversion page.
 *
 * Service-area only, by instruction: no street address and no geo coordinates.
 * The only addresses available are residential, so the business is described by
 * where it operates, not where it sits.
 */
const requestPageLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.tassytrucks.com/request#webpage',
  url: 'https://www.tassytrucks.com/request',
  name: 'Request a ride in Charlotte NC',
  description:
    'Request medical, recovery, wellness, pet, or student transport in Charlotte NC. A dispatcher confirms every request by phone or text and quotes pricing before the trip is confirmed.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://www.tassytrucks.com/#business' },
  about: { '@id': 'https://www.tassytrucks.com/#business' },
  potentialAction: {
    '@type': 'CommunicateAction',
    name: 'Request a ride',
    target: 'https://www.tassytrucks.com/request',
  },
  provider: {
    '@type': 'LocalBusiness',
    '@id': 'https://www.tassytrucks.com/#business',
    name: 'Tassy Transportation',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'reservations',
      telephone: '+1-704-941-8508',
      email: 'book@tassytrucks.com',
      availableLanguage: ['English'],
      areaServed: [
        { '@type': 'City', name: 'Charlotte', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
        { '@type': 'AdministrativeArea', name: 'Mecklenburg County', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
      ],
    },
  },
};

/**
 * `force-dynamic` is load-bearing here, not a performance oversight.
 *
 * The Google Maps key is read at request time and handed to the client
 * component as a prop. If this page were statically generated the key would be
 * baked into the build output, and rotating it would mean a redeploy. Dynamic
 * rendering means a rotated key is live on the very next request.
 */
export const dynamic = 'force-dynamic';

export default function RequestPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  const initialService = coerceServiceLine(searchParams.service);

  // Necessarily public — Google's JS API runs in the browser. What protects it
  // is the HTTP-referrer restriction on the key in Google Cloud Console, which
  // must list every domain this site is served from. Undefined is fine: the
  // address fields fall back to plain text inputs.
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return (
    <div className="bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(requestPageLd) }}
      />
      <section className="container-x py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <p className="eyebrow">Tassy Transportation</p>
          <h1 className="h-display serif mt-2">{COPY.headline}</h1>
          <p className="ink-soft mt-4 text-lg">
            Tell us where and when. A dispatcher reviews every request personally and comes back to you
            with a price before anything is confirmed.
          </p>

          <div className="card-tile mt-8 p-6 sm:p-8">
            <Suspense fallback={<p className="ink-mute">Loading the form…</p>}>
              <RequestForm initialService={initialService} googleMapsApiKey={googleMapsApiKey} />
            </Suspense>
          </div>

          <p className="ink-soft text-sm mt-6 text-center">
            Prefer to talk to someone?{' '}
            <a className="underline tap-target" href="tel:+17049418508">
              (704) 941-8508
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
