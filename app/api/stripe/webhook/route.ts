import { NextResponse } from 'next/server';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { verifyWebhookSignature } from '@/lib/stripe';

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
  const tripId = session.metadata?.trip_request_id;
  const query = tripId
    ? db.from(TRIP_REQUESTS_TABLE).update(patch).eq('id', tripId)
    : session.payment_link
      ? db.from(TRIP_REQUESTS_TABLE).update(patch).eq('stripe_payment_link_id', session.payment_link)
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
    console.error('[stripe] paid session matched no request:', session.id);
    return NextResponse.json({ ok: true, ignored: 'no matching request' });
  }

  return NextResponse.json({ ok: true, updated: data.length });
}
