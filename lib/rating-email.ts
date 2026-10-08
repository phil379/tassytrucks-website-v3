import { serviceShortName } from '@/lib/trip-request';

/**
 * The post-ride RATING request — a one-tap smiley.
 *
 * Sent when a dispatcher advances a trip to `completed`. Three faces, each a
 * plain link to /rate; the tap IS the vote. No login, no app. The score maps to
 * an integer in tassy_archive.trip_ratings (bad=1, ok=3, great=5) so a simple
 * average still reads like a 1-5.
 *
 * Email-safe like the other templates: tables, inline styles, hex, 600px, and a
 * plain-text alternative.
 */

const GOLD = '#C8A253';
const INK = '#1B1A17';
const PAPER = '#FBF8F1';
const LINE = '#E3DCCB';
const MUTE = '#6B6455';
const GREEN = '#2E7D32';
const RED = '#B3492F';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app';
const LOGO = `${SITE}/brand/logo-master.png`;

export type RatingEmailData = {
  tripId: string;
  tripNumber?: string | null;
  driverName?: string | null;
  serviceLine: string;
  contactFirstName?: string | null;
  contactName?: string | null;
};

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rateUrl(tripId: string, score: 'bad' | 'ok' | 'great'): string {
  return `${SITE}/rate?t=${encodeURIComponent(tripId)}&s=${score}`;
}

function face(href: string, emoji: string, label: string, bg: string, border: string, txt: string): string {
  return `<td align="center" width="33%" style="padding:6px;">
    <a href="${href}" style="display:block;text-decoration:none;background:${bg};border:1.5px solid ${border};border-radius:14px;padding:18px 6px;">
      <div style="font-size:40px;line-height:1;">${emoji}</div>
      <div style="margin-top:8px;font-size:13px;font-weight:700;color:${txt};font-family:-apple-system,Helvetica,Arial,sans-serif;">${label}</div>
    </a></td>`;
}

export function ratingSubject(d: RatingEmailData): string {
  const ref = d.tripNumber ? ` (${d.tripNumber})` : '';
  return `How was your Tassy trip${ref}?`;
}

export function ratingHtml(d: RatingEmailData): string {
  const driver = d.driverName ? esc(d.driverName) : 'your driver';
  const ref = d.tripNumber ? esc(d.tripNumber) : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>How was your trip?</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0"
  style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid ${LINE};border-radius:14px;overflow:hidden;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <tr><td style="background:${INK};padding:20px 28px;text-align:center;">
    <img src="${LOGO}" width="140" alt="Tassy Transportation" style="display:inline-block;width:140px;height:auto;">
    <div style="color:${GOLD};font-size:12px;font-style:italic;margin-top:6px;">We Transport With Care.</div>
  </td></tr>

  <tr><td style="padding:30px 28px 6px;text-align:center;">
    <h1 style="margin:0 0 8px;font-size:26px;line-height:1.25;color:${INK};font-weight:600;">How was your trip?</h1>
    <p style="margin:0;color:${MUTE};font-size:15px;line-height:1.55;">
      ${ref ? `Trip <b style="color:${INK};">${ref}</b> with <b style="color:${INK};">${driver}</b>.<br>` : `Your recent trip with <b style="color:${INK};">${driver}</b>.<br>`}
      One tap tells us how ${d.driverName ? esc(d.driverName) : 'they'} did — that's it.
    </p>
  </td></tr>

  <tr><td style="padding:18px 20px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${face(rateUrl(d.tripId, 'bad'), '&#128542;', 'Not great', 'rgba(179,73,47,0.08)', RED, RED)}
      ${face(rateUrl(d.tripId, 'ok'), '&#128528;', 'Okay', 'rgba(200,162,83,0.10)', GOLD, '#7A5F1E')}
      ${face(rateUrl(d.tripId, 'great'), '&#128512;', 'Awesome', 'rgba(46,125,50,0.10)', GREEN, GREEN)}
    </tr></table>
  </td></tr>

  <tr><td style="padding:14px 28px 28px;text-align:center;">
    <p style="margin:0;color:${MUTE};font-size:13px;line-height:1.55;">
      We read every one. Your feedback is how we keep the good drivers and coach the rest.
    </p>
  </td></tr>

  <tr><td style="background:${INK};padding:22px 28px;text-align:center;">
    <div style="color:#FFFFFF;font-size:14px;font-weight:600;">Tassy Transportation</div>
    <div style="color:${MUTE};font-size:12px;margin-top:6px;line-height:1.7;">
      Charlotte, NC &middot; <a href="tel:+17049418508" style="color:${GOLD};text-decoration:none;">(704) 941-8508</a> &middot;
      <a href="mailto:book@tassytrucks.com" style="color:${GOLD};text-decoration:none;">book@tassytrucks.com</a>
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export function ratingText(d: RatingEmailData): string {
  const ref = d.tripNumber ? ` (${d.tripNumber})` : '';
  return [
    `How was your Tassy trip${ref}?`,
    ``,
    `One tap tells us how ${d.driverName ?? 'your driver'} did:`,
    `  Awesome: ${rateUrl(d.tripId, 'great')}`,
    `  Okay:    ${rateUrl(d.tripId, 'ok')}`,
    `  Not great: ${rateUrl(d.tripId, 'bad')}`,
    ``,
    `Tassy Transportation · (704) 941-8508`,
  ].join('\n');
}
