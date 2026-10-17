import { NextResponse } from 'next/server';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { brandLogoUrl, isValidReceiptToken, payPageUrlFor, receiptUrlFor } from '@/lib/receipt-token';
import { findPaymentAttempt } from '@/lib/payment-attempts';
import { createBrandedCheckout, paymentLinkUrl, stripeConfigured } from '@/lib/stripe';
import { serviceShortName } from '@/lib/trip-request';

/**
 * /pay/<token> - the address in the customer's email and text.
 *
 * It makes a fresh Tassy-branded Stripe checkout at the moment of the click and sends the customer to
 * it, so the link never expires and the page shows the Tassy logo (see createBrandedCheckout). The
 * token is the same private 24-character token as the receipt. A bad or unknown token is a plain 404.
 * If a branded checkout cannot be made, the customer is sent to the trip's ordinary Payment Link.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

function notFound() {
  return new NextResponse('Not found', { status: 404, headers: NO_STORE });
}

function go(url: string) {
  return NextResponse.redirect(url, { status: 303, headers: NO_STORE });
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!isValidReceiptToken(token)) return notFound();

  const db = supabaseAdmin();
  const { data: row } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('id, service_line, confirmation_code, agreed_cents, payment_status, stripe_payment_link_id, receipt_token')
    .eq('receipt_token', token)
    .maybeSingle();
  if (!row) return notFound();

  // Already paid: show the receipt instead of a second charge.
  if (row.payment_status === 'paid') return go(receiptUrlFor(token));
  if (!stripeConfigured()) return notFound();

  const linkId = (row.stripe_payment_link_id as string | null) ?? null;
  const fallback = async () => {
    const url = linkId ? await paymentLinkUrl(linkId) : null;
    return url ? go(url) : new NextResponse('This payment link is not available. Please call (704) 941-8508.', { status: 410, headers: NO_STORE });
  };

  // The amount is what the Payment Link recorded, so the webhook's amount check agrees with it.
  const attempt = linkId ? await findPaymentAttempt(db, linkId) : null;
  const amountCents = attempt?.status === 'active' ? attempt.amount_cents : (row.agreed_cents as number | null);
  if (!amountCents || !row.confirmation_code) return fallback();
  if (attempt && attempt.status !== 'active') return fallback();

  try {
    const session = await createBrandedCheckout({
      amountCents,
      serviceName: serviceShortName(row.service_line as string),
      confirmationCode: row.confirmation_code as string,
      tripRequestId: row.id as string,
      serviceLine: row.service_line as string,
      paymentLinkId: linkId,
      successUrl: receiptUrlFor(token),
      cancelUrl: payPageUrlFor(token),
      logoUrl: brandLogoUrl(),
    });
    return go(session.url);
  } catch (e) {
    console.error('[pay] branded checkout failed, using the payment link:', e);
    return fallback();
  }
}
