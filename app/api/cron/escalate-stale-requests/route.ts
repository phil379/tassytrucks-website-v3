import { NextResponse } from 'next/server';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { notifyOperatorUrgent } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A request untouched this long has blown the window the auto-reply promised. */
const STALE_AFTER_MINUTES = 90;

/** Safety valve: never page about more than this in one run. */
const MAX_PER_RUN = 20;

/**
 * GET /api/cron/escalate-stale-requests — the speed-to-lead safety net.
 *
 * The auto-reply promises a call or text within 2 hours. The operator is a
 * full-time caregiver and cannot always make that. This pages them once, at 90
 * minutes, while there is still time to keep the promise.
 *
 * Three properties matter:
 *   1. Operator only. The customer is never messaged a second time — a "sorry,
 *      still nothing" text makes the silence worse.
 *   2. Exactly once per request. `escalated_at` is stamped only after the SMS
 *      actually sends, so a failed send retries next run and a successful one
 *      never repeats. Without this the operator gets the same URGENT every 15
 *      minutes and learns to ignore the word.
 *   3. Never 500s on a notification failure. A dead Zapier hook leaves the rows
 *      un-escalated and reports it; it does not fail the cron.
 *
 * Auth: Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
 * set. Without that env var the route refuses to run rather than exposing an
 * open SMS trigger.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[cron/escalate] CRON_SECRET is not set — refusing to run.');
    return NextResponse.json({ ok: false, error: 'Not configured.' }, { status: 503 });
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString();

  let stale: Array<Parameters<typeof notifyOperatorUrgent>[0]> = [];
  try {
    const { data, error } = await supabaseAdmin()
      .from(TRIP_REQUESTS_TABLE)
      .select(
        'id, service_line, contact_name, contact_phone, pickup_address, dropoff_address, requested_at, return_trip, created_at',
      )
      .eq('status', 'new')
      .is('escalated_at', null)
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) throw new Error(error.message);
    stale = (data ?? []) as typeof stale;
  } catch (err) {
    console.error('[cron/escalate] query failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'Query failed.' }, { status: 500 });
  }

  let escalated = 0;
  let failed = 0;

  for (const row of stale) {
    try {
      await notifyOperatorUrgent(row);

      // Stamp only AFTER the SMS actually sent. If this update fails we may
      // double-page once, which is the safe direction to fail in.
      const { error } = await supabaseAdmin()
        .from(TRIP_REQUESTS_TABLE)
        .update({ escalated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (error) throw new Error(`stamp failed: ${error.message}`);
      escalated += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `[cron/escalate] request ${row.id} not escalated:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    checked: stale.length,
    escalated,
    failed,
    staleAfterMinutes: STALE_AFTER_MINUTES,
  });
}
