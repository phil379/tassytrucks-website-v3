import { NextResponse } from 'next/server';
import { facilityByEmail, generateFacilityMagicLink } from '@/lib/facility.server';
import { sendRichEmail } from '@/lib/notifications';
import { emailIdentityText } from '@/lib/business';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/facility-signup/resend — a fresh setup link for a signup whose
 * first email never arrived (spam folder, typo'd glance at the inbox screen,
 * a Resend outage at signup time). Wired to the "Resend the link" button on
 * the Check-your-inbox screen of FacilitySignupForm.
 *
 * ANTI-ENUMERATION IS THE DESIGN. Every request that gets past the per-IP
 * limit answers the same `200 { ok: true }`, whether the address has a
 * pending signup, an active account, or no account at all — and the client
 * only ever shows the conditional sentence "If a signup is waiting for that
 * address, we've sent a fresh link." A link is actually sent ONLY when a
 * facility_users row exists for the email AND its facility is still
 * 'pending': an approved facility signs in through the normal doors, and
 * inventing setup mail for one would be wrong as well as leaky.
 *
 * Two rate limits, both on the site's in-memory limiter: per IP (same 5/hour
 * as the signup route itself) and per email (3/hour), so the button cannot
 * be used to mail-bomb one inbox from many addresses. A tripped per-email
 * limit skips the send silently — the response does not change.
 */

const RESENDS_PER_IP_PER_HOUR = Number(process.env.FACILITY_SIGNUP_RESEND_RATE_LIMIT) || 5;
const RESENDS_PER_EMAIL_PER_HOUR = 3;

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const ipLimit = rateLimit(`facility-signup-resend:${ip}`, RESENDS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please call us at (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
    );
  }

  let email = '';
  try {
    const body = (await request.json()) as Record<string, unknown> | null;
    if (typeof body?.email === 'string') email = body.email.trim().toLowerCase();
  } catch {
    // A body we cannot read names no address. The generic answer below is
    // still the right one — it promises nothing either way.
  }

  try {
    if (email.includes('@')) {
      const emailLimit = rateLimit(
        `facility-signup-resend-email:${email}`,
        RESENDS_PER_EMAIL_PER_HOUR,
        60 * 60 * 1000,
      );
      if (emailLimit.ok) {
        const found = await facilityByEmail(email);
        if (found && found.facility.status === 'pending') {
          const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
          const link = await generateFacilityMagicLink(email, `${base}/facility/confirm`);
          await sendRichEmail({
            to: email,
            subject: 'Finish setting up your Tassy Transportation account',
            html: welcomeHtml(found.facility.name, link),
            text: welcomeText(found.facility.name, link),
          });
        }
      }
    }
  } catch (err) {
    // Logged, never surfaced: the response must read the same whether the
    // lookup failed, the send failed, or there was nothing to send.
    console.error('[facility-signup-resend] failed:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}

/* ──────────────────────────────────────────────────────────────── the email */

/**
 * The same setup email POST /api/facility-signup sends on signup, kept in
 * step with welcomeHtml/welcomeText there. Duplicated rather than imported:
 * a route file's extra exports are not a safe thing to lean on, and this
 * message must not drift from the original a resend replaces.
 */
function welcomeHtml(facilityName: string, link: string): string {
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#13161B">
  <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#878D97;margin:0 0 6px">
    Tassy Transportation
  </p>
  <h1 style="font-size:22px;margin:0 0 16px">Finish setting up ${escapeHtml(facilityName)}</h1>
  <p style="line-height:1.6;margin:0 0 20px">
    Use the button below to finish your account. It takes about two minutes and
    there is no password to remember.
  </p>
  <p style="margin:0 0 24px">
    <a href="${link}" style="display:inline-block;background:#C8A96A;color:#13161B;
       text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">
      Finish setup
    </a>
  </p>
  <p style="line-height:1.6;color:#5F6773;font-size:13px;margin:0 0 8px">
    This link works once and expires. If it has, reply to this email and we will send another.
  </p>
  <p style="line-height:1.6;color:#5F6773;font-size:13px;margin:0">
    Prefer to talk it through? Call dispatch on (704) 941-8508.
  </p>
  <p style="line-height:1.6;color:#878D97;font-size:12px;margin:16px 0 0">${emailIdentityText()}</p>
</div>`.trim();
}

function welcomeText(facilityName: string, link: string): string {
  return [
    `Finish setting up ${facilityName}`,
    '',
    'Use the link below to finish your Tassy Transportation account. It takes',
    'about two minutes and there is no password to remember.',
    '',
    link,
    '',
    'This link works once and expires. If it has, reply and we will send another.',
    'Prefer to talk it through? Call dispatch on (704) 941-8508.',
    '',
    emailIdentityText(),
  ].join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
