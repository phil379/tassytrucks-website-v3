import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  WINNIE_WAITLIST_STATUS,
  cleanWinnieServices,
  winnieWaitlistSchema,
} from '@/lib/winnie-waitlist';
import { looksLikeTestIdentity } from '@/lib/test-data';
import { notifyOperatorWinnieWaitlist } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUESTS_PER_IP_PER_HOUR = Number(process.env.WINNIE_WAITLIST_RATE_LIMIT) || 5;
/** A short form still takes a person a few seconds. Below this, it's a script. */
const MIN_FILL_MS = 3_000;

/**
 * POST /api/winnie-waitlist -- the Winnie Ride join list.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS ROUTE STORES A LEAD IN THE OPERATOR'S INBOX. IT DOES NOTHING ELSE.
 *
 * Winnie Ride is not taking bookings until a real Winnie driver exists
 * (Phil, 2026-11-18 — the phased launch; the same flip Scholar got in
 * PR #111). This route never creates a trip request, never touches Stripe,
 * and never returns a price, driver, availability or start date.
 *
 * STORAGE GAP: Scholar's join list inserts into scholar_household_requests.
 * No Winnie table exists, and no existing table can honestly hold a pet
 * lead, so — until Phil approves and applies a `winnie_waitlist` migration
 * (see the banner in lib/winnie-waitlist.ts) — the lead's record is the
 * operator notification itself: notifyOperatorWinnieWaitlist emails the
 * full lead to OPERATOR_EMAIL (plus ntfy/Zapier legs) under the reference
 * this route generates and returns. THE INSERT GOES HERE when the table
 * lands: replace the notification-only capture with the insert first and
 * the notification second, exactly like /api/school-household-request.
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

  // Bot checks, same shape as /api/school-household-request. 200 with a null
  // id so a script learns nothing -- and the CLIENT treats a null id as a
  // failure.
  const trippedHoneypot = typeof raw.hp_token === 'string' && raw.hp_token.trim() !== '';
  const elapsed = typeof raw.elapsedMs === 'number' ? raw.elapsedMs : null;
  const submittedTooFast = elapsed !== null && elapsed < MIN_FILL_MS;

  if (trippedHoneypot || submittedTooFast) {
    console.warn(
      `[winnie-waitlist] discarded as bot: honeypot=${trippedHoneypot} elapsedMs=${elapsed ?? 'absent'}`,
    );
    return NextResponse.json({ ok: true, id: null, stored: false });
  }

  const ip = clientIp(request.headers);
  const limit = rateLimit(`winnie-waitlist:${ip}`, REQUESTS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please call us at (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = winnieWaitlistSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: 'Please check the form.', fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const services = cleanWinnieServices(d.services);
  if (services.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Please check the form.',
        fieldErrors: { services: 'Please choose at least one kind of ride' },
      },
      { status: 400 },
    );
  }

  // The lead's reference. Today it keys the operator email (there is no
  // table yet — see the banner); when the winnie_waitlist table lands, the
  // row id replaces it.
  const leadId = randomUUID();

  // The capture IS this notification until the table exists, so it is
  // awaited (not fire-and-forget): a serverless function can be frozen on
  // respond. notifyOperatorWinnieWaitlist never throws; its legs are
  // all-settled inside, and each email attempt leaves a notification_log
  // row (lib/email-log.ts), so a dead leg is traceable, not silent.
  await notifyOperatorWinnieWaitlist({
    id: leadId,
    ownerName: d.owner_name,
    email: d.email,
    phone: d.phone,
    petName: d.pet_name,
    petType: d.pet_type,
    petBasics: d.pet_basics,
    services,
    extraNotes: d.extra_notes?.trim() || null,
    isTestData: looksLikeTestIdentity(d.email),
  });

  // No price, driver, availability or start date -- by design.
  return NextResponse.json({ ok: true, id: leadId, status: WINNIE_WAITLIST_STATUS }, { status: 200 });
}
