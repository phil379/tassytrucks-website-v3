import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
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
import { pingTassyOpsConfirmed } from '@/lib/tassyops-notify';
import { recordPaymentAttempt } from '@/lib/payment-attempts';

/**
 * The one place a trip becomes "confirmed": issue a code, take an agreed price, create the Stripe
 * link, email the customer, stamp the row, ping the text. Two doors lead here — the password-gated
 * /ops page (confirmAndSend) and the signed call from the TassyOps dispatch board
 * (app/api/ops/confirm). Both must behave the same, so the logic lives once.
 *
 * ORDER MATTERS. The email IS the deliverable: a trip marked confirmed that the customer never
 * heard about is worse than an error the dispatcher can see and retry. So the payment link and the
 * email both happen BEFORE the row is stamped, and a failure in either leaves the request exactly
 * as it was. A confirmation code and payment link are issued once; confirming again resends the
 * same ones (two live links for one trip is how somebody pays twice).
 */

export type ConfirmFailure =
  | 'no_price'
  | 'no_email'
  | 'link_failed'
  | 'email_failed'
  | 'not_found'
  | 'not_confirmable'
  | 'already_confirmed';

export type ConfirmResult =
  | { ok: true; confirmationCode: string; payUrl: string | null }
  | { ok: false; code: ConfirmFailure };

const CLOSED_STATUSES = ['cancelled', 'completed', 'no_show'];

export async function confirmTrip(args: {
  id: string;
  agreedCents: number;
  onAccount: boolean;
  /** Bridge calls: never confirm a trip that is already closed out. */
  refuseClosed?: boolean;
  /** Bridge calls: a double tap must not email the customer twice. */
  refuseIfAlreadyConfirmed?: boolean;
}): Promise<ConfirmResult> {
  const { id, agreedCents, onAccount } = args;
  if (!Number.isInteger(agreedCents) || agreedCents <= 0) return { ok: false, code: 'no_price' };

  const db = supabaseAdmin();
  const { data: row, error: readError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) return { ok: false, code: 'not_found' };
  if (args.refuseClosed && CLOSED_STATUSES.includes(String(row.status))) {
    return { ok: false, code: 'not_confirmable' };
  }
  if (args.refuseIfAlreadyConfirmed && row.confirmed_at && row.payment_link_url) {
    return { ok: false, code: 'already_confirmed' };
  }
  if (!row.contact_email) return { ok: false, code: 'no_email' };

  const code = row.confirmation_code || generateConfirmationCode();

  let payUrl: string | null = row.payment_link_url ?? null;
  let payLinkId: string | null = row.stripe_payment_link_id ?? null;

  if (!onAccount && !payUrl && stripeConfigured()) {
    let link: Awaited<ReturnType<typeof createTripPaymentLink>> | null = null;
    try {
      link = await createTripPaymentLink({
        amountCents: agreedCents,
        serviceName: serviceShortName(row.service_line),
        confirmationCode: code,
        tripRequestId: id,
        serviceLine: row.service_line,
      });
    } catch (e) {
      console.error('[ops] payment link failed (trip left unchanged):', e);
    }
    if (!link) return { ok: false, code: 'link_failed' };
    payUrl = link.url;
    payLinkId = link.id;
    // Remember what this link asked for, so the Stripe webhook can check the amount collected.
    await recordPaymentAttempt(db, { tripId: id, linkId: link.id, amountCents: agreedCents });
  }

  const confirmed: ConfirmedTrip = {
    confirmationCode: code,
    tripNumber: (row as unknown as { trip_number?: string | null }).trip_number ?? null,
    agreedCents,
    driverName: row.driver_name ?? null,
    vehicleDescription: row.vehicle_description ?? null,
    discountLabel: row.discount_label ?? null,
    discountCents: row.discount_cents ?? null,
    payUrl,
  };

  // The shape the email templates read. Built from the stored row rather than a form, so what the
  // customer is sent is what the database actually holds.
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

  try {
    await sendRichEmail({
      to: row.contact_email,
      subject: confirmationSubject(confirmed, trip),
      html: confirmationHtml(confirmed, trip),
      text: confirmationText(confirmed, trip),
    });
  } catch (e) {
    console.error('[ops] confirmation email failed (trip left unchanged):', e);
    return { ok: false, code: 'email_failed' };
  }

  const { error: writeError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .update({
      status: 'confirmed',
      confirmation_code: code,
      confirmed_at: row.confirmed_at ?? new Date().toISOString(),
      agreed_cents: agreedCents,
      payment_link_url: payUrl,
      stripe_payment_link_id: payLinkId,
      // `unpaid` until Stripe says otherwise; `on_account` is a decision, not a guess. The webhook owns `paid`.
      payment_status: onAccount ? 'on_account' : (row.payment_status ?? 'unpaid'),
    })
    .eq('id', id);
  if (writeError) throw new Error(writeError.message);

  // Rider text (booking confirmed + payment link). Best effort, after everything is saved and emailed.
  await pingTassyOpsConfirmed(id);

  return { ok: true, confirmationCode: code, payUrl };
}
