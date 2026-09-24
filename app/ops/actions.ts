'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { OPS_COOKIE, isOpsAuthed, passwordMatches, sessionToken } from '@/lib/ops-auth';
import { supabaseAdmin, TRIP_REQUESTS_TABLE, TRIP_STATUSES } from '@/lib/supabase-admin';
import { ADVANCE } from '@/lib/ops-status';

/**
 * Every mutation re-checks the cookie. A server action is a public HTTP endpoint —
 * rendering the table behind a gate does not protect the actions behind it.
 */
function assertAuthed() {
  if (!isOpsAuthed()) throw new Error('Not authorised');
}

export async function login(formData: FormData) {
  const password = String(formData.get('password') ?? '');

  if (!process.env.OPS_PASSWORD) redirect('/ops?error=unconfigured');
  if (!passwordMatches(password)) redirect('/ops?error=bad');

  cookies().set(OPS_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/ops',
    maxAge: 60 * 60 * 12,
  });

  redirect('/ops');
}

export async function logout() {
  cookies().delete({ name: OPS_COOKIE, path: '/ops' });
  redirect('/ops');
}

/**
 * One save per row: status, quote, and internal notes travel together, because
 * on a phone you change them in one pass and press Save once.
 */
export async function updateRow(formData: FormData) {
  assertAuthed();

  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing id');

  const status = String(formData.get('status') ?? '');
  if (!(TRIP_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Unknown status: ${status}`);
  }

  const rawQuote = String(formData.get('quotedDollars') ?? '').trim();
  const notes = String(formData.get('internalNotes') ?? '').trim();

  const patch: Record<string, unknown> = {
    status,
    internal_notes: notes || null,
  };

  if (rawQuote === '') {
    patch.quoted_cents = null;
  } else {
    const dollars = Number(rawQuote);
    if (!Number.isFinite(dollars) || dollars < 0) throw new Error('Invalid quote');
    patch.quoted_cents = Math.round(dollars * 100);
  }

  const { error } = await supabaseAdmin().from(TRIP_REQUESTS_TABLE).update(patch).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/ops');
}

/**
 * One-tap status advance: new → quoted → confirmed.
 *
 * The operator works this standing up, between other things. Opening a select,
 * choosing a value and pressing Save is three interactions for the move they
 * make ninety percent of the time. This is one.
 */
export async function advanceStatus(formData: FormData) {
  assertAuthed();

  const id = String(formData.get('id') ?? '');
  const from = String(formData.get('from') ?? '');
  if (!id) throw new Error('Missing id');

  const to = ADVANCE[from];
  if (!to) throw new Error(`No advance step from "${from}"`);

  // Guarded on the current value: if someone else moved the row first, this
  // updates nothing rather than dragging it backwards.
  const { error } = await supabaseAdmin()
    .from(TRIP_REQUESTS_TABLE)
    .update({ status: to })
    .eq('id', id)
    .eq('status', from);

  if (error) throw new Error(error.message);
  revalidatePath('/ops');
}
