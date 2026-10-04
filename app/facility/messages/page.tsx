import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityMessages } from '@/lib/facility-console.server';
import { canBook } from '@/lib/facility';
import ConsoleShell from '@/components/facility/ConsoleShell';
import MessageComposer from '@/components/facility/MessageComposer';
import { whenLabel } from '@/components/facility/bits';
import { markThreadRead } from './actions';

export const metadata: Metadata = {
  title: 'Messages — Tassy Transportation',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function FacilityMessagesPage() {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');
  const facility = session.facility;
  if (facility.status === 'pending' && !canBook(facility)) redirect('/facility/welcome');

  const messages = await facilityMessages(facility.id);

  // Opening the thread IS reading it, so the badge clears here. Best-effort:
  // a failed mark must never stop the thread rendering.
  try {
    await markThreadRead();
  } catch {
    /* non-fatal */
  }

  return (
    <ConsoleShell facilityName={facility.name} signedInAs={session.email} active="messages" counts={{ messages: 0 }}>
      <h2 className="serif text-2xl font-semibold">Messages with dispatch</h2>
      <p className="ink-soft mt-1 text-sm">
        A direct line to the people moving your trips. For anything urgent, call{' '}
        <a className="underline" href="tel:+17049418508">(704) 941-8508</a> &mdash; the phone is
        always faster than a message.
      </p>

      <div className="mt-6 rounded-xl border border-[color:var(--line)] p-5">
        {messages.length === 0 ? (
          <p className="ink-soft py-6 text-center text-sm">
            Nothing here yet. Write below and it reaches dispatch.
          </p>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => {
              const mine = m.author === 'facility';
              return (
                <li key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className="max-w-[85%] rounded-xl px-4 py-3"
                    style={
                      mine
                        ? { background: 'rgba(200,169,106,.14)' }
                        : { background: 'rgba(244,239,224,.06)' }
                    }
                  >
                    <p className="ink-mute text-[11px] uppercase tracking-wider">
                      {mine ? (m.author_name ?? 'You') : 'Tassy dispatch'} · {whenLabel(m.created_at)}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <MessageComposer />
      </div>
    </ConsoleShell>
  );
}
