import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import FacilityWizard from '@/components/facility/FacilityWizard';
import ConsoleShell from '@/components/facility/ConsoleShell';
import { currentFacilitySession } from '@/lib/facility-auth';
import { canBook } from '@/lib/facility';
import { accountManagerDisplayName } from '@/lib/facility.server';

export const metadata: Metadata = {
  title: 'Finish setting up your account — Tassy Transportation',
  // Behind a magic link and specific to one facility. Never indexed.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The four screens behind the magic link.
 *
 * The session is resolved here, once, on the server. If the link has expired or
 * was never valid there is nothing useful to render — sending them somewhere
 * that explains how to get another link beats an empty wizard that fails on
 * submit.
 */
export default async function FacilityWelcomePage({
  searchParams,
}: {
  searchParams?: { edit?: string };
}) {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');

  /**
   * The facility comes off the session, and is deliberately NOT re-read here.
   * currentFacilitySession() binds auth_user_id on a first arrival, and a second
   * read by the same auth id in this same render is memoized back to its
   * pre-write empty result — which sent every genuinely new partner to
   * /facility/link-expired. See FacilitySession.facility.
   */
  const facility = session.facility;

  /**
   * A facility that finished the wizard on weekly invoice is waiting on US, not
   * the other way round. Every /facility page redirects here while a pending
   * facility cannot book, and before this the wizard simply started again at a
   * blank step 1 -- which read as "your answers were lost". Show a holding page
   * instead. `?edit=1` re-opens the wizard (for example to switch to
   * passenger-pays so they can book before approval).
   */
  const finishedWizard = Boolean(facility.address && facility.billing_email);
  if (facility.status === 'pending' && !canBook(facility) && finishedWizard && searchParams?.edit !== '1') {
    return (
      <ConsoleShell facilityName={facility.name} signedInAs={session.email} bare>
        <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
          <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">
            Tassy Transportation
          </p>
          <h1 className="serif mt-3 text-center text-3xl font-semibold sm:text-4xl">
            {facility.name} is set up
          </h1>
          <p className="mt-4 text-center text-[color:var(--ink-soft)]">
            Weekly invoicing is a credit account, so we open it by hand. We usually do that the same
            business day, and we will email you the moment your account is open.
          </p>
          <p className="mt-4 text-center text-[color:var(--ink-soft)]">
            Need a ride before then? Call dispatch on{' '}
            <a className="underline" href="tel:+17049418508">(704) 941-8508</a> and we will book it by phone.
          </p>
          <p className="mt-6 text-center text-sm">
            <a className="underline" href="/facility/welcome?edit=1">Change your details or how you pay</a>
          </p>
        </div>
      </ConsoleShell>
    );
  }

  /**
   * Read here rather than from NEXT_PUBLIC_*, so rotating the key takes effect
   * on the next request instead of needing a rebuild. Same pattern as /request
   * and /facility/request. Undefined is a supported state: the address field
   * degrades to a plain text input and the wizard still saves.
   */
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const managerName = await accountManagerDisplayName(facility.account_manager ?? null);

  return (
    <ConsoleShell facilityName={facility.name} signedInAs={session.email} bare>
    <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">
        Tassy Transportation
      </p>
      <h1 className="serif mt-3 text-center text-3xl font-semibold sm:text-4xl">
        Finish setting up your account
      </h1>
      <p className="mt-3 text-center text-sm text-[color:var(--ink-soft)]">
        Four short screens. No password, no card.
      </p>

      <div className="mt-10">
        <FacilityWizard
          facilityName={facility.name}
          accountManager={managerName}
          initialKind={facility.kind}
          googleMapsApiKey={googleMapsApiKey}
        />
      </div>
    </div>
    </ConsoleShell>
  );
}
