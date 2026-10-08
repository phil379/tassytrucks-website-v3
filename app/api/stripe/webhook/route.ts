import { NextResponse } from 'next/server';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { verifyWebhookSignature } from '@/lib/stripe';
import { notifyOperatorPaid, sendRichEmail } from '@/lib/notifications';
import { receiptSubject, receiptHtml, receiptText, type ReceiptData } from '@/lib/receipt-email';

/**
 * POST /api/stripe/webhook — Stripe tells us the money arrived.
 *
 * This is the only thing that may set `payment_status = 'paid'`. A dispatcher
 * marking a trip paid by hand is a guess; this is Stripe's word. The two are
 * kept apart on purpose — `payment_status` says what we believe, `paid_at`
 * says when Stripe told us, and a discrepancy between them is a question worth
 * being able to ask.
 *
 * SECURITY. An unsigned endpoint here lets a stranger mark every trip paid, so
 * the signature is verified before the body is parsed, against the RAW bytes.
 * No secret, no signature, a stale timestamp or a mismatch — all 400, and
 * nothing is read. Failing open is not an option on a payment path.
 *
 * Stripe retries on any non-2xx, so an event we cannot match returns 200 with
 * a note rather than an error: a payment for a deleted request should not be
 * retried for three days.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckoutSession = {
  id?: string;
  payment_status?: string;
  amount_total?: number;
  payment_link?: string;
  metadata?: Record<string, string> | null;
};

export async function POST(request: Request) {
  // RAW bytes. Parsing and re-serialising changes them and the HMAC will not
  // match — this must stay a text read.
  const raw = await request.text();

  const ok = verifyWebhookSignature(
    raw,
    request.headers.get('stripe-signature'),
    process.env.STRIPE_WEBHOOK_SECRET,
  );
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Bad signature' }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: CheckoutSession } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Everything else is acknowledged and ignored, so Stripe stops sending it.
    return NextResponse.json({ ok: true, ignored: event.type ?? 'unknown' });
  }

  const session = event.data?.object ?? {};
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ ok: true, ignored: 'session not paid' });
  }

  const db = supabaseAdmin();
  const patch = {
    payment_status: 'paid',
    paid_at: new Date().toISOString(),
  };

  // Two ways to find the trip, because one of them can go missing. Metadata is
  // what we set on the payment link; the link id is the fallback for the day
  // Stripe stops copying metadata onto the session it creates.
  // Only rows NOT already paid. Stripe retries on its own schedule, and a
  // retry must not re-stamp paid_at or fire a second alert.
  const base = db.from(TRIP_REQUESTS_TABLE).update(patch).neq('payment_status', 'paid');

  const tripId = session.metadata?.trip_request_id;
  const query = tripId
    ? base.eq('id', tripId)
    : session.payment_link
      ? base.eq('stripe_payment_link_id', session.payment_link)
      : null;

  if (!query) {
    console.error('[stripe] paid session with nothing to match on:', session.id);
    return NextResponse.json({ ok: true, ignored: 'unmatched' });
  }

  const { data, error } = await query.select('id');
  if (error) {
    // A database failure IS worth a retry — Stripe will send it again.
    console.error('[stripe] could not record payment:', error.message);
    return NextResponse.json({ ok: false, error: 'Write failed' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Zero rows now means one of two very different things: a Stripe retry of
    // a payment already recorded, or a payment for a request that isn't there.
    const locator = tripId
      ? db.from(TRIP_REQUESTS_TABLE).select('id').eq('id', tripId)
      : db.from(TRIP_REQUESTS_TABLE).select('id').eq('stripe_payment_link_id', session.payment_link!);

    const { data: existing } = await locator;
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, ignored: 'already paid' });
    }

    console.error('[stripe] paid session matched no request:', session.id);
    return NextResponse.json({ ok: true, ignored: 'no matching request' });
  }

  // The money is recorded. Only now does anyone get told — and a failed alert
  // must not undo a stored payment.
  await notifyOperatorPaid({ id: data[0].id });

  // The customer's RECEIPT — best-effort. A receipt failure must never undo a
  // recorded payment, so it is caught and logged, never thrown.
  try {
    const { data: rows } = await db
      .from(TRIP_REQUESTS_TABLE)
      .select('*')
      .eq('id', data[0].id as string)
      .limit(1);
    const r = (rows?.[0] ?? {}) as unknown as Record<string, unknown>;
    const email = (r.contact_email as string | null) ?? null;
    if (email) {
      const receipt: ReceiptData = {
        tripNumber: (r.trip_number as string | null) ?? null,
        confirmationCode: (r.confirmation_code as string | null) ?? null,
        serviceLine: r.service_line as string,
        contactFirstName: (r.contact_first_name as string | null) ?? null,
        contactName: (r.contact_name as string | null) ?? null,
        contactPhone: (r.contact_phone as string | null) ?? null,
        contactEmail: email,
        pickupAddress: (r.pickup_address as string | null) ?? null,
        dropoffAddress: (r.dropoff_address as string | null) ?? null,
        requestedAt: (r.requested_at as string | null) ?? null,
        amountCents:
          (r.agreed_cents as number | null) ??
          (r.quoted_cents as number | null) ??
          (session.amount_total ?? 0),
        paidAt: (r.paid_at as string | null) ?? new Date().toISOString(),
      };
      await sendRichEmail({
        to: email,
        subject: receiptSubject(receipt),
        html: receiptHtml(receipt),
        text: receiptText(receipt),
      });
    }
  } catch (e) {
    console.error('[stripe] receipt email failed (payment still recorded):', e);
  }

  return NextResponse.json({ ok: true, updated: data.length });
}
