import type { Metadata } from 'next';
import { Suspense } from 'react';
import RequestForm from '@/components/request/RequestForm';
import { hotelBySlug, hotelQuote } from '@/lib/hotel-price';
import { hotelQuoteServer } from '@/lib/hotel-price.server';
import { CLT_TERMINAL } from '@/lib/hotel-zones';
import { formatUsd } from '@/lib/quote';

/**
 * /airport?hotel=<slug> — the landing page for a hotel's guests.
 *
 * Not indexed: it exists for a link or a card a concierge hands out, not for search. NO PRICE IS
 * PRINTED ANYWHERE ELSE (cards, PDFs), so the number can change without reprinting; this page
 * asks the quote engine for it on every load and never types a dollar amount.
 *
 * `?hotel=` only names the hotel and pre-fills its address. The price is decided on the server
 * from the two addresses when the guest books (app/api/trip-request), so adding `?hotel=` to any
 * link changes nothing about what a ride costs.
 */
export const metadata: Metadata = {
  title: 'Airport ride from your hotel',
  description: 'A reserved luxurious SUV between your Charlotte hotel and the airport.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/airport' },
};

// The introductory price depends on the date and on rides already booked, and the Maps key is
// read at request time (same reason as /request).
export const dynamic = 'force-dynamic';

export default async function AirportPage({
  searchParams,
}: {
  searchParams: { hotel?: string; dir?: string };
}) {
  const hotel = hotelBySlug(searchParams.hotel);
  const fromAirport = searchParams.dir === 'from';
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const hotelPlace = hotel
    ? { address: hotel.address, placeId: hotel.placeId, lat: hotel.lat, lng: hotel.lng }
    : null;
  const airportPlace = {
    address: `${CLT_TERMINAL.label}, ${CLT_TERMINAL.address}`,
    placeId: CLT_TERMINAL.placeId,
    lat: CLT_TERMINAL.lat,
    lng: CLT_TERMINAL.lng,
  };
  const pickup = fromAirport ? airportPlace : hotelPlace;
  const dropoff = fromAirport ? hotelPlace : airportPlace;

  // The confirmed price, from the engine. One way; the form shows the round trip when ticked.
  const quote =
    hotel && pickup && dropoff
      ? await hotelQuoteServer({ serviceLine: 'concierge', pickup, dropoff })
      : null;
  // Same rules without the database, if it could not be reached.
  const shown = quote ?? (hotel && pickup && dropoff ? hotelQuote({ serviceLine: 'concierge', pickup, dropoff, introRidesUsed: 0 }) : null);

  return (
    <div className="bg-cream">
      <section className="container-x py-10 sm:py-14">
        <div className="max-w-2xl mx-auto">
          <p className="eyebrow">Tassy Concierge</p>
          <h1 className="h-display serif mt-2">
            {hotel
              ? fromAirport
                ? `Airport to ${hotel.label}`
                : `${hotel.label} to the airport`
              : 'Airport rides in Charlotte'}
          </h1>
          <p className="ink-soft mt-4 text-lg">
            A reserved luxurious SUV and a professional driver, booked for the time you choose.
          </p>

          {hotel && shown && (
            <div className="card-tile mt-6 p-5" data-testid="hotel-flat-price">
              <p className="ink-soft text-sm">
                {fromAirport ? 'Airport to your hotel' : 'Your hotel to the airport'}, one way
              </p>
              <p className="serif text-4xl mt-1">{formatUsd(shown.oneWayChargedCents)}</p>
              <p className="ink-soft text-sm mt-1">
                Flat price, any hour. Weekends, holidays and early mornings cost the same.
              </p>
            </div>
          )}

          <div className="card-tile mt-6 p-6 sm:p-8">
            <Suspense fallback={<p className="ink-mute">Loading the form…</p>}>
              <RequestForm
                initialService="concierge"
                servicePreselected
                googleMapsApiKey={googleMapsApiKey}
                hotelPrefill={pickup && dropoff ? { pickup, dropoff } : undefined}
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
