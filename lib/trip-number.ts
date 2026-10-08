import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';

/**
 * Human-friendly trip number: T-YYYYMMDD-NNNN, matching the driver side
 * (tassy_archive.fn_driver_trips_assign_trip_number). A daily sequence.
 *
 * WHY HERE AND NOT A DB DEFAULT/TRIGGER. The clean home for this is a column
 * default on public.trip_requests, but that DDL could not be applied in the
 * current environment. The column, the backfill and a UNIQUE index already
 * exist; this fills the one remaining gap — numbering NEW rows — in the app.
 *
 * Volume is low, so a max()+1 scan is fine. The unique index is the backstop:
 * on the rare same-second collision the insert throws 23505 and the caller
 * recomputes and retries. Date basis is UTC, to match to_char(now(),...).
 */
export async function nextTripNumber(db = supabaseAdmin()): Promise<string> {
  const prefix = 'T-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { data } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('trip_number')
    .like('trip_number', `${prefix}-%`)
    .order('trip_number', { ascending: false })
    .limit(1);

  let n = 1;
  const last = (data?.[0] as { trip_number?: string } | undefined)?.trip_number;
  if (last) {
    const m = last.match(/(\d+)$/);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

/** True when a Postgres unique-violation (duplicate trip_number) is the error. */
export function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === '23505');
}
