import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import RequestForm from '@/components/request/RequestForm';
import HowToBookVideo from '@/components/HowToBookVideo';
import { BOOKINGS_PAUSED_MESSAGE, bookingsPaused } from '@/lib/bookings-paused';
import { markTextLinkOpened } from '@/lib/text-to-book-db.server';
import { textToBookActive } from '@/lib/text-to-book';
import { rideTrackingEnabled } from '@/lib/ride-link';
import { COPY, coerceServiceLine,
  serviceWasHonoured,
} from '@/lib/trip-request';
import { STAFF_MARKER_PARAM } from '@/lib/staff-booking';
import { verifyStaffMarker } from '@/lib/staff-booking.server';

export const metadata: Metadata = {
  title: 'Request a ride in Charlotte NC',
  description:
    'Request medical, recovery, wellness, pet or student transport in Charlotte NC. A dispatcher confirms each request by phone or text and quotes pricing first.',
  alternates: { canonical: '/request' },
  openGraph: { type: 'website', url: '/request' },
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
    'Request medical, recovery, wellness, pet or student transport in Charlotte NC. A dispatcher confirms each request by phone or text and quotes pricing first.',
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
  searchParams: { service?: string; ttb?: string; [STAFF_MARKER_PARAM]?: string };
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
  //
  // The one exception is staff (Phil, 2026-11-25): the "Book a ride for a
  // caller" link on the Winnie manager's page in TassyOps carries the signed
  // staff marker (lib/staff-booking.ts), and a caller on the phone is booked
  // by staff even while the public sits on the join list — Liz runs Winnie
  // when dispatch is out, and her bookings must complete. The marker is
  // verified in full here (signature + window, server-side): a forged,
  // expired or absent marker changes nothing and the redirect stands, byte
  // for byte. A verified marker falls through to the form, which carries
  // the same marker into the booking, where the route verifies it again.
  if (serviceWasHonoured(searchParams.service) && coerceServiceLine(searchParams.service) === 'winnie') {
    if (!verifyStaffMarker(searchParams[STAFF_MARKER_PARAM])) {
      redirect('/winnie');
    }
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
              Tell us where and when. You will see your price as soon as both addresses are in, and on
              most rides you pay it when you book. A dispatcher reviews every request personally.
            </p>
          </div>

          {/* The how-to-book walk-through (Phil, 2026-11-25): collapsed by
              default above the form — a first-time rider can open it, a
              returning one is never blocked, and a closed <details> cannot
              intercept form interactions. Hidden while bookings are paused,
              when there is no form to walk through. */}
          {!bookingsPaused() && <HowToBookVideo variant="details" />}

          <div className="mt-8">
            {bookingsPaused() ? (
              // The pause switch (lib/bookings-paused.ts): the form is replaced
              // by the notice, and the API refuses the booking to match.
              <div className="card-tile p-6 sm:p-8">
                <p className="text-lg">{BOOKINGS_PAUSED_MESSAGE}</p>
              </div>
            ) : (
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
            )}
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
