import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import RequestForm from '@/components/request/RequestForm';
import { markTextLinkOpened } from '@/lib/text-to-book-db.server';
import { textToBookActive } from '@/lib/text-to-book';
import { rideTrackingEnabled } from '@/lib/ride-link';
import { COPY, coerceServiceLine,
  serviceWasHonoured,
} from '@/lib/trip-request';

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

export default async function RequestPage({
  searchParams,
}: {
  searchParams: { service?: string; ttb?: string };
}) {
  // A link from a text-to-book reply: note that it was opened, ONLY while TEXT_TO_BOOK_MODE is on.
  // With the mode off this page behaves exactly as before: no database write, no time prefill.
  const textLinks = textToBookActive();
  if (textLinks) await markTextLinkOpened(searchParams.ttb);

  // Tassy Scholar is not enrolling while the service is prepared for its
  // later launch (Phil, 2026-11-17): a deliberate ?service=scholar — typed,
  // bookmarked or followed from an old link — lands on the Coming Soon page
  // and its join list rather than opening a booking form for a service that
  // has not launched. (The ?plan= variant never reaches here: next.config
  // redirects it first.) Every other line renders exactly as before.
  if (serviceWasHonoured(searchParams.service) && coerceServiceLine(searchParams.service) === 'scholar') {
    redirect('/school');
  }

  // Winnie Ride is not taking bookings until a real Winnie driver exists
  // (Phil, 2026-11-18 — the phased launch): a deliberate ?service=winnie
  // lands on the Winnie page and its join list, exactly as Scholar does
  // above, rather than opening a booking form for a service that has not
  // opened. The legacy ?service=pet alias resolves to winnie in
  // coerceServiceLine and follows it here.
  if (serviceWasHonoured(searchParams.service) && coerceServiceLine(searchParams.service) === 'winnie') {
    redirect('/winnie');
  }

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
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <p className="eyebrow">Tassy Transportation</p>
            <h1 className="h-display serif mt-2">{COPY.headline}</h1>
            <p className="ink-soft mt-4 text-lg">
              Tell us where and when. You will see an estimate as soon as both addresses are in, and a
              dispatcher reviews every request personally and confirms the final price before anything is booked.
            </p>
          </div>

          <div className="mt-8">
            <Suspense fallback={<p className="ink-mute">Loading the form…</p>}>
              <RequestForm
                initialService={initialService}
                textLinkPrefill={textLinks}
                /*
                  Whether the visitor ARRIVED with a choice, not merely which
                  line is selected. coerceServiceLine always returns something,
                  so the value alone cannot tell a deliberate ?service=scholar
                  from a default — and the difference decides whether the form
                  opens a picker or states the decision.
                */
                servicePreselected={serviceWasHonoured(searchParams.service)}
                googleMapsApiKey={googleMapsApiKey}
                rideTrackingEnabled={rideTrackingEnabled()}
                withServicePanel
              />
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
