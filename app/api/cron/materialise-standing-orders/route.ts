import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * How far ahead the board is filled. Three weeks is enough for dispatch to see
 * the shape of the week and assign drivers, without writing 180 rows per child
 * the moment a parent books Full Year -- a cancellation in October would then
 * mean deleting trips all the way to June.
 */
const DAYS_AHEAD = 21;

/**
 * GET /api/cron/materialise-standing-orders — the recurring-trip engine's clock.
 *
 * A Scholar booking is a standing order: days of the week, a pickup time, a
 * return time, a start date. Until now the booking created exactly ONE trip --
 * the first day -- and nothing produced the second. Full Year is roughly 180
 * school days times two runs; 359 of them did not exist.
 *
 * The work is in the database: public.materialise_standing_orders(p_start, p_end)
 * (docs/migrations_applied/SCHOLAR_01_materialise_standing_orders.sql in the ops
 * repo). It is idempotent -- a partial unique index on
 * (standing_order_id, requested_at) -- so this route reruns a rolling,
 * overlapping window every day and creates only what is missing. That overlap is
 * deliberate: a day the cron does not fire is filled in by the next one instead
 * of leaving a permanent hole in the schedule.
 *
 * Not Scholar-only. Any active standing order is materialised, so a facility's
 * standing dialysis run works the same way the day one is created.
 *
 * Auth: Vercel sends `Authorization: Bearer $CRON_SECRET`. Without that env var
 * the route refuses rather than exposing an open write to the dispatch board.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[cron/materialise] CRON_SECRET is not set — refusing to run.');
    return NextResponse.json({ ok: false, error: 'Not configured.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.rpc('materialise_standing_orders', {
    p_start: new Date().toISOString().slice(0, 10),
    p_end: new Date(Date.now() + DAYS_AHEAD * 86400000).toISOString().slice(0, 10),
  });

  if (error) {
    // A 500 is right here: this is a silent-drop candidate. If the board stops
    // filling, the failure has to be visible in the Vercel cron log, not
    // swallowed into a cheerful 200 that nobody reads.
    console.error('[cron/materialise] RPC failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const created = typeof data === 'number' ? data : 0;
  console.log(`[cron/materialise] created ${created} trip(s) over the next ${DAYS_AHEAD} days.`);
  return NextResponse.json({ ok: true, created, days_ahead: DAYS_AHEAD });
}
