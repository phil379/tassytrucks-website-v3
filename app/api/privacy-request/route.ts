import { NextResponse } from 'next/server';
import {
  PRIVACY_REQUESTS_TABLE,
  RESPONSE_DAYS,
  STORE_PRIVACY_REQUESTS,
  privacyRequestSchema,
  requestTypeLabel,
} from '@/lib/privacy-requests';
import { newReference } from '@/lib/privacy-reference';
import { sendPrivacyRequestEmails } from '@/lib/notifications';
import { businessIdentityLine } from '@/lib/business';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUESTS_PER_IP_PER_HOUR = Number(process.env.PRIVACY_REQUEST_RATE_LIMIT) || 5;
const MIN_FILL_MS = 3_000;

/**
 * POST /api/privacy-request
 *
 * Emails the operator, sends the requester a receipt with a reference number, and (only once
 * STORE_PRIVACY_REQUESTS is true) stores the request. It never deletes or changes anything.
 * It never says "received" unless the operator email went out or the row was stored.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a JSON body.' }, { status: 400 });
  }
  const raw = (body ?? {}) as Record<string, unknown>;

  // Bot checks: hidden field, and a form filled in impossibly fast. 200 with no reference so a script learns nothing.
  const trippedHoneypot = typeof raw.hp_token === 'string' && raw.hp_token.trim() !== '';
  const elapsed = typeof raw.elapsedMs === 'number' ? raw.elapsedMs : null;
  if (trippedHoneypot || (elapsed !== null && elapsed < MIN_FILL_MS)) {
    return NextResponse.json({ ok: true, reference: null });
  }

  const limit = rateLimit(`privacy-request:${clientIp(request.headers)}`, REQUESTS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please email book@tassytrucks.com or call (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = privacyRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: 'Please check the form.', fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const reference = newReference();

  let stored = false;
  if (STORE_PRIVACY_REQUESTS) {
    const due = new Date(Date.now() + RESPONSE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin()
      .from(PRIVACY_REQUESTS_TABLE)
      .insert({
        reference,
        requester_name: d.name,
        requester_email: d.email || null,
        requester_phone: d.phone || null,
        request_type: d.requestType,
        details: d.details || null,
        due_at: due,
      });
    if (error) console.error('[privacy-request] insert failed (email still sent):', error.message);
    else stored = true;
  }

  let emailed = true;
  try {
    await sendPrivacyRequestEmails({
      reference,
      name: d.name,
      email: d.email,
      phone: d.phone,
      typeLabel: requestTypeLabel(d.requestType),
      details: d.details,
      responseDays: RESPONSE_DAYS,
      identityLine: businessIdentityLine(),
    });
  } catch (err) {
    emailed = false;
    console.error('[privacy-request] operator email failed for', reference, err instanceof Error ? err.message : err);
  }

  if (!emailed && !stored) {
    return NextResponse.json(
      { ok: false, error: 'We could not send your request. Please email book@tassytrucks.com or call (704) 941-8508 and we will handle it.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, reference, responseDays: RESPONSE_DAYS, receiptEmailed: Boolean(d.email) && emailed });
}
