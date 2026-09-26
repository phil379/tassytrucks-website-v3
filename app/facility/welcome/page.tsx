import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import FacilityWizard from '@/components/facility/FacilityWizard';
import { currentFacilitySession } from '@/lib/facility-auth';

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
export default async function FacilityWelcomePage() {
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
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
          accountManager={facility.account_manager ?? null}
          initialKind={facility.kind}
        />
      </div>
    </main>
  );
}
