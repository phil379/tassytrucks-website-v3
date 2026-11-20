import { NextResponse } from 'next/server';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { brandLogoUrl, isValidReceiptToken, payPageUrlFor, receiptUrlFor } from '@/lib/receipt-token';
import { closePaymentAttempt, findPaymentAttempt, recordPaymentAttempt } from '@/lib/payment-attempts';
import { createBrandedCheckout, createTripPaymentLink, paymentLinkState, paymentLinkUrl, stripeConfigured, withStripeMode } from '@/lib/stripe';
import { stripeModeForTrip } from '@/lib/stripe-mode';
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
 *
 * HOW LONG THIS ADDRESS LIVES (2026-11-20). There is no clock on this address: nothing here
 * refuses by time, the token does not expire, and a trip that is still unpaid can be paid from
 * it before, on, or after the pickup day (a completed-but-unpaid trip included). The only
 * expiring artefact in the chain is the Checkout Session minted per click (24 hours, Stripe's
 * cap) — a session URL saved or forwarded instead of this address dies with it, which is the
 * dead link a rider hit on 2026-11-20. The stored Payment Link itself does not expire either;
 * if Stripe ever reports it deactivated, the fallback below mints a fresh one for the same
 * trip and amount rather than showing the rider a dead page.
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

/** "Ride TT-46K7HM · Sat, Nov 14, 10:00 AM · 2513 Pruitt St to 1000 Blythe Blvd · 1 rider". */
function tripSummaryFor(row: Record<string, unknown>): string {
  const street = (a: unknown) => (typeof a === 'string' ? a.split(',')[0]!.trim() : '');
  const when =
    typeof row.requested_at === 'string' && !Number.isNaN(Date.parse(row.requested_at))
      ? new Date(row.requested_at).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
  const from = street(row.pickup_address);
  const to = street(row.dropoff_address);
  const count = typeof row.passengers === 'number' && row.passengers > 1 ? `${row.passengers} travelling` : '';
  return [`Ride ${row.confirmation_code}`, when, from && to ? `${from} to ${to}` : '', count].filter(Boolean).join(' · ');
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
    .select('id, service_line, status, confirmation_code, agreed_cents, payment_status, stripe_payment_link_id, receipt_token, contact_email, requested_at, pickup_address, dropoff_address, passengers, is_test_data')
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
  // A test booking pays in Stripe test mode (lib/stripe-mode.ts). The Payment Link was made in the
  // same mode at confirmation, so the fallback has to look it up there too.
  const mode = stripeModeForTrip(row as { is_test_data?: unknown });

  // The amount is what the Payment Link recorded, so the webhook's amount check agrees with it.
  const attempt = linkId ? await findPaymentAttempt(db, linkId) : null;
  const amountCents = attempt?.status === 'active' ? attempt.amount_cents : (row.agreed_cents as number | null);

  /**
   * Mint a replacement Payment Link for this trip, same amount, same metadata.
   *
   * Only ever called when Stripe has said the stored link is INACTIVE — a link
   * that cannot be paid — so the trip never has two live links at once (the
   * double-payment trap confirmTrip's comment warns about; the webhook's
   * double-payment guard stands behind this too). The dead link's attempt is
   * superseded and the new one recorded, so the webhook's amount check reads
   * the link that can actually be paid, and the row points at the new link
   * from now on. Best effort throughout: any failure returns null and the
   * caller shows the call-us page, exactly as before.
   */
  const healPaymentLink = async (): Promise<string | null> => {
    if (!amountCents || !row.confirmation_code) return null;
    try {
      const link = await withStripeMode(mode, () =>
        createTripPaymentLink({
          amountCents,
          serviceName: serviceShortName(row.service_line as string),
          confirmationCode: row.confirmation_code as string,
          tripRequestId: row.id as string,
          serviceLine: row.service_line as string,
          receiptUrl: receiptUrlFor(token),
        }),
      );
      if (attempt) {
        await closePaymentAttempt(db, attempt.id, 'superseded', 'Stored payment link inactive; replaced from /pay.');
      }
      await recordPaymentAttempt(db, { tripId: row.id as string, linkId: link.id, amountCents });
      await db
        .from(TRIP_REQUESTS_TABLE)
        .update({ stripe_payment_link_id: link.id })
        .eq('id', row.id as string);
      return link.url;
    } catch (e) {
      console.error('[pay] could not mint a replacement payment link:', e);
      return null;
    }
  };

  const fallback = async () => {
    if (linkId) {
      const url = await withStripeMode(mode, () => paymentLinkUrl(linkId));
      if (url) return go(url);
      // No URL: either the lookup failed (proves nothing — show the call-us
      // page) or Stripe has deactivated the stored link. Only the second is
      // healed, by minting a fresh link, so this address keeps working for as
      // long as the trip is unpaid instead of dying with the old link.
      const state = await withStripeMode(mode, () => paymentLinkState(linkId));
      if (state === 'inactive') {
        const healed = await healPaymentLink();
        if (healed) return go(healed);
      }
    }
    return new NextResponse('This payment link is not available. Please call (704) 941-8508.', { status: 410, headers: NO_STORE });
  };

  if (!amountCents || !row.confirmation_code) return fallback();
  if (attempt && attempt.status !== 'active') return fallback();

  try {
    const session = await withStripeMode(mode, () => createBrandedCheckout({
      amountCents,
      serviceName: serviceShortName(row.service_line as string),
      confirmationCode: row.confirmation_code as string,
      tripRequestId: row.id as string,
      serviceLine: row.service_line as string,
      paymentLinkId: linkId,
      successUrl: receiptUrlFor(token),
      cancelUrl: payPageUrlFor(token),
      logoUrl: brandLogoUrl(),
      customerEmail: (row.contact_email as string | null) ?? null,
      tripSummary: tripSummaryFor(row),
    }));
    return go(session.url);
  } catch (e) {
    console.error('[pay] branded checkout failed, using the payment link:', e);
    return fallback();
  }
}
