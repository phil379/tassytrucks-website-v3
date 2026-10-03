import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import RequestForm from '@/components/request/RequestForm';
import { currentFacilitySession } from '@/lib/facility-auth';
import {
  canBook,
  defaultServiceLineForKind,
  passengerNoun,
  payerFromBillingMode,
} from '@/lib/facility';
import { coerceServiceLine, serviceWasHonoured } from '@/lib/trip-request';
import { facilityUnreadCount } from '@/lib/facility-console.server';
import ConsoleShell from '@/components/facility/ConsoleShell';
import { patientForFacility } from './_patient';

/**
 * Facility Phase 2 — the screen a coordinator books from.
 *
 * Until this shipped, the dashboard's "Request a ride" button pointed at the
 * PUBLIC /request with the facility's name stuffed into a query param, and ops
 * attached the account by hand afterwards. That was honest but it meant the
 * trip reached the board with facility_id null, so it never counted toward the
 * facility's month, never joined an invoice, and the dashboard this page sits
 * behind showed a coordinator a smaller number than they had actually booked.
 *
 * Same form as the public one. One component, one write path, one estimate
 * engine — deliberately, because a second booking form is a second place for
 * the quote rules and the bot checks to drift. All this page does is resolve
 * the session server-side and hand RequestForm the three facts it needs to ask
 * the two extra questions.
 *
 * THE ID IS NOT PASSED DOWN. RequestForm receives the facility's NAME, its
 * passenger noun and its default payer — nothing that identifies the account to
 * the server. /api/trip-request reads facility_id from the session cookie
 * itself, so no value this page renders can change which account is billed.
 */

export const metadata: Metadata = {
  title: 'Request a ride — Tassy Transportation',
  // Behind a magic link and specific to one facility. Never indexed.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function FacilityRequestPage({
  searchParams,
}: {
  searchParams?: { service?: string; patient?: string };
}) {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');

  const facility = session.facility;

  // Not finished signing up: no address, no billing contact, no approved
  // billing mode. Finish that first — the form would otherwise collect a real
  // trip against an account we cannot invoice.
  if (facility.status === 'pending' && !canBook(facility)) {
    redirect('/facility/welcome');
  }

  // Belt and braces with the route handler, which enforces the same rule and
  // is the authority. This one exists so a coordinator reads a sentence instead
  // of filling a long form and being refused at the end of it.
  if (!canBook(facility)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="serif text-3xl font-semibold">Booking is not open yet</h1>
        <p className="ink-soft mt-4 leading-relaxed">
          {facility.name} is with us for approval. Call{' '}
          <a className="underline" href="tel:+17049418508">
            (704) 941-8508
          </a>{' '}
          and we will take this booking by phone today.
        </p>
        <Link href="/facility" className="btn-ghost mt-8 inline-flex min-h-[44px] items-center">
          Back to your account
        </Link>
      </div>
    );
  }

  /**
   * The service line this kind of facility books unless the coordinator says
   * otherwise — care for a dialysis centre, winnie for a vet practice. It is a
   * default, not a restriction: the picker is still shown, because a clinic
   * that also sends a patient home after a procedure needs Recovery and should
   * not have to call us for it.
   *
   * An explicit ?service= wins, so a link from elsewhere in the portal can
   * preselect and have the form state the decision rather than re-offer it.
   */
  const fromUrl = serviceWasHonoured(searchParams?.service);
  const initialService = fromUrl
    ? coerceServiceLine(searchParams?.service)
    : coerceServiceLine(defaultServiceLineForKind(facility.kind));

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const [patient, unread] = await Promise.all([
    patientForFacility(facility.id, searchParams?.patient),
    facilityUnreadCount(facility.id),
  ]);

  return (
    <ConsoleShell facilityName={facility.name} active="request" counts={{ messages: unread }}>
      <h2 className="serif text-2xl font-semibold">Request a ride</h2>
      <p className="ink-soft mt-3 leading-relaxed">
        A dispatcher confirms every trip by phone or text before it is booked. Four hours&rsquo;
        notice or more, please &mdash; for anything sooner, call{' '}
        <a className="underline" href="tel:+17049418508">
          (704) 941-8508
        </a>
        .
      </p>

      <div className="card-tile mt-8 p-6 sm:p-8">
        <Suspense fallback={<p className="ink-mute">Loading the form…</p>}>
          <RequestForm
            initialService={initialService}
            servicePreselected={fromUrl}
            googleMapsApiKey={googleMapsApiKey}
            facility={{
              name: facility.name,
              passengerNoun: passengerNoun(facility.kind),
              // The account's own billing mode decides where the toggle starts.
              // The server re-resolves it with resolvePayer() regardless, so
              // this is the coordinator's starting point, not the decision.
              defaultPayer: payerFromBillingMode(facility.billing_mode),
              patient,
            }}
          />
        </Suspense>
      </div>
    </ConsoleShell>
  );
}
