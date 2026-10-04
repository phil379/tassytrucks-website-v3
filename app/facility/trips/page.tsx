import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityTrips, facilityUnreadCount, type TripBucket } from '@/lib/facility-console.server';
import { canBook, passengerNoun } from '@/lib/facility';
import ConsoleShell from '@/components/facility/ConsoleShell';
import { TripRow, Empty } from '@/components/facility/bits';

export const metadata: Metadata = {
  title: 'Active trips — Tassy Transportation',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const BUCKETS: { key: TripBucket; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'recent', label: 'Recent' },
];

export default async function FacilityTripsPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');
  const facility = session.facility;
  if (facility.status === 'pending' && !canBook(facility)) redirect('/facility/welcome');

  const view = (BUCKETS.find((b) => b.key === searchParams?.view)?.key ?? 'today') as TripBucket;
  const [trips, unread] = await Promise.all([
    facilityTrips(facility.id, view),
    facilityUnreadCount(facility.id),
  ]);
  const noun = passengerNoun(facility.kind);

  return (
    <ConsoleShell facilityName={facility.name} signedInAs={session.email} active="trips" counts={{ messages: unread }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="serif text-2xl font-semibold">Active trips</h2>
          <p className="ink-soft mt-1 text-sm">
            Every trip on your account and where it has got to.
          </p>
        </div>
        <Link href="/facility/request" className="btn-gold inline-flex min-h-[44px] items-center gap-2 text-sm">
          Request a ride <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <Link
            key={b.key}
            href={`/facility/trips?view=${b.key}`}
            aria-current={b.key === view ? 'true' : undefined}
            className={`inline-flex min-h-[40px] items-center rounded-lg border px-4 text-sm transition ${
              b.key === view
                ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/15 font-medium'
                : 'border-[color:var(--line)] ink-soft'
            }`}
          >
            {b.label}
          </Link>
        ))}
      </div>

      {/* The walkthrough promised live driver positions and "3 min from
          pickup". There is no GPS feed and trip_events is empty, so this says
          what is actually known instead -- see STATUS_COPY in bits.tsx. */}
      <div className="mt-6">
        {trips.length === 0 ? (
          <Empty
            title={view === 'today' ? 'Nothing booked today' : view === 'upcoming' ? 'Nothing booked ahead' : 'No past trips yet'}
            body={
              view === 'recent'
                ? 'Completed trips appear here with what each one cost.'
                : 'Request a ride and it shows up here as soon as we have it, with its status as dispatch moves it along.'
            }
            cta={
              view !== 'recent' ? (
                <Link href="/facility/request" className="btn-gold inline-flex min-h-[44px] items-center gap-2 text-sm">
                  Request a ride <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : null
            }
          />
        ) : (
          <ul className="rounded-xl border border-[color:var(--line)] px-5">
            {trips.map((t) => <TripRow key={t.id} trip={t} noun={noun} />)}
          </ul>
        )}
      </div>

      <p className="ink-mute mt-5 text-xs">
        Something needs changing?{' '}
        <Link className="underline" href="/facility/messages">Message dispatch</Link>{' '}
        or call <a className="underline" href="tel:+17049418508">(704) 941-8508</a>.
      </p>
    </ConsoleShell>
  );
}
