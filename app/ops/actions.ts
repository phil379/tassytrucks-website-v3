'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { OPS_COOKIE, isOpsAuthed, passwordMatches, sessionToken } from '@/lib/ops-auth';
import { supabaseAdmin, TRIP_REQUESTS_TABLE, TRIP_STATUSES } from '@/lib/supabase-admin';
import { ADVANCE, assignmentBlocker } from '@/lib/ops-status';
import { generateConfirmationCode } from '@/lib/confirmation';
import { sendRichEmail } from '@/lib/notifications';
import { ratingSubject, ratingHtml, ratingText, type RatingEmailData } from '@/lib/rating-email';
import { pingTassyOpsConfirmed } from '@/lib/tassyops-notify';
import { confirmTrip } from '@/lib/ops-confirm';
import { FAILURE_DELAY_MS, beginOpsLogin } from '@/lib/ops-login-guard';
import { clientIp } from '@/lib/rate-limit';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Every mutation re-checks the cookie. A server action is a public HTTP endpoint —
 * rendering the table behind a gate does not protect the actions behind it.
 */
function assertAuthed() {
  if (!isOpsAuthed()) throw new Error('Not authorised');
}

/**
 * A dispatcher's mistake (no price, no email) or a failed outside call should show a plain
 * message on the queue, not the framework crash page. Codes, not free text, so the URL can
 * never be used to put arbitrary words on the ops screen.
 */
function backWithNotice(code: 'no_price' | 'no_email' | 'link_failed' | 'email_failed'): never {
  redirect(`/ops?notice=${code}`);
}

export async function login(formData: FormData) {
  const password = String(formData.get('password') ?? '');

  if (!process.env.OPS_PASSWORD) redirect('/ops?error=unconfigured');

  // Lockout (lib/ops-login-guard.ts): 5 wrong passwords per IP, 30 for the whole gate, per 15 minutes.
  // The attempt is counted before the password is checked, and the password itself is never stored or logged.
  const attempt = await beginOpsLogin(supabaseAdmin, clientIp(headers()));
  if (!attempt.allowed) {
    await attempt.finish('refused');
    await sleep(FAILURE_DELAY_MS);
    redirect('/ops?error=locked');
  }
  if (!passwordMatches(password)) {
    await attempt.finish('failed');
    await sleep(FAILURE_DELAY_MS);
    redirect('/ops?error=bad');
  }
  await attempt.finish('ok');

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
 * Refuse a move to `assigned` for a row with no driver_id. Read from the row,
 * never from the form: the browser does not get to say a driver exists.
 */
async function requireDriver(id: string, to: string) {
  if (to !== 'assigned') return;
  const { data, error } = await supabaseAdmin()
    .from(TRIP_REQUESTS_TABLE)
    .select('driver_id')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  const reason = assignmentBlocker(to, (data as { driver_id: string | null } | null)?.driver_id);
  if (reason) throw new Error(reason);
}

/**
 * The phone path to "confirmed" (record the price, or tap Advance) has no email step, so it used to
 * confirm the trip and tell the rider nothing. Give it what the email path gives: a confirmation
 * code and confirmed_at if missing, then the same best-effort ping so TassyOps can send the
 * "your ride is confirmed" text. TassyOps still decides consent, quiet hours and dedupe, and
 * dedupes confirmations per trip, so calling this twice never texts twice. Never throws: the status
 * change has already been saved.
 */
async function afterConfirmedByPhone(id: string): Promise<void> {
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from(TRIP_REQUESTS_TABLE)
      .select('confirmation_code,confirmed_at')
      .eq('id', id)
      .single();
    const row = (data ?? {}) as { confirmation_code?: string | null; confirmed_at?: string | null };
    const patch: Record<string, unknown> = {};
    if (!row.confirmation_code) patch.confirmation_code = generateConfirmationCode();
    if (!row.confirmed_at) patch.confirmed_at = new Date().toISOString();
    if (Object.keys(patch).length > 0) {
      const { error } = await db.from(TRIP_REQUESTS_TABLE).update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    }
    await pingTassyOpsConfirmed(id);
  } catch (e) {
    console.error('[ops] confirmed-text step failed (status still saved):', e);
  }
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

  // The select form can set any status, so it needs the same refusal as the
  // one-tap advance. Only checked when the target IS `assigned`, so saving a
  // note on an already-assigned trip is unaffected.
  if (status === 'assigned') {
    await requireDriver(id, status);
  }

  let previousStatus: string | null = null;
  if (status === 'confirmed') {
    const { data: before } = await supabaseAdmin()
      .from(TRIP_REQUESTS_TABLE)
      .select('status')
      .eq('id', id)
      .single();
    previousStatus = (before as { status?: string } | null)?.status ?? null;
  }

  const { error } = await supabaseAdmin().from(TRIP_REQUESTS_TABLE).update(patch).eq('id', id);
  if (error) throw new Error(error.message);

  if (status === 'confirmed' && previousStatus !== 'confirmed') {
    await afterConfirmedByPhone(id);
  }

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

  // confirmed -> assigned is the step that claims a person exists. Without a
  // driver_id this used to succeed and the facility console then said "Driver
  // assigned" about a trip nobody was driving. Reject it instead.
  await requireDriver(id, to);

  // Guarded on the current value: if someone else moved the row first, this
  // updates nothing rather than dragging it backwards.
  const { error } = await supabaseAdmin()
    .from(TRIP_REQUESTS_TABLE)
    .update({ status: to })
    .eq('id', id)
    .eq('status', from);

  if (error) throw new Error(error.message);

  if (to === 'confirmed') {
    await afterConfirmedByPhone(id);
  }

  // Post-ride RATING request — best-effort. A feedback email failure must
  // never undo a completed-status change.
  if (to === 'completed') {
    try {
      const { data: rows } = await supabaseAdmin()
        .from(TRIP_REQUESTS_TABLE)
        .select('*')
        .eq('id', id)
        .limit(1);
      const r = (rows?.[0] ?? {}) as unknown as Record<string, unknown>;
      const email = (r.contact_email as string | null) ?? null;
      if (email) {
        const data: RatingEmailData = {
          tripId: id,
          tripNumber: (r.trip_number as string | null) ?? null,
          driverName: (r.driver_name as string | null) ?? null,
          serviceLine: (r.service_line as string) ?? '',
          contactFirstName: (r.contact_first_name as string | null) ?? null,
          contactName: (r.contact_name as string | null) ?? null,
        };
        await sendRichEmail({
          to: email,
          subject: ratingSubject(data),
          html: ratingHtml(data),
          text: ratingText(data),
        });
      }
    } catch (e) {
      console.error('[ops] rating email failed (status still advanced):', e);
    }
  }

  revalidatePath('/ops');
}

/**
 * Confirm a trip: issue a code, take an agreed price, create a payment link,
 * and tell the customer — the step that did not exist.
 *
 * Until now the pipeline ended at "we will call you". A dispatcher could set a
 * quote and advance the status and the customer was told none of it:
 * lib/confirmation-email.ts was written and imported by nothing, and
 * generateConfirmationCode() was called by nothing.
 *
 * ORDER MATTERS, and it is the opposite of the request path. There, the row is
 * the system of record and an alert that fails must never lose a captured
 * request, so notifications are best-effort. Here, the email IS the deliverable:
 * a trip marked confirmed that the customer never heard about is worse than an
 * error the dispatcher can see and retry. So the payment link and the email
 * both happen BEFORE the row is stamped, and a failure in either leaves the
 * request exactly as it was.
 *
 * A confirmation code is issued once. Confirming twice resends the same code
 * and the same link rather than minting new ones — the customer may already
 * have written the first one down, and two live payment links for one trip is
 * how somebody pays twice.
 */
export async function confirmAndSend(formData: FormData) {
  assertAuthed();

  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing id');

  const rawAgreed = String(formData.get('agreedDollars') ?? '').trim();
  const dollars = Number(rawAgreed);
  if (rawAgreed === '' || !Number.isFinite(dollars) || dollars <= 0) {
    backWithNotice('no_price');
  }

  // Facility accounts are invoiced monthly and must NOT be sent a card link.
  const onAccount = formData.get('onAccount') === 'on';

  // The work itself lives in lib/ops-confirm.ts, shared with the TassyOps one-tap confirm.
  const result = await confirmTrip({ id, agreedCents: Math.round(dollars * 100), onAccount });
  if (!result.ok) {
    if (result.code === 'not_found') throw new Error('Request not found');
    if (result.code === 'no_price' || result.code === 'no_email' || result.code === 'link_failed' || result.code === 'email_failed') {
      backWithNotice(result.code);
    }
    throw new Error(result.code);
  }

  revalidatePath('/ops');
}
