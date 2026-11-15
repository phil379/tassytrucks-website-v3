import type { SupabaseClient } from '@supabase/supabase-js';
import { TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import {
  hashRideToken,
  isValidRideToken,
  rideStatusFrom,
  tokenIsLive,
  tripEndedAt,
  type RideLinkStore,
} from '@/lib/ride-link';

/**
 * SERVER ONLY. Rider -> dispatch messaging for the /ride/<token> page.
 *
 * The rider writes from the tracking page; the message lands in
 * public.rider_messages (RMSG_01) and dispatch reads and answers it in the
 * TassyOps inbox. Dispatch's reply reaches the rider by email — the rider
 * never reads this table, and no contact field is ever returned to the
 * client. The rider's name is read off the trip row HERE, server-side, and
 * stored on the message so dispatch can see who wrote; it travels no
 * further. That keeps the tracking page's privacy rule (lib/ride-link.ts:
 * the page renders no name, phone or price) intact — buildRideView is not
 * touched and gains no new field.
 *
 * FAIL SOFT, like everything else on this page: rider_messages does not
 * exist until Phil applies RMSG_01, and every function here treats a
 * database error as "messaging is not available", never as a crash and
 * never as a different-looking page for a guessed token. The token checks
 * are exactly loadRidePage's — a token the status page itself would answer
 * with the neutral page gets no message form either.
 */

export const RIDER_MESSAGES_TABLE = 'rider_messages';

/**
 * The trip a token may message about, or null. Mirrors loadRidePage's
 * refusals one for one: malformed token, unknown token, expired/revoked
 * token, a trip that ended more than AFTER_TRIP_MS ago, and a cancelled,
 * no-show or not-yet-assigned trip all come back null.
 */
export async function resolveRiderMessageTarget(opts: {
  store: RideLinkStore;
  token: unknown;
  now?: Date;
}): Promise<{ tripId: string } | null> {
  if (!isValidRideToken(opts.token)) return null;
  const now = opts.now ?? new Date();
  try {
    const row = await opts.store.findTokenByHash(hashRideToken(opts.token));
    if (!row) return null;
    const trip = await opts.store.getTrip(row.tripId);
    if (!trip) return null;
    const events = await opts.store.getEvents(trip.id);
    if (!tokenIsLive(row, tripEndedAt(trip, events), now)) return null;
    const status = rideStatusFrom(trip, events);
    if (status === 'inactive' || status === 'none') return null;
    return { tripId: trip.id };
  } catch (e) {
    console.error('[rider-messages] target lookup failed:', (e as Error).message);
    return null;
  }
}

/**
 * True when public.rider_messages answers a query (RMSG_01 applied). Any
 * error — above all the table not existing yet — reads as "not set up",
 * and the page shows the call-us note instead of the form.
 */
export async function riderMessagingAvailable(db: SupabaseClient, tripId: string): Promise<boolean> {
  try {
    const { error } = await db.from(RIDER_MESSAGES_TABLE).select('id').eq('trip_request_id', tripId).limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Store one rider message. The author name comes from the trip row, never
 * from anything the browser sent. Any failure — pre-RMSG_01 the table is
 * simply not there — returns { ok: false } and the caller answers with the
 * same plain "not available, call us" text, so a missing table and a dead
 * database are indistinguishable to the rider.
 */
export async function insertRiderMessage(
  db: SupabaseClient,
  input: { tripId: string; body: string },
): Promise<{ ok: boolean }> {
  const { data: trip, error: tripError } = await db
    .from(TRIP_REQUESTS_TABLE)
    .select('contact_name')
    .eq('id', input.tripId)
    .maybeSingle();
  if (tripError || !trip) {
    if (tripError) console.error('[rider-messages] trip read failed:', tripError.message);
    return { ok: false };
  }
  const rawName = (trip as { contact_name?: unknown }).contact_name;
  const authorName = typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 120) : null;

  const { error } = await db.from(RIDER_MESSAGES_TABLE).insert({
    trip_request_id: input.tripId,
    author: 'rider',
    author_name: authorName,
    body: input.body,
  });
  if (error) {
    console.error('[rider-messages] insert failed:', error.message);
    return { ok: false };
  }
  return { ok: true };
}
