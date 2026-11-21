import { serviceShortName, type ServiceLine } from '@/lib/trip-request';
import { emailFooterHtml, emailFooterText } from '@/lib/business';
import { CANCELLATION } from '@/lib/refund-policy';
import { ESCORT_CENTS, escortAvailable, surchargesFor } from '@/lib/quote';
import { STOP_FEE_CENTS, STOP_INCLUDED_WAIT_MINUTES } from '@/lib/stops';

/**
 * The paid-trip RECEIPT.
 *
 * One card, two homes: the email the Stripe webhook sends the moment a trip is marked paid, and the
 * private web page at /r/<token> (app/r/[token]/page.tsx) that the email, the Stripe "after payment"
 * redirect and the rider text all point to. Both render receiptCardHtml(), so what the customer saves
 * from the page is exactly what was emailed.
 *
 * Email-safe rules: tables not flexbox, inline styles only, hex colours, 640px, and a full plain-text
 * alternative. Only "Charlotte, NC" is shown as our address — no street address.
 */

const GOLD = '#C8A253';
const GOLD_TEXT = '#9A6B12';
const INK = '#1B1A17';
const LINE = '#E3DCCB';
const MUTE = '#6B6455';
const GREEN = '#2E7D32';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app').replace(/\/+$/, '');
const LOGO = `${SITE}/brand/logo-receipt.png`;

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
  /** "Visa •••• 4242" — omitted from the receipt when Stripe could not tell us. */
  paymentMethodLabel?: string | null;
  /** The private /r/<token> page. Omitted from the receipt when no token could be issued. */
  receiptUrl?: string | null;
  /**
   * The full journey, from the stored row (Phil, 2026-11-21: the receipt must
   * state pickup, stop and drop-off, and cover BOTH legs of a round trip).
   * A return trip starts at the outbound drop-off and ends back at the pickup.
   */
  returnTrip?: boolean | null;
  returnAt?: string | null;
  stopAddress?: string | null;
  returnStopAddress?: string | null;
  /** The per-leg stop fees the stored estimate charged (stop_fee_cents columns). */
  stopFeeCents?: number | null;
  returnStopFeeCents?: number | null;
  /**
   * The stored system estimate the price came from. The money breakdown is
   * only itemised when the amount paid IS that estimate (see
   * receiptPriceLines) — a dispatcher-set price is shown as one line, never
   * reverse-engineered into components it may not contain.
   */
  estimateLowCents?: number | null;
  estimateHighCents?: number | null;
  /** Recovery escort, from the validated trip details (trip_details.escort). */
  escort?: boolean | null;
  discountLabel?: string | null;
  discountCents?: number | null;
  /** A listed-hotel flat price (a hotel_slug is stored): no band, no surcharges. */
  hotelFlat?: boolean | null;
};

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Dollars AND cents — a receipt shows $49.00, not the rounded "$49" the marketing site uses. */
export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TZ = 'America/New_York';

/** "Mon, Oct 19, 2026 · 10:00 a.m." */
export function fmtPickup(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ,
  });
  const time = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
    .replace(' AM', ' a.m.')
    .replace(' PM', ' p.m.');
  return `${day} · ${time}`;
}

/** "Oct 16, 2026" */
export function fmtDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ,
  });
}

export type ReceiptJourneyStep = {
  label: string;
  address: string;
  /** ISO instant for the steps that carry a time (pickup, return pickup). */
  when?: string | null;
};

/**
 * The whole journey in order, from the stored row: pickup -> (stop) ->
 * drop-off, and for a round trip the way back: return pickup at the outbound
 * drop-off -> (stop) -> final drop-off back at the pickup address. Empty when
 * the row lacks either end — the receipt then keeps its plain Pickup /
 * Destination lines rather than printing a half-built itinerary.
 */
export function receiptJourney(r: ReceiptData): ReceiptJourneyStep[] {
  const pickup = r.pickupAddress?.trim();
  const dropoff = r.dropoffAddress?.trim();
  if (!pickup || !dropoff) return [];
  const steps: ReceiptJourneyStep[] = [
    { label: 'Pickup', address: pickup, when: r.requestedAt ?? null },
  ];
  const stop = r.stopAddress?.trim();
  if (stop) steps.push({ label: 'Stop on the way', address: stop });
  steps.push({ label: 'Drop-off', address: dropoff });
  if (r.returnTrip) {
    steps.push({ label: 'Return pickup', address: dropoff, when: r.returnAt ?? null });
    const back = r.returnStopAddress?.trim();
    if (back) steps.push({ label: 'Stop on the way back', address: back });
    steps.push({ label: 'Final drop-off', address: pickup });
  }
  return steps;
}

/** True when the journey says more than the plain Pickup / Destination lines. */
export function receiptHasJourneyDetail(r: ReceiptData): boolean {
  return Boolean(r.returnTrip || r.stopAddress?.trim() || r.returnStopAddress?.trim());
}

export type ReceiptPriceLine = {
  label: string;
  note?: string | null;
  cents: number;
};

/**
 * The itemised charges, footing exactly to amountCents — or null, meaning
 * "show the single ride line, as before".
 *
 * Honesty rules (Phil's transparency standard cuts both ways — an invented
 * breakdown is worse than none):
 *  - A hotel flat price is one line and says so; it has no band or surcharges.
 *  - Itemisation only happens when the amount paid is the system's own stored
 *    estimate (within estimate_low..estimate_high). A dispatcher-set agreed
 *    price may bundle anything, so it stays one line.
 *  - Stop fees come from the stored per-leg fee columns (the flat constant
 *    when a pre-column row has the address but no fee recorded).
 *  - Surcharges are re-derived with the quote engine's own surchargesFor()
 *    from the stored pickup time and line — the same function that priced
 *    the booking, so the labels and amounts cannot drift from the card.
 *  - The escort is the stored trip-details flag priced at the card constant.
 *  - The ride fare is what remains; if nothing positive remains, the
 *    components do not describe this price and we fall back to one line.
 *  - Extra passengers are NOT a line: the row stores a headcount, not the
 *    charge, and an accompanied minor changes the arithmetic — any
 *    extra-passenger charge stays inside the ride fare line.
 */
export function receiptPriceLines(r: ReceiptData): ReceiptPriceLine[] | null {
  if (!(r.amountCents > 0)) return null;
  const name = serviceShortName(r.serviceLine);
  if (r.hotelFlat) {
    return [
      {
        label: `${name} ride`,
        note: 'Flat hotel price · same price at any hour, any day',
        cents: r.amountCents,
      },
    ];
  }
  const low = r.estimateLowCents;
  const high = r.estimateHighCents;
  if (low == null || high == null || r.amountCents < low || r.amountCents > high) return null;

  const components: ReceiptPriceLine[] = [];
  for (const s of surchargesFor(r.requestedAt, r.serviceLine as ServiceLine)) {
    components.push({ label: s.label, cents: s.cents });
  }
  if (r.stopAddress?.trim()) {
    components.push({
      label: `Stop fee on the way (${STOP_INCLUDED_WAIT_MINUTES} min waiting included)`,
      cents: r.stopFeeCents ?? STOP_FEE_CENTS,
    });
  }
  if (r.returnStopAddress?.trim()) {
    components.push({
      label: `Stop fee on the way back (${STOP_INCLUDED_WAIT_MINUTES} min waiting included)`,
      cents: r.returnStopFeeCents ?? STOP_FEE_CENTS,
    });
  }
  if (r.escort && escortAvailable(r.serviceLine)) {
    components.push({ label: 'Tassy Escort', cents: ESCORT_CENTS });
  }
  const discount = r.discountCents ?? 0;
  if (discount > 0) {
    components.push({
      label: r.discountLabel ? `Discount — ${r.discountLabel}` : 'Discount',
      cents: -discount,
    });
  }
  if (components.length === 0) return null;
  const fare = r.amountCents - components.reduce((sum, c) => sum + c.cents, 0);
  if (fare <= 0) return null;
  return [
    { label: `${name} ride`, note: 'Agreed price, not metered', cents: fare },
    ...components,
  ];
}

/** "-$5.00" for a negative line, money() otherwise. */
function moneySigned(cents: number): string {
  return cents < 0 ? `-${money(-cents)}` : money(cents);
}

function kv(label: string, value: string): string {
  return `<tr><td style="padding:5px 0;color:${MUTE};font-size:14px;width:38%;vertical-align:top;">${esc(label)}</td><td style="padding:5px 0;color:${INK};font-size:14px;text-align:right;vertical-align:top;">${value}</td></tr>`;
}

function rule(top: number): string {
  return `<tr><td style="padding:${top}px 32px 0;"><div style="border-top:1px solid ${LINE};"></div></td></tr>`;
}

export function receiptSubject(r: ReceiptData): string {
  const ref = r.tripNumber ? ` — ${r.tripNumber}` : '';
  return `Receipt — ${serviceShortName(r.serviceLine)}${ref} — ${money(r.amountCents)} paid`;
}

/** The receipt card itself (approved layout). Used inside the email and on the web page. */
export function receiptCardHtml(r: ReceiptData): string {
  const name = serviceShortName(r.serviceLine);
  const ref = r.tripNumber || r.confirmationCode || '—';
  const total = money(r.amountCents);
  const paidWith = r.paymentMethodLabel
    ? `<div>Paid with ${esc(r.paymentMethodLabel)}</div>`
    : '';

  // The full journey (Phil, 2026-11-21): every point the rider is driven to,
  // in order, both legs of a round trip. Only rendered when the trip has a
  // stop or a return leg — a plain one-way receipt is unchanged.
  const journey = receiptHasJourneyDetail(r) ? receiptJourney(r) : [];
  const journeyHtml = journey.length
    ? `${rule(14)}
<tr><td style="padding:10px 32px 0;"><div style="font-size:11px;font-weight:700;letter-spacing:1.1px;margin-bottom:4px;">YOUR TRIP</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
 ${journey
   .map(
     (s) =>
       kv(
         s.label,
         `${esc(s.address)}${s.when ? `<div style="color:${MUTE};font-size:12.5px;">${esc(fmtPickup(s.when))}</div>` : ''}`,
       ),
   )
   .join('\n ')}
</table></td></tr>`
    : '';

  // Itemised charges when the stored data honestly supports them (see
  // receiptPriceLines); otherwise the single ride line, exactly as before.
  const priceLines = receiptPriceLines(r);
  const descRows = priceLines
    ? priceLines
        .map((l, i) =>
          i === 0
            ? `<tr><td style="padding:14px 0;border-bottom:1px solid ${LINE};"><div style="font-size:16px;font-weight:700;color:${INK};">${esc(l.label)}</div>${l.note ? `<div style="font-size:12px;color:${MUTE};margin-top:2px;">${esc(l.note)}</div>` : ''}</td><td style="padding:14px 0;border-bottom:1px solid ${LINE};text-align:right;font-size:16px;color:${INK};vertical-align:top;">${esc(moneySigned(l.cents))}</td></tr>`
            : `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};">${esc(l.label)}</td><td style="padding:10px 0;border-bottom:1px solid ${LINE};text-align:right;font-size:14px;color:${INK};vertical-align:top;">${esc(moneySigned(l.cents))}</td></tr>`,
        )
        .join('\n ')
    : `<tr><td style="padding:14px 0;border-bottom:1px solid ${LINE};"><div style="font-size:16px;font-weight:700;color:${INK};">${esc(name)} ride</div><div style="font-size:12px;color:${MUTE};margin-top:2px;">Agreed price, not metered</div></td><td style="padding:14px 0;border-bottom:1px solid ${LINE};text-align:right;font-size:16px;color:${INK};vertical-align:top;">${esc(total)}</td></tr>`;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:14px;background:#ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
<tr><td style="padding:28px 32px 8px;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="vertical-align:top;width:50%;">
    <img src="${LOGO}" width="150" alt="Tassy Transportation" style="display:block;width:150px;height:auto;border-radius:10px;">
    <div style="color:${GOLD_TEXT};font-size:14px;font-style:italic;font-weight:600;margin-top:8px;">We Transport With Care.</div>
  </td>
  <td style="vertical-align:top;text-align:right;">
    <div style="font-size:24px;font-weight:700;letter-spacing:-0.3px;color:${INK};">Payment receipt</div>
    <div style="color:${MUTE};font-size:14px;margin-top:4px;">${esc(ref)}</div>
    <div style="margin-top:10px;"><span style="display:inline-block;border:1.5px solid ${GREEN};color:${GREEN};border-radius:999px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:1px;">PAID</span></div>
  </td></tr></table>
</td></tr>
<tr><td style="padding:22px 32px 0;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="vertical-align:top;width:50%;font-size:14px;line-height:1.6;color:${INK};">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.1px;margin-bottom:6px;">FROM</div>
    <div style="font-weight:700;">Tassy Transportation</div>
    <div>Charlotte, NC</div>
    <div>(704) 941-8508</div>
    <div>book@tassytrucks.com</div>
  </td>
  <td style="vertical-align:top;text-align:right;font-size:14px;line-height:1.6;color:${INK};">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.1px;margin-bottom:6px;">BILLED TO</div>
    <div>${esc(r.contactName || r.contactFirstName || '')}</div>
    <div>${esc(r.contactEmail)}</div>
    <div style="height:12px;"></div>
    <div>Date ${esc(fmtDate(r.paidAt))}</div>
    ${paidWith}
  </td></tr></table>
</td></tr>
${rule(18)}
<tr><td style="padding:10px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
 ${kv('Service', esc(name))}
 ${kv('Pickup time', esc(fmtPickup(r.requestedAt)))}
 ${kv('Pickup', esc(r.pickupAddress || '—'))}
 ${kv('Destination', esc(r.dropoffAddress || '—'))}
 ${r.confirmationCode ? kv('Confirmation', esc(r.confirmationCode)) : ''}
</table></td></tr>
${journeyHtml}
${rule(14)}
<tr><td style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
 <tr><td style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.1px;color:${INK};border-bottom:2px solid ${INK};">DESCRIPTION</td><td style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.1px;color:${INK};text-align:right;border-bottom:2px solid ${INK};">AMOUNT</td></tr>
 ${descRows}
</table></td></tr>
<tr><td style="padding:6px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="width:46%;"></td><td>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:10px 0;font-size:14px;color:${MUTE};">Subtotal</td><td style="padding:10px 0;font-size:14px;color:${INK};text-align:right;">${esc(total)}</td></tr>
  <tr><td style="padding:12px 0 0;font-size:17px;font-weight:700;color:${INK};border-top:2px solid ${INK};">Total paid</td><td style="padding:12px 0 0;font-size:17px;font-weight:700;color:${INK};text-align:right;border-top:2px solid ${INK};">${esc(total)}</td></tr>
 </table></td></tr></table></td></tr>
<tr><td style="padding:18px 32px 6px;font-size:14px;line-height:1.55;color:${INK};">
 <p style="margin:0 0 10px;">Need to change or cancel? Call us. No fee if you let us know at least ${CANCELLATION.trip.freeUntilHoursBefore} hours ahead.</p>
 <p style="margin:0;">Card only. We never ask for payment details over the phone.</p>
</td></tr>
${rule(12)}
<tr><td style="padding:14px 32px 26px;font-size:12.5px;line-height:1.6;color:${INK};">
 Questions about this receipt? Call (704) 941-8508 or email book@tassytrucks.com.<br>
 Tassy Transportation &middot; Charlotte, NC &middot; Operated by Tassy Trucks LLC<br>
 Disabled Veteran-Owned &middot; SBE / DBE / MBE Certified<br>
 Keep this receipt for your records.
 ${emailFooterHtml('#5F6773')}
</td></tr>
</table>`;
}

function firstName(r: ReceiptData): string {
  return r.contactFirstName || (r.contactName ?? '').split(' ')[0] || 'there';
}

export function receiptHtml(r: ReceiptData): string {
  const day = r.requestedAt
    ? new Date(r.requestedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ })
    : null;
  const link = r.receiptUrl
    ? `<p style="margin:14px 0 0;"><a href="${esc(r.receiptUrl)}" style="display:inline-block;background:${GOLD};color:${INK};font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;padding:12px 20px;">View or save this receipt online</a></p>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Tassy Transportation receipt</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Paid ${esc(money(r.amountCents))}${r.tripNumber ? ` · ${esc(r.tripNumber)}` : ''}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
<tr><td style="padding:0 4px 18px;font-size:16px;line-height:1.55;">
<p style="margin:0 0 12px;">Hi ${esc(firstName(r))},</p>
<p style="margin:0;">Payment received.${day ? ` You are booked for ${esc(day)}.` : ''} Your receipt is below.</p>
${link}
</td></tr>
<tr><td>${receiptCardHtml(r)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function receiptText(r: ReceiptData): string {
  const ref = r.tripNumber || r.confirmationCode || '—';
  const journey = receiptHasJourneyDetail(r) ? receiptJourney(r) : [];
  const priceLines = receiptPriceLines(r);
  return [
    `Tassy Transportation — Payment receipt`,
    ``,
    `Hi ${firstName(r)}, payment received. Thank you.`,
    r.receiptUrl ? `View or save this receipt online: ${r.receiptUrl}` : ``,
    ``,
    `Trip number: ${ref}`,
    `Paid: ${money(r.amountCents)} on ${fmtDate(r.paidAt)}${r.paymentMethodLabel ? ` with ${r.paymentMethodLabel}` : ''}`,
    `Service: ${serviceShortName(r.serviceLine)}`,
    `Pickup time: ${fmtPickup(r.requestedAt)}`,
    `Pickup: ${r.pickupAddress ?? '—'}`,
    `Destination: ${r.dropoffAddress ?? '—'}`,
    r.confirmationCode ? `Confirmation: ${r.confirmationCode}` : ``,
    ...(journey.length
      ? [
          ``,
          `Your trip:`,
          ...journey.map(
            (s) => `${s.label}: ${s.address}${s.when ? ` — ${fmtPickup(s.when)}` : ''}`,
          ),
        ]
      : []),
    ...(priceLines
      ? [
          ``,
          `Charges:`,
          ...priceLines.map((l) => `${l.label}: ${moneySigned(l.cents)}`),
          `Total paid: ${money(r.amountCents)}`,
        ]
      : []),
    ``,
    `Need to change or cancel? Call (704) 941-8508. No fee if you let us know at least ${CANCELLATION.trip.freeUntilHoursBefore} hours ahead.`,
    `Card only. We never ask for payment details over the phone.`,
    ``,
    `Tassy Transportation · Charlotte, NC · Operated by Tassy Trucks LLC`,
    `Disabled Veteran-Owned · SBE / DBE / MBE Certified`,
    ``,
    ...emailFooterText(),
  ].filter((l, i, a) => l !== `` || a[i - 1] !== ``).join('\n');
}
