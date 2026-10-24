import { NextResponse } from 'next/server';
import { verifyUnsubscribe } from '@/lib/unsubscribe-token';
import { suppress } from '@/lib/email-suppression';
import { notifyOperatorUnsubscribe } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/unsubscribe?t=<signed token>
 *
 * The target of the List-Unsubscribe-Post header (RFC 8058 one-click) and of the button on
 * /unsubscribe. A valid token adds the address to the do-not-email list. Until that table exists
 * the operator is emailed to add it by hand, and we only say "done" if one of the two worked.
 * It changes nothing about transactional email (a receipt for a ride you booked still arrives).
 */
export async function POST(request: Request) {
  const limit = rateLimit(`unsubscribe:${clientIp(request.headers)}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });

  const token = new URL(request.url).searchParams.get('t') ?? '';
  const email = verifyUnsubscribe(token);
  if (!email) return NextResponse.json({ ok: false, error: 'This unsubscribe link is not valid.' }, { status: 400 });

  let recorded = false;
  try {
    recorded = await suppress(email, 'unsubscribe_link');
  } catch (err) {
    console.error('[unsubscribe] could not record:', err instanceof Error ? err.message : err);
  }
  if (!recorded) {
    try {
      await notifyOperatorUnsubscribe(email);
      recorded = true;
    } catch (err) {
      console.error('[unsubscribe] operator email failed:', err instanceof Error ? err.message : err);
    }
  }
  if (!recorded) {
    return NextResponse.json({ ok: false, error: 'We could not record that. Please email book@tassytrucks.com and we will remove you.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
