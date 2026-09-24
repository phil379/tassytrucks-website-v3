import { serviceShortName, fullName, mobilityLabel, type TripRequestInput } from '@/lib/trip-request';
import { formatUsd } from '@/lib/quote';
import { OPERATING_TIME_ZONE } from '@/lib/time';

/**
 * The booking confirmation.
 *
 * This is the email that replaces "we have your request" once a dispatcher has
 * spoken to the customer and a price is agreed. It is the first thing that
 * looks like a company rather than a person with a Gmail account, and it is the
 * document the customer will screenshot and show the front desk.
 *
 * Design constraints that are not decoration:
 *   - Tables, not flexbox. Outlook renders neither grid nor flex.
 *   - Inline styles only. Gmail strips <style> blocks on most clients.
 *   - Every colour has a hex fallback; no CSS variables survive an email client.
 *   - A full plain-text alternative, because some hospital mail systems strip
 *     HTML entirely and a caregiver must still be able to read the pickup time.
 *   - 600px wide, the width every client agrees on.
 */

const GOLD = '#C8A253';
const INK = '#1B1A17';
const PAPER = '#FBF8F1';
const LINE = '#E3DCCB';
const MUTE = '#6B6455';

export type ConfirmedTrip = {
  confirmationCode: string;
  agreedCents: number;
  /** Set only when the fare was reduced; drives the savings line. */
  discountLabel?: string | null;
  discountCents?: number | null;
  driverName?: string | null;
  vehicleDescription?: string | null;
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

export function confirmationSubject(t: ConfirmedTrip, data: TripRequestInput): string {
  return `Booked — ${serviceShortName(data.serviceLine)} ${fmtWhen(data.requestedAt)} — ${t.confirmationCode}`;
}

export function confirmationHtml(t: ConfirmedTrip, data: TripRequestInput): string {
  const price = formatUsd(t.agreedCents);
  const saved =
    t.discountCents && t.discountCents > 0
      ? `<p style="margin:6px 0 0;color:${GOLD};font-size:13px;font-weight:600;">
           ${esc(t.discountLabel ?? 'Discount')} applied — you saved ${formatUsd(t.discountCents)}
         </p>`
      : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your trip is booked</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Booked. ${esc(t.confirmationCode)} · ${esc(price)} · ${esc(fmtWhen(data.requestedAt))}
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
      Confirmed
    </div>
    <h1 style="margin:14px 0 6px;font-size:25px;line-height:1.25;color:${INK};font-weight:600;">
      You're booked, ${esc(data.contactFirstName)}.
    </h1>
    <p style="margin:0;color:${MUTE};font-size:15px;line-height:1.55;">
      A driver is assigned to your ${esc(serviceShortName(data.serviceLine))} trip. Keep this
      email — the confirmation number below is all we need to find you.
    </p>
  </td></tr>

  <tr><td style="padding:20px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:${INK};border-radius:12px;">
      <tr><td style="padding:18px 22px;" align="center">
        <div style="color:rgba(255,255,255,0.65);font-size:11px;letter-spacing:1.4px;
                    text-transform:uppercase;">Confirmation number</div>
        <div style="color:${GOLD};font-size:32px;font-weight:700;letter-spacing:3px;
                    margin-top:6px;font-family:'SFMono-Regular',Consolas,monospace;">
          ${esc(t.confirmationCode)}
        </div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:22px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${GOLD};border-radius:12px;background:rgba(200,162,83,0.07);">
      <tr><td style="padding:16px 20px;">
        <div style="color:${MUTE};font-size:12px;letter-spacing:0.4px;text-transform:uppercase;">
          Your price
        </div>
        <div style="color:${INK};font-size:30px;font-weight:700;margin-top:2px;">${esc(price)}</div>
        <p style="margin:6px 0 0;color:${MUTE};font-size:13px;line-height:1.5;">
          This is the agreed price for this trip. It does not change unless you
          change the trip. Extra wait time beyond what is included is quoted to
          you before it is charged — never after.
        </p>
        ${saved}
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 28px 0;">
    <div style="color:${INK};font-size:13px;font-weight:700;letter-spacing:0.5px;
                text-transform:uppercase;margin-bottom:6px;">Your trip</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
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
                text-transform:uppercase;margin-bottom:8px;">On the day</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:14px 18px;color:${INK};font-size:14px;line-height:1.65;">
        Your driver texts you when they are on the way, and again when they arrive.<br>
        They come to the door — you are never left to find the car.<br>
        ${t.driverName ? `Your driver is <strong>${esc(t.driverName)}</strong>.<br>` : ''}
        ${t.vehicleDescription ? `Vehicle: ${esc(t.vehicleDescription)}.<br>` : ''}
        Need to change or cancel? Call us. No fee if you let us know at least
        4 hours ahead.
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
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/** Plain-text alternative. Hospital mail systems strip HTML; the time must survive. */
export function confirmationText(t: ConfirmedTrip, data: TripRequestInput): string {
  const lines = [
    `YOU'RE BOOKED, ${data.contactFirstName.toUpperCase()}.`,
    '',
    `CONFIRMATION NUMBER:  ${t.confirmationCode}`,
    `YOUR PRICE:           ${formatUsd(t.agreedCents)}`,
  ];
  if (t.discountCents && t.discountCents > 0) {
    lines.push(
      `                      ${t.discountLabel ?? 'Discount'} applied — you saved ${formatUsd(t.discountCents)}`,
    );
  }
  lines.push(
    '',
    'This is the agreed price for this trip. It does not change unless you change',
    'the trip. Extra wait time beyond what is included is quoted to you before it',
    'is charged, never after.',
    '',
    'YOUR TRIP',
    `  Pickup time    ${fmtWhen(data.requestedAt)}`,
    `  Pickup         ${data.pickupAddress}`,
    `  Destination    ${data.dropoffAddress}`,
  );
  if (data.returnTrip) lines.push(`  Return pickup  ${fmtWhen(data.returnAt)}`);
  lines.push(
    `  Service        ${serviceShortName(data.serviceLine)}`,
    `  Passengers     ${data.passengers ?? 1}`,
  );
  if (data.mobility) lines.push(`  Mobility       ${mobilityLabel(data.mobility)}`);
  lines.push(
    `  Booked for     ${fullName(data)}`,
    `  We will call   ${data.contactPhone}`,
    '',
    'ON THE DAY',
    '  Your driver texts you when they are on the way, and again when they arrive.',
    '  They come to the door. You are never left to find the car.',
  );
  if (t.driverName) lines.push(`  Your driver is ${t.driverName}.`);
  if (t.vehicleDescription) lines.push(`  Vehicle: ${t.vehicleDescription}.`);
  lines.push(
    '  Need to change or cancel? Call us. No fee if you tell us at least 4 hours ahead.',
    '',
    `Dispatch: (704) 941-8508 — quote ${t.confirmationCode} and we will have your trip on screen.`,
    '',
    '— Tassy Transportation, Charlotte NC',
    '  Veteran-owned. SDVOSB, MBE, DBE and SBE certified.',
  );
  return lines.join('\n');
}
