import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { isValidReceiptToken } from '@/lib/receipt-token';
import { receiptCardHtml, type ReceiptData } from '@/lib/receipt-email';
import { RefreshWhilePending, SaveReceiptButton } from './client';

/**
 * /r/<token> — the customer's private receipt.
 *
 * Reached from the receipt email, from Stripe's redirect right after paying, and from the rider text.
 * The token is the only key (24 random characters), the page shows nothing until Stripe's webhook has
 * marked the trip paid, it is never indexed, never cached, and sends no referrer. A bad or unknown
 * token is a plain 404 — it does not say whether the token ever existed.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your receipt · Tassy Transportation',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

const INK = '#1B1A17';
const MUTE = '#6B6455';
const LINE = '#E3DCCB';
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';

type Row = Record<string, unknown>;

function toReceipt(r: Row): ReceiptData {
  return {
    tripNumber: (r.trip_number as string | null) ?? null,
    confirmationCode: (r.confirmation_code as string | null) ?? null,
    serviceLine: r.service_line as string,
    contactFirstName: (r.contact_first_name as string | null) ?? null,
    contactName: (r.contact_name as string | null) ?? null,
    contactPhone: (r.contact_phone as string | null) ?? null,
    contactEmail: (r.contact_email as string | null) ?? '',
    pickupAddress: (r.pickup_address as string | null) ?? null,
    dropoffAddress: (r.dropoff_address as string | null) ?? null,
    requestedAt: (r.requested_at as string | null) ?? null,
    amountCents: (r.agreed_cents as number | null) ?? (r.quoted_cents as number | null) ?? 0,
    paidAt: (r.paid_at as string | null) ?? null,
    paymentMethodLabel: (r.payment_method_label as string | null) ?? null,
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: FONT, color: INK }}>
      <style>{`@media print{.no-print{display:none!important}main{padding:0!important}}`}</style>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 12px 48px' }}>{children}</div>
    </div>
  );
}

export default async function ReceiptPage({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!isValidReceiptToken(token)) notFound();

  const { data, error } = await supabaseAdmin()
    .from(TRIP_REQUESTS_TABLE)
    .select('*')
    .eq('receipt_token', token)
    .maybeSingle();
  if (error || !data) notFound();

  const row = data as unknown as Row;
  const status = String(row.payment_status ?? '');

  if (status !== 'paid') {
    const onAccount = status === 'on_account';
    return (
      <Shell>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: '28px 28px 30px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>
            {onAccount ? 'No card payment on this trip' : 'Confirming your payment…'}
          </h1>
          <p style={{ margin: 0, color: MUTE, fontSize: 15, lineHeight: 1.55 }}>
            {onAccount
              ? 'This trip is billed to the facility, so there is no card receipt. Questions? Call (704) 941-8508.'
              : 'Your receipt appears here the moment your payment is confirmed. This usually takes a few seconds. You can leave this page open.'}
          </p>
          {onAccount ? null : <RefreshWhilePending />}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div dangerouslySetInnerHTML={{ __html: receiptCardHtml(toReceipt(row)) }} />
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <SaveReceiptButton />
        <p className="no-print" style={{ margin: '12px 0 0', fontSize: 13, color: MUTE }}>
          Tip: choose &ldquo;Save as PDF&rdquo; in the print window to keep a copy on your phone.
        </p>
      </div>
    </Shell>
  );
}
