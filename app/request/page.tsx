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

export default function RequestPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  const initialService = coerceServiceLine(searchParams.service);

  return (
    <div className="bg-cream">
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
              <RequestForm initialService={initialService} />
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
