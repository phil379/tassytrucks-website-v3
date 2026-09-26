import { NextResponse } from 'next/server';
import { facilitySignupSchema } from '@/lib/facility';
import { createOrFindFacility, generateFacilityMagicLink } from '@/lib/facility.server';
import { sendRichEmail } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/facility-signup — step 0 of the facility wizard.
 *
 * Order matters: validate, store, then send. The insert is the only step that
 * can fail the request; the email runs after the row exists and can never turn
 * a captured signup into a 500. Same shape as /api/trip-request, deliberately.
 */

const SIGNUPS_PER_IP_PER_HOUR = Number(process.env.FACILITY_SIGNUP_RATE_LIMIT) || 5;

/** Three seconds. No human fills two fields and clicks faster than this. */
const MIN_FILL_MS = 3_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a JSON body.' }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;

  // ───────────────────────────────────────────────────────────────────────────
  // Bot checks, carried over from the 2026-09-25 request-form fix.
  //
  // Answer 200 with a null id so a script learns nothing from the status code —
  // and the CLIENT treats a null id as a FAILURE, because a signup that was not
  // stored must never render a success screen. That exact fallback silently
  // dropped two real submissions on the booking form.
  //
  // The honeypot is `hp_token`. Never rename it to `company` or `organization`:
  // those are autofill categories and browsers fill them from the saved profile
  // even when the field is off-screen with tabIndex -1.
  // ───────────────────────────────────────────────────────────────────────────
  const trippedHoneypot = typeof raw.hp_token === 'string' && raw.hp_token.trim() !== '';
  const elapsed = typeof raw.elapsedMs === 'number' ? raw.elapsedMs : null;
  const submittedTooFast = elapsed !== null && elapsed < MIN_FILL_MS;

  if (trippedHoneypot || submittedTooFast) {
    // Logged, because a false positive costs a partner and is otherwise
    // completely invisible — the only trace would be someone saying they signed
    // up and never heard back.
    console.warn(
      `[facility-signup] discarded as bot: honeypot=${trippedHoneypot} elapsedMs=${elapsed ?? 'absent'}`,
    );
    return NextResponse.json({ ok: true, id: null, stored: false });
  }

  const ip = clientIp(request.headers);
  const limit = rateLimit(`facility-signup:${ip}`, SIGNUPS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please call us at (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = facilitySignupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: 'Please check the form.', fieldErrors }, { status: 400 });
  }

  const { facilityName, workEmail, rep } = parsed.data;
  const source = typeof raw.source === 'string' ? raw.source.slice(0, 500) : null;

  let facilityId: string;
  let created: boolean;
  try {
    const result = await createOrFindFacility({ facilityName, workEmail, source, rep });
    facilityId = result.facilityId;
    created = result.created;
  } catch (err) {
    console.error('[facility-signup] INSERT FAILED:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: 'We could not save that. Please call (704) 941-8508.' },
      { status: 500 },
    );
  }

  // Past this line the signup is captured. Nothing below may change the status
  // code — a failed email is a delivery problem, not a lost account.
  let emailSent = false;
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const link = await generateFacilityMagicLink(workEmail, `${base}/facility/confirm`);

    await sendRichEmail({
      to: workEmail,
      subject: 'Finish setting up your Tassy Transportation account',
      html: welcomeHtml(facilityName, link),
      text: welcomeText(facilityName, link),
    });
    emailSent = true;
  } catch (err) {
    console.error('[facility-signup] magic link/email failed:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, id: facilityId, stored: true, created, emailSent });
}

/* ──────────────────────────────────────────────────────────────── the email */

/**
 * No account details, no link to anything but the setup page. This message may
 * be forwarded around a hospital before the right person opens it.
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
  ].join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
