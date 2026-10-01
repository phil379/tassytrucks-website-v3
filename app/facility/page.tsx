import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityDashboard, tripCents, type FacilityTrip } from '@/lib/facility-dashboard.server';
import { canBook, passengerNoun } from '@/lib/facility';
import { serviceLabel } from '@/lib/trip-request';

export const metadata: Metadata = {
  title: 'Your account — Tassy Transportation',
  // Behind a magic link and specific to one facility. Never indexed.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function whenLabel(iso: string): string {
  // Charlotte, always. The server runs in UTC and a 6:45am dialysis pickup
  // rendered in UTC reads as 10:45 — the single most alarming thing a
  // coordinator could see on this page.
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  });
}

function TripRow({ trip, noun }: { trip: FacilityTrip; noun: string }) {
  const cents = tripCents(trip);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--line)] py-3 last:border-b-0">
      <div className="min-w-0">
        <span className="font-medium">{whenLabel(trip.requested_at)}</span>
        <span className="ink-soft"> · {trip.contact_name}</span>
        {trip.facility_ref ? <span className="ink-mute text-xs"> · {trip.facility_ref}</span> : null}
        <div className="ink-soft truncate text-xs">
          {trip.pickup_address} → {trip.dropoff_address}
        </div>
      </div>
      <div className="whitespace-nowrap text-sm">
        <span className="ink-soft">{serviceLabel(trip.service_line)}</span>
        {trip.payer === 'passenger' ? (
          // Said plainly, because the difference decides who gets chased for
          // money. The spec is explicit: the facility never sees the patient's
          // card and the patient never sees the facility's rate.
          <span className="ink-mute"> · {noun} pays</span>
        ) : cents === null ? (
          <span className="ink-mute"> · price to come</span>
        ) : (
          <span className="ink-soft"> · {money(cents)}</span>
        )}
      </div>
    </li>
  );
}

export default async function FacilityHome() {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');

  const facility = session.facility;

  // A facility that has signed up but not finished the wizard has no address,
  // no billing contact and no approved billing mode. Send them to finish rather
  // than showing an empty dashboard that looks broken.
  if (facility.status === 'pending' && !canBook(facility)) {
    redirect('/facility/welcome');
  }

  const { upcoming, invoices, stats } = await facilityDashboard(
    facility.id,
    Number(facility.discount_pct ?? 0),
  );
  const noun = passengerNoun(facility.kind);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">
        Tassy Transportation
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="serif text-3xl font-semibold sm:text-4xl">{facility.name}</h1>
        {/* Points at the PUBLIC request form, not a facility-aware one, because
            a facility-aware one does not exist yet. Phase 2 of the spec gives
            /facility/request the quote engine plus facility context so the trip
            carries facility_id and payer automatically. Until that ships, a
            coordinator books here and ops attaches the account -- which is
            honest, and better than a dashboard button that 404s. */}
        <Link
          href={`/request?facility=${encodeURIComponent(facility.name)}`}
          className="btn-primary inline-flex min-h-[44px] items-center gap-2"
        >
          Request a ride <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {facility.status === 'pending' ? (
        <p className="mt-5 rounded-lg border border-[color:var(--line)] bg-[color:var(--gold)]/10 px-4 py-3 text-sm">
          Your account is with us for approval. You can look around — booking opens as soon as it is active,
          usually the same working day.
        </p>
      ) : null}

      {/* ── the three numbers a coordinator actually opens this page for ── */}
      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
          <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Rides this month</dt>
          <dd className="serif mt-1 text-2xl font-semibold">{stats.tripsThisMonth}</dd>
          {stats.onAccountThisMonth !== stats.tripsThisMonth ? (
            <p className="ink-mute mt-1 text-xs">{stats.onAccountThisMonth} on your account</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
          <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Charges so far</dt>
          <dd className="serif mt-1 text-2xl font-semibold">{money(stats.chargeableCents)}</dd>
          {stats.savedCents > 0 ? (
            <p className="ink-mute mt-1 text-xs">
              after your {facility.discount_pct}% account rate — {money(stats.savedCents)} saved
            </p>
          ) : null}
          {stats.unpriced > 0 ? (
            // Never let an unpriced ride read as a free one.
            <p className="ink-mute mt-1 text-xs">
              {stats.unpriced} ride{stats.unpriced === 1 ? '' : 's'} not yet priced
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
          <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Outstanding</dt>
          <dd className="serif mt-1 text-2xl font-semibold">{money(stats.outstandingCents)}</dd>
          <p className="ink-mute mt-1 text-xs">
            {stats.outstandingCents === 0
              ? 'Nothing owing'
              : stats.nextDueAt
                ? `Next due ${dayLabel(stats.nextDueAt)}`
                : 'Invoice in preparation'}
          </p>
        </div>
      </dl>

      {/* ── next seven days ── */}
      <section className="mt-10">
        <h2 className="serif text-xl font-semibold">The next seven days</h2>
        {upcoming.length === 0 ? (
          <p className="ink-soft mt-3 text-sm">
            Nothing booked yet.{' '}
            <Link href={`/request?facility=${encodeURIComponent(facility.name)}`} className="underline">
              Request a ride
            </Link>{' '}
            and it will appear here once we have attached it to your account.
          </p>
        ) : (
          <ul className="mt-3">
            {upcoming.map((t) => (
              <TripRow key={t.id} trip={t} noun={noun} />
            ))}
          </ul>
        )}
      </section>

      {/* ── invoices ── */}
      <section className="mt-10">
        <h2 className="serif text-xl font-semibold">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="ink-soft mt-3 text-sm">
            {facility.billing_mode === 'invoice_weekly'
              ? 'Your first invoice is sent the Monday after your first completed ride.'
              : 'Rides on this account are paid by card at the time of booking, so there are no invoices.'}
          </p>
        ) : (
          <ul className="mt-3">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--line)] py-3 last:border-b-0"
              >
                <div>
                  <span className="font-medium">
                    {dayLabel(inv.period_start)} – {dayLabel(inv.period_end)}
                  </span>
                  <span className="ink-soft"> · {inv.trip_count ?? 0} rides</span>
                </div>
                <div className="whitespace-nowrap text-sm">
                  <span className="font-medium">{money(inv.total_cents ?? 0)}</span>
                  {inv.paid_at ? (
                    <span className="ink-mute"> · paid {dayLabel(inv.paid_at)}</span>
                  ) : inv.payment_link_url ? (
                    <a href={inv.payment_link_url} className="ml-2 underline">
                      Pay now
                    </a>
                  ) : inv.due_at ? (
                    <span className="ink-soft"> · due {dayLabel(inv.due_at)}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="ink-mute mt-12 text-xs">
        Questions about a ride or a bill? Call{' '}
        <a href="tel:+17049418508" className="underline">
          (704) 941-8508
        </a>
        . Please do not send medical details by email or in a booking note.
      </p>
    </div>
  );
}
