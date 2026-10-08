import { formatUsd } from '@/lib/quote';
import { serviceShortName } from '@/lib/trip-request';

/**
 * The paid-trip RECEIPT.
 *
 * Sent by the Stripe webhook the moment a trip is marked paid. Until this
 * existed, a customer who paid got nothing back from us — only the operator was
 * told. This is the branded record they keep.
 *
 * Same email-safe rules as confirmation-email.ts: tables not flexbox, inline
 * styles only, hex colours, 600px, and a full plain-text alternative.
 */

const GOLD = '#C8A253';
const INK = '#1B1A17';
const PAPER = '#FBF8F1';
const LINE = '#E3DCCB';
const MUTE = '#6B6455';
const GREEN = '#2E7D32';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app';
const LOGO = `${SITE}/brand/logo-master.png`;

export type ReceiptData = {
  tripNumber?: string | null;
  confirmationCode?: string | null;
  serviceLine: string;
  contactFirstName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  requestedAt?: string | null;
  amountCents: number;
  paidAt?: string | null;
};

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

function fmtDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

function row(label: string, value: string, strong = false): string {
  return `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${LINE};color:${MUTE};font-size:13px;
                 vertical-align:top;width:40%;">${esc(label)}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${LINE};color:${INK};font-size:15px;
                 vertical-align:top;font-weight:${strong ? '700' : '500'};">${value}</td>
    </tr>`;
}

function section(txt: string): string {
  return `<tr><td colspan="2" style="padding:18px 0 6px;color:${GOLD};font-size:11px;font-weight:700;
          letter-spacing:0.9px;text-transform:uppercase;border-bottom:2px solid ${GOLD};">${esc(txt)}</td></tr>`;
}

export function receiptSubject(r: ReceiptData): string {
  const ref = r.tripNumber ? ` — ${r.tripNumber}` : '';
  return `Receipt — ${serviceShortName(r.serviceLine)}${ref} — ${formatUsd(r.amountCents)} paid`;
}

export function receiptHtml(r: ReceiptData): string {
  const first = r.contactFirstName || (r.contactName ?? '').split(' ')[0] || 'there';
  const price = formatUsd(r.amountCents);
  const tripRef = r.tripNumber ? esc(r.tripNumber) : esc(r.confirmationCode ?? '—');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Tassy Transportation receipt</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Paid ${esc(price)} · ${tripRef}
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0"
  style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid ${LINE};border-radius:14px;overflow:hidden;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <tr><td style="background:${INK};padding:20px 28px;text-align:center;">
    <img src="${LOGO}" width="140" alt="Tassy Transportation" style="display:inline-block;width:140px;height:auto;">
    <div style="color:${GOLD};font-size:12px;font-style:italic;margin-top:6px;">We Transport With Care.</div>
  </td></tr>

  <tr><td style="background:${PAPER};border-bottom:1px solid ${LINE};padding:14px 28px;">
    <table role="presentation" width="100%"><tr>
      <td style="vertical-align:middle;">
        <span style="color:${MUTE};font-size:11px;text-transform:uppercase;letter-spacing:0.7px;">Trip number</span><br>
        <span style="color:${INK};font-size:20px;font-weight:700;letter-spacing:0.5px;">${tripRef}</span>
      </td>
      <td style="vertical-align:middle;text-align:right;">
        <span style="display:inline-block;background:rgba(46,125,50,0.10);color:${GREEN};border:1px solid ${GREEN};
              border-radius:999px;padding:5px 14px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">&#10003; Paid</span>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 28px 2px;">
    <h1 style="margin:0 0 4px;font-size:24px;line-height:1.25;color:${INK};font-weight:600;">Payment received — thank you, ${esc(first)}.</h1>
    <p style="margin:0;color:${MUTE};font-size:15px;line-height:1.55;">Your receipt for your ${esc(serviceShortName(r.serviceLine))} trip. Keep it for your records.</p>
  </td></tr>

  <tr><td style="padding:16px 28px 4px;">
    <table role="presentation" width="100%" style="background:${PAPER};border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:18px 22px;">
        <div style="color:${MUTE};font-size:12px;text-transform:uppercase;letter-spacing:0.6px;">Amount paid</div>
        <div style="color:${INK};font-size:34px;font-weight:700;margin-top:2px;">${esc(price)}</div>
        <div style="color:${GOLD};font-size:13px;font-weight:600;margin-top:2px;">Paid ${esc(fmtDate(r.paidAt))}</div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:4px 28px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${section('Billed to')}
      ${row('Name', esc(r.contactName || first))}
      ${row('Phone', esc(r.contactPhone))}
      ${row('Email', esc(r.contactEmail))}
      ${section('Trip')}
      ${r.tripNumber ? row('Trip number', `<b>${esc(r.tripNumber)}</b>`) : ''}
      ${row('Service', esc(serviceShortName(r.serviceLine)))}
      ${row('Date &amp; time', esc(fmtWhen(r.requestedAt)))}
      ${row('From', esc(r.pickupAddress))}
      ${row('To', esc(r.dropoffAddress))}
      ${r.confirmationCode ? row('Payment confirmation', esc(r.confirmationCode)) : ''}
      ${row('Total paid', `<span style="color:${GREEN};">${esc(price)}</span>`, true)}
    </table>
  </td></tr>

  <tr><td style="padding:12px 28px 24px;">
    <table role="presentation" width="100%" style="background:rgba(200,162,83,0.10);border:1px solid ${GOLD};border-radius:12px;">
      <tr><td style="padding:16px 20px;color:${INK};font-size:14px;line-height:1.55;">
        Questions about this trip? Quote <b>${tripRef}</b> to dispatch at
        <a href="tel:+17049418508" style="color:${INK};font-weight:700;text-decoration:none;">(704) 941-8508</a> and we'll pull it up right away.
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:${INK};padding:22px 28px;text-align:center;">
    <div style="color:#FFFFFF;font-size:14px;font-weight:600;">Tassy Transportation</div>
    <div style="color:${MUTE};font-size:12px;margin-top:6px;line-height:1.7;">
      Charlotte, NC &middot; <a href="tel:+17049418508" style="color:${GOLD};text-decoration:none;">(704) 941-8508</a> &middot;
      <a href="mailto:book@tassytrucks.com" style="color:${GOLD};text-decoration:none;">book@tassytrucks.com</a><br>
      Disabled Veteran-Owned &middot; SBE / DBE / MBE Certified &middot; 2023 HIRE Vets Medallion Gold
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export function receiptText(r: ReceiptData): string {
  const first = r.contactFirstName || (r.contactName ?? '').split(' ')[0] || 'there';
  const ref = r.tripNumber || r.confirmationCode || '—';
  return [
    `Tassy Transportation — Receipt`,
    ``,
    `Payment received — thank you, ${first}.`,
    `Trip number: ${ref}`,
    `Amount paid: ${formatUsd(r.amountCents)} (${fmtDate(r.paidAt)})`,
    ``,
    `Service: ${serviceShortName(r.serviceLine)}`,
    `When: ${fmtWhen(r.requestedAt)}`,
    `From: ${r.pickupAddress ?? '—'}`,
    `To: ${r.dropoffAddress ?? '—'}`,
    r.confirmationCode ? `Payment confirmation: ${r.confirmationCode}` : ``,
    ``,
    `Questions? Quote ${ref} to dispatch at (704) 941-8508.`,
    `Tassy Transportation · Charlotte, NC · book@tassytrucks.com`,
  ].filter(Boolean).join('\n');
}
