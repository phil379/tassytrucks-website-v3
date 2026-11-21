import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  CAREERS_INTEREST_STATUS,
  careersInterestSchema,
  careersRoleLabel,
} from '@/lib/careers-interest';
import { looksLikeTestIdentity } from '@/lib/test-data';
import { notifyOperatorCareersInterest } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUESTS_PER_IP_PER_HOUR = Number(process.env.CAREERS_INTEREST_RATE_LIMIT) || 5;
/** A short form still takes a person a few seconds. Below this, it's a script. */
const MIN_FILL_MS = 3_000;

/**
 * POST /api/careers-interest -- the Careers interest list.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS ROUTE STORES A LEAD IN THE OPERATOR'S INBOX. IT DOES NOTHING ELSE.
 *
 * Applications are closed until the pro bono driver agreement and the
 * insurance setup are final (Phil, 2026-11-21 — see lib/careers-gate.ts).
 * This route never creates an application, never touches the SaaS
 * applicant system, and never returns a job, an interview or a start date.
 *
 * STORAGE GAP: no careers-interest table exists, so — until Phil approves
 * and applies one — the lead's record is the operator notification itself:
 * notifyOperatorCareersInterest emails the full lead to OPERATOR_EMAIL
 * (plus ntfy/Zapier legs) under the reference this route generates and
 * returns. THE INSERT GOES HERE when a table lands: replace the
 * notification-only capture with the insert first and the notification
 * second, exactly like /api/school-household-request. Same architecture
 * as /api/winnie-waitlist, which sits in the same position.
 *
 * Failure rule, same as the household route: if the capture cannot happen,
 * the route answers a failure. There is no success shape reachable from an
 * error.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a JSON body.' }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;

  // Bot checks, same shape as /api/winnie-waitlist. 200 with a null id so a
  // script learns nothing -- and the CLIENT treats a null id as a failure.
  const trippedHoneypot = typeof raw.hp_token === 'string' && raw.hp_token.trim() !== '';
  const elapsed = typeof raw.elapsedMs === 'number' ? raw.elapsedMs : null;
  const submittedTooFast = elapsed !== null && elapsed < MIN_FILL_MS;

  if (trippedHoneypot || submittedTooFast) {
    console.warn(
      `[careers-interest] discarded as bot: honeypot=${trippedHoneypot} elapsedMs=${elapsed ?? 'absent'}`,
    );
    return NextResponse.json({ ok: true, id: null, stored: false });
  }

  const ip = clientIp(request.headers);
  const limit = rateLimit(`careers-interest:${ip}`, REQUESTS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please call us at (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = careersInterestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: 'Please check the form.', fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const phone = d.phone?.trim() ? d.phone.trim() : null;

  // The lead's reference. Today it keys the operator email (there is no
  // table yet — see the banner); when a careers-interest table lands, the
  // row id replaces it.
  const leadId = randomUUID();

  // The capture IS this notification until the table exists, so it is
  // awaited (not fire-and-forget): a serverless function can be frozen on
  // respond. notifyOperatorCareersInterest never throws; its legs are
  // all-settled inside, and each email attempt leaves a notification_log
  // row (lib/email-log.ts), so a dead leg is traceable, not silent.
  await notifyOperatorCareersInterest({
    id: leadId,
    fullName: d.full_name,
    email: d.email,
    phone,
    role: careersRoleLabel(d.role),
    isTestData: looksLikeTestIdentity(d.email),
  });

  // No job, interview or start date -- by design.
  return NextResponse.json({ ok: true, id: leadId, status: CAREERS_INTEREST_STATUS }, { status: 200 });
}
