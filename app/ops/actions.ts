'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { OPS_COOKIE, isOpsAuthed, passwordMatches, sessionToken } from '@/lib/ops-auth';
import { supabaseAdmin, TRIP_REQUESTS_TABLE, TRIP_STATUSES } from '@/lib/supabase-admin';
import { ADVANCE } from '@/lib/ops-status';
import { generateConfirmationCode } from '@/lib/confirmation';
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
  type ConfirmedTrip,
} from '@/lib/confirmation-email';
import { sendRichEmail } from '@/lib/notifications';
import { createTripPaymentLink, stripeConfigured } from '@/lib/stripe';
import { serviceShortName } from '@/lib/trip-request';

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
    throw new Error('Enter the agreed price before confirming');
  }
  const agreedCents = Math.round(dollars * 100);

  // Facility accounts are invoiced monthly and must NOT be sent a card link.
  const onAccount = formData.get('onAccount') === 'on';

  const db = supabaseAdmin();
  const { data: row, error: readError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (readError) throw new Error(readError.message);
  if (!row) throw new Error('Request not found');
  if (!row.contact_email) {
    throw new Error('No email on this request — confirm it by phone and record the price instead');
  }

  const code = row.confirmation_code || generateConfirmationCode();

  let payUrl: string | null = row.payment_link_url ?? null;
  let payLinkId: string | null = row.stripe_payment_link_id ?? null;

  if (!onAccount && !payUrl && stripeConfigured()) {
    const link = await createTripPaymentLink({
      amountCents: agreedCents,
      serviceName: serviceShortName(row.service_line),
      confirmationCode: code,
      tripRequestId: id,
    });
    payUrl = link.url;
    payLinkId = link.id;
  }

  const confirmed: ConfirmedTrip = {
    confirmationCode: code,
    agreedCents,
    driverName: row.driver_name ?? null,
    vehicleDescription: row.vehicle_description ?? null,
    discountLabel: row.discount_label ?? null,
    discountCents: row.discount_cents ?? null,
    payUrl,
  };

  // The shape the email templates read. Built from the stored row rather than
  // a form, so what the customer is sent is what the database actually holds.
  const trip = {
    serviceLine: row.service_line,
    contactFirstName: row.contact_first_name ?? (row.contact_name ?? '').split(' ')[0] ?? '',
    contactLastName: row.contact_last_name ?? '',
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    requestedAt: row.requested_at,
    returnTrip: Boolean(row.return_trip),
    returnAt: row.return_at,
    passengers: row.passengers ?? 1,
    mobility: row.mobility,
  } as Parameters<typeof confirmationHtml>[1];

  await sendRichEmail({
    to: row.contact_email,
    subject: confirmationSubject(confirmed, trip),
    html: confirmationHtml(confirmed, trip),
    text: confirmationText(confirmed, trip),
  });

  const { error: writeError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .update({
      status: 'confirmed',
      confirmation_code: code,
      confirmed_at: row.confirmed_at ?? new Date().toISOString(),
      agreed_cents: agreedCents,
      payment_link_url: payUrl,
      stripe_payment_link_id: payLinkId,
      // `unpaid` until Stripe says otherwise; `on_account` is a decision, not a
      // guess, so it is recorded as one. The webhook owns `paid`.
      payment_status: onAccount ? 'on_account' : (row.payment_status ?? 'unpaid'),
    })
    .eq('id', id);
  if (writeError) throw new Error(writeError.message);

  revalidatePath('/ops');
}
