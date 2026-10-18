import { NextResponse } from 'next/server';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { brandLogoUrl, isValidReceiptToken, payPageUrlFor, receiptUrlFor } from '@/lib/receipt-token';
import { findPaymentAttempt } from '@/lib/payment-attempts';
import { createBrandedCheckout, paymentLinkUrl, stripeConfigured } from '@/lib/stripe';
import { serviceShortName } from '@/lib/trip-request';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { payBlockFor, payBlockMessage, type PayBlock } from '@/lib/pay-guard';

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

/** A plain, friendly page (no checkout) for a trip that cannot be paid by card. */
function notice(block: PayBlock) {
  const { status, title, body } = payBlockMessage(block);
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="robots" content="noindex, nofollow"><title>${title}</title></head>` +
    `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.5">` +
    `<h1 style="font-size:1.4rem">${title}</h1><p>${body}</p><p><a href="https://www.tassytrucks.com">Tassy Transportation</a></p></body></html>`;
  return new NextResponse(html, { status, headers: { ...NO_STORE, 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!isValidReceiptToken(token)) return notFound();

  // Best-effort throttle (lib/rate-limit.ts is per-instance memory, so it slows scripted hammering
  // and accidental double-click storms; it is not a hard cap). Checked BEFORE the lookup so a
  // throttled caller learns nothing about whether a token exists.
  const ip = rateLimit(`pay:ip:${clientIp(req.headers)}`, 60, 10 * 60 * 1000);
  const perToken = rateLimit(`pay:token:${token}`, 12, 10 * 60 * 1000);
  if (!ip.ok || !perToken.ok) {
    const wait = Math.max(ip.retryAfterSeconds, perToken.retryAfterSeconds);
    return new NextResponse('Too many requests. Please wait a minute and try again.', {
      status: 429,
      headers: { ...NO_STORE, 'Retry-After': String(wait) },
    });
  }

  const db = supabaseAdmin();
  const { data: row } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('id, service_line, status, confirmation_code, agreed_cents, payment_status, stripe_payment_link_id, receipt_token')
    .eq('receipt_token', token)
    .maybeSingle();
  if (!row) return notFound();

  // Already paid: show the receipt instead of a second charge.
  if (row.payment_status === 'paid') return go(receiptUrlFor(token));
  // Cancelled, on account, refunded or anything else that is not plainly "unpaid": no live checkout.
  const block = payBlockFor({ status: row.status as string | null, payment_status: row.payment_status as string | null });
  if (block) return notice(block);
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
