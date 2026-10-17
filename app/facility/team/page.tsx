import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityUnreadCount } from '@/lib/facility-console.server';
import { listTeam } from '@/lib/facility-team.server';
import { canBook } from '@/lib/facility';
import { canManageTeam } from '@/lib/facility-team';
import ConsoleShell from '@/components/facility/ConsoleShell';
import TeamPanel from '@/components/facility/TeamPanel';

export const metadata: Metadata = {
  title: 'Team — Tassy Transportation',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * Who at this facility can sign in.
 *
 * The wizard's second screen offers to invite people, but it only ever saved
 * the rows. This page is where the list lives afterwards: add people, send a
 * new link to someone who lost theirs, turn someone off when they leave.
 */
export default async function FacilityTeamPage() {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');
  const facility = session.facility;
  if (facility.status === 'pending' && !canBook(facility)) redirect('/facility/welcome');

  const [team, unread] = await Promise.all([listTeam(facility.id), facilityUnreadCount(facility.id)]);
  const manage = canManageTeam(session.role);

  return (
    <ConsoleShell facilityName={facility.name} signedInAs={session.email} active="team" counts={{ messages: unread }}>
      <div>
        <h2 className="serif text-2xl font-semibold">Team</h2>
        <p className="ink-soft mt-1 text-sm">
          The people at {facility.name} who can request rides and see trips. Everyone signs in with an emailed link, so
          there are no passwords to share.
        </p>
      </div>

      <TeamPanel
        canManage={manage}
        meId={session.facilityUserId}
        members={team.map((m) => ({
          id: m.id,
          email: m.email,
          fullName: m.fullName,
          role: m.role,
          status: m.status,
          lastSeenAt: m.lastSeenAt,
        }))}
      />

      {!manage ? (
        <p className="ink-mute mt-6 text-sm">
          Only people who manage the account can add or remove teammates. Ask one of them, or call dispatch on{' '}
          <a className="underline" href="tel:+17049418508">
            (704) 941-8508
          </a>
          .
        </p>
      ) : null}
    </ConsoleShell>
  );
}
