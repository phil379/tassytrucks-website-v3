import { serviceShortName, fullName, mobilityLabel, type TripRequestInput } from '@/lib/trip-request';
import { formatUsd } from '@/lib/quote';
import { OPERATING_TIME_ZONE } from '@/lib/time';
import { REFUNDS_URL } from '@/lib/refund-policy';
import { emailFooterHtml, emailFooterText } from '@/lib/business';

/**
 * The booking cancellation email, with the refund in it.
 *
 * This is the email a rider never got. Cancelling a paid booking in TassyOps
 * set the trip to "cancelled" and texted the rider, but sent no email and
 * issued no refund — the charge stayed "Succeeded" in Stripe and the trip
 * still read "paid". This email is sent by the refund step (lib/ops-refund.ts)
 * after the money is back: the cancellation and the refund in one message, so
 * the rider is never left guessing whether they were charged for a ride that
 * is not happening.
 *
 * Same design constraints as the confirmation email (lib/confirmation-email.ts):
 *   - Tables, not flexbox. Outlook renders neither grid nor flex.
 *   - Inline styles only. Gmail strips <style> blocks on most clients.
 *   - Every colour has a hex fallback; no CSS variables survive an email client.
 *   - A full plain-text alternative, because some hospital mail systems strip
 *     HTML entirely and the refund amount has to survive that.
 *   - 600px wide, the width every client agrees on.
 *
 * The [TEST] prefix for a test booking is added by the caller (lib/ops-refund.ts),
 * the same way the receipt email does it — never by this template.
 */

const GOLD = '#C8A253';
const INK = '#1B1A17';
const PAPER = '#FBF8F1';
const LINE = '#E3DCCB';
const MUTE = '#6B6455';

export type CancelledTrip = {
  confirmationCode: string;
  /** Human-friendly trip number (T-YYYYMMDD-NNNN). */
  tripNumber?: string | null;
  /** What was refunded, in cents. A full refund of the fare. */
  refundCents: number;
  /** Stripe refund id (re_...), for the rider to quote if they call. */
  refundId?: string | null;
};

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
    timeZone: OPERATING_TIME_ZONE,
  });
}

/** Escape anything that came from a form before it goes into HTML. */
function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};color:${MUTE};font-size:13px;
                 vertical-align:top;width:38%;">${esc(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};color:${INK};font-size:15px;
                 vertical-align:top;font-weight:500;">${esc(value)}</td>
    </tr>`;
}

export function cancellationSubject(t: CancelledTrip, data: TripRequestInput): string {
  return `Cancelled — ${serviceShortName(data.serviceLine)} ${fmtWhen(data.requestedAt)} — ${t.confirmationCode}`;
}

export function cancellationHtml(t: CancelledTrip, data: TripRequestInput): string {
  const refund = formatUsd(t.refundCents);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your trip is cancelled</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Cancelled. ${esc(t.confirmationCode)} · ${esc(refund)} refunded.
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:${PAPER};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0"
       style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid ${LINE};border-radius:14px;
              overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <tr><td style="background:${INK};padding:22px 28px;">
    <div style="color:#FFFFFF;font-size:19px;font-weight:600;letter-spacing:-0.2px;">Tassy Transportation</div>
    <div style="color:${GOLD};font-size:12px;font-style:italic;margin-top:2px;">We Transport With Care.</div>
  </td></tr>

  <tr><td style="padding:28px 28px 8px;">
    <div style="display:inline-block;background:rgba(200,162,83,0.16);color:#7A5F1E;
                border:1px solid ${GOLD};border-radius:999px;padding:5px 12px;
                font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
      Cancelled
    </div>
    <h1 style="margin:14px 0 6px;font-size:25px;line-height:1.25;color:${INK};font-weight:600;">
      Your ride is cancelled, ${esc(data.contactFirstName)}.
    </h1>
    <p style="margin:0;color:${MUTE};font-size:15px;line-height:1.55;">
      Your ${esc(serviceShortName(data.serviceLine))} trip for ${esc(fmtWhen(data.requestedAt))} has been
      cancelled. You will not be charged for it — we have refunded the full fare to the card you
      paid with. Keep this email — the confirmation number below is all we need to find you.
    </p>
  </td></tr>

  <tr><td style="padding:22px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${GOLD};border-radius:12px;background:rgba(200,162,83,0.07);">
      <tr><td style="padding:16px 20px;">
        <div style="color:${MUTE};font-size:12px;letter-spacing:0.4px;text-transform:uppercase;">
          Refunded
        </div>
        <div style="color:${INK};font-size:30px;font-weight:700;margin-top:2px;">${esc(refund)}</div>
        <p style="margin:6px 0 0;color:${MUTE};font-size:13px;line-height:1.5;">
          Refunded in full to the card you paid with. It can take 5–10 business days to appear on
          your statement, depending on your bank.
          ${t.refundId ? `Refund reference: ${esc(t.refundId)}.` : ''}
        </p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 28px 0;">
    <div style="color:${INK};font-size:13px;font-weight:700;letter-spacing:0.5px;
                text-transform:uppercase;margin-bottom:6px;">The cancelled trip</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${t.tripNumber ? row('Trip number', t.tripNumber) : ''}
      ${row('Confirmation', t.confirmationCode)}
      ${row('Pickup time', fmtWhen(data.requestedAt))}
      ${row('Pickup', data.pickupAddress)}
      ${row('Destination', data.dropoffAddress)}
      ${data.returnTrip ? row('Return pickup', fmtWhen(data.returnAt)) : ''}
      ${row('Service', serviceShortName(data.serviceLine))}
      ${row('Passengers', String(data.passengers ?? 1))}
      ${data.mobility ? row('Mobility', mobilityLabel(data.mobility)) : ''}
      ${row('Booked for', fullName(data))}
      ${row('We will call', data.contactPhone)}
    </table>
  </td></tr>

  <tr><td style="padding:24px 28px 0;">
    <div style="color:${INK};font-size:13px;font-weight:700;letter-spacing:0.5px;
                text-transform:uppercase;margin-bottom:8px;">Need another ride?</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:14px 18px;color:${INK};font-size:14px;line-height:1.65;">
        Book again on our website, or call dispatch and quote
        <strong>${esc(t.confirmationCode)}</strong> — we will have your trip on screen.
        <a href="${REFUNDS_URL}" style="color:${MUTE};">Cancellation and refund policy</a>.
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 28px 8px;" align="center">
    <a href="tel:+17049418508"
       style="display:inline-block;background:${GOLD};color:${INK};text-decoration:none;
              font-weight:700;font-size:16px;padding:15px 34px;border-radius:10px;">
      Call dispatch · (704) 941-8508
    </a>
    <p style="margin:12px 0 0;color:${MUTE};font-size:13px;">
      Quote <strong style="color:${INK};">${esc(t.confirmationCode)}</strong> and we will have your trip on screen.
    </p>
  </td></tr>

  <tr><td style="padding:22px 28px 26px;">
    <div style="border-top:1px solid ${LINE};padding-top:14px;color:${MUTE};
                font-size:12px;line-height:1.6;">
      Tassy Transportation · Charlotte, NC<br>
      Veteran-owned. SDVOSB, MBE, DBE and SBE certified.<br>
      Serving Charlotte and Mecklenburg County.
      ${emailFooterHtml(MUTE)}
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export function cancellationText(t: CancelledTrip, data: TripRequestInput): string {
  const refund = formatUsd(t.refundCents);
  const lines = [
    `Your Tassy ${serviceShortName(data.serviceLine)} trip is cancelled.`,
    ``,
    `We have cancelled your trip for ${fmtWhen(data.requestedAt)} and refunded ${refund} in full to the card you paid with. It can take 5-10 business days to appear on your statement.`,
    t.refundId ? `Refund reference: ${t.refundId}.` : ``,
    ``,
    `Confirmation: ${t.confirmationCode}`,
    t.tripNumber ? `Trip number: ${t.tripNumber}` : ``,
    `Pickup time: ${fmtWhen(data.requestedAt)}`,
    `Pickup: ${data.pickupAddress}`,
    `Destination: ${data.dropoffAddress}`,
    data.returnTrip ? `Return pickup: ${fmtWhen(data.returnAt)}` : ``,
    `Service: ${serviceShortName(data.serviceLine)}`,
    `Booked for: ${fullName(data)}`,
    `We will call: ${data.contactPhone}`,
    ``,
    `Need another ride? Book again on our website, or call dispatch at (704) 941-8508 and quote ${t.confirmationCode}.`,
    `Cancellation and refund policy: ${REFUNDS_URL}`,
    ``,
    ...emailFooterText(),
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}
