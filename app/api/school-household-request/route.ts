import { NextResponse } from 'next/server';
import {
  HOUSEHOLD_REQUESTS_TABLE,
  HOUSEHOLD_REQUEST_STATUS,
  cleanReasons,
  householdRequestSchema,
} from '@/lib/school-household';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { looksLikeTestIdentity } from '@/lib/test-data';
import { notifyOperatorHouseholdRequest } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUESTS_PER_IP_PER_HOUR = Number(process.env.SCHOOL_HOUSEHOLD_RATE_LIMIT) || 5;
/** A multi-child form takes longer than a one-field signup. Below this, it's a script. */
const MIN_FILL_MS = 5_000;

/**
 * POST /api/school-household-request -- the Custom Household Request.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS ROUTE STORES A LEAD. IT DOES NOTHING ELSE.
 *
 * It writes ONE row to scholar_household_requests with status 'pending_review'.
 * It never creates a student, a standing order or a trip request, never
 * touches Stripe (no customer, no subscription, no charge, no price lookup),
 * and never returns a price, driver, route, availability or start date. The
 * family is told a person will review it. If any of that changes, it is a
 * different feature and needs its own review.
 *
 * Same failure rule as /api/school-booking: a failed write returns a failure.
 * There is no fallback and no success shape reachable from an error.
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

  // Bot checks, same shape as /api/school-booking. 200 with a null id so a
  // script learns nothing -- and the CLIENT treats a null id as a failure.
  const trippedHoneypot = typeof raw.hp_token === 'string' && raw.hp_token.trim() !== '';
  const elapsed = typeof raw.elapsedMs === 'number' ? raw.elapsedMs : null;
  const submittedTooFast = elapsed !== null && elapsed < MIN_FILL_MS;

  if (trippedHoneypot || submittedTooFast) {
    console.warn(
      `[household-request] discarded as bot: honeypot=${trippedHoneypot} elapsedMs=${elapsed ?? 'absent'}`,
    );
    return NextResponse.json({ ok: true, id: null, stored: false });
  }

  const ip = clientIp(request.headers);
  const limit = rateLimit(`school-household:${ip}`, REQUESTS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please call us at (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = householdRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: 'Please check the form.', fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const reasons = cleanReasons(d.reasons);

  const { data: row, error } = await supabaseAdmin()
    .from(HOUSEHOLD_REQUESTS_TABLE)
    .insert({
      status: HOUSEHOLD_REQUEST_STATUS,
      guardian_name: d.guardian_name,
      email: d.email,
      phone: d.phone,
      home_address: d.home_address,
      child_count: d.child_count,
      children: d.children,
      direction: d.direction,
      desired_start: d.desired_start,
      schedule_notes: d.schedule_notes,
      friday_differs: d.friday_differs,
      friday_schedule: d.friday_differs ? d.friday_schedule?.trim() || null : null,
      extra_notes: d.extra_notes?.trim() || null,
      reasons,
      plan_interest: d.plan_interest ?? null,
      consent_contact: true,
      is_test_data: looksLikeTestIdentity(d.email),
    })
    .select('id')
    .single();

  if (error || !row?.id) {
    console.error('[household-request] insert FAILED:', error?.message ?? 'no row returned');
    return NextResponse.json(
      { ok: false, error: 'We could not save your request. Please call (704) 941-8508.' },
      { status: 500 },
    );
  }

  // Past this line the request is stored. Nothing below may change the status
  // code -- a dead alert is a delivery problem, not a lost lead. Awaited (not
  // fire-and-forget) because a serverless function can be frozen on respond.
  await notifyOperatorHouseholdRequest({
    id: row.id,
    guardianName: d.guardian_name,
    email: d.email,
    phone: d.phone,
    childCount: d.child_count,
    reasons,
    desiredStart: d.desired_start,
  });

  // No price, driver, route, availability or start date -- by design.
  return NextResponse.json({ ok: true, id: row.id, status: HOUSEHOLD_REQUEST_STATUS }, { status: 200 });
}
