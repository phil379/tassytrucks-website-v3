'use server';

import { revalidatePath } from 'next/cache';
import { requireFacilitySession } from '@/lib/facility-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { FACILITY_MESSAGES_TABLE } from '@/lib/facility-console.server';
import { sendRichEmail } from '@/lib/notifications';

export type SendResult = { ok: true } | { ok: false; error: string };

/** Max a coordinator can send at once. Matches the column CHECK. */
const MAX = 4000;

export async function sendFacilityMessage(formData: FormData): Promise<SendResult> {
  const session = await requireFacilitySession();
  const body = String(formData.get('body') ?? '').trim();

  if (!body) return { ok: false, error: 'Write a message first.' };
  if (body.length > MAX) return { ok: false, error: 'That message is too long — please shorten it.' };

  const { error } = await supabaseAdmin()
    .from(FACILITY_MESSAGES_TABLE)
    .insert({
      // From the session. A facility id off a form body is one coordinator
      // writing into another facility's thread.
      facility_id: session.facilityId,
      author: 'facility',
      author_name: session.email || null,
      body,
    });

  if (error) return { ok: false, error: 'We could not send that. Please call (704) 941-8508.' };

  // Best-effort, and deliberately after the insert: a dead mail provider must
  // never lose a message that was already stored. Same ordering as every other
  // write path in this codebase.
  try {
    const to = process.env.OPERATOR_EMAIL;
    if (to) {
      const name = session.facility.name;
      // NO MESSAGE BODY IN THE ALERT. A coordinator may write a passenger's
      // name, and an operator alert is not a place to put one. The alert says
      // who wrote and where to read it -- the same rule the ntfy payload
      // follows (ref and pickup time only, never PII).
      await sendRichEmail({
        to,
        subject: `Facility message — ${name}`,
        html: `<p><strong>${name}</strong> sent a message in their portal.</p><p>Read and reply in the facility thread.</p>`,
        text: `${name} sent a message in their portal. Read and reply in the facility thread.`,
      });
    }
  } catch {
    /* non-fatal */
  }

  revalidatePath('/facility/messages');
  return { ok: true };
}

/** Mark dispatch's messages read when the coordinator opens the thread. */
export async function markThreadRead(): Promise<void> {
  const session = await requireFacilitySession();
  await supabaseAdmin()
    .from(FACILITY_MESSAGES_TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('facility_id', session.facilityId)
    .eq('author', 'dispatch')
    .is('read_at', null);
}
