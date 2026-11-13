import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { notifyOperatorLowRating } from '@/lib/notifications';
import type { RatingDeps, RatingStore } from '@/lib/ride-ratings';

/**
 * SERVER ONLY. The real store (service role) and alerter behind lib/ride-ratings.ts.
 * Every method that reads throws on a database error; the callers in lib/ride-ratings.ts turn that
 * into a neutral page or a 500, never a crash.
 */

export const RIDE_RATINGS_TABLE = 'ride_ratings';
export const RIDE_RATING_TOKENS_TABLE = 'ride_rating_tokens';
export const INCIDENT_REPORTS_TABLE = 'incident_reports';

export function supabaseRatingStore(): RatingStore {
  // Lazy: a missing Supabase env throws inside a method, where the caller already handles errors.
  const db = () => supabaseAdmin();
  return {
    async findTrip(tripId) {
      const { data, error } = await db()
        .from(TRIP_REQUESTS_TABLE)
        .select('id, status, driver_id, is_test_data')
        .eq('id', tripId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Awaited<ReturnType<RatingStore['findTrip']>>) ?? null;
    },

    async tripEvents(tripId) {
      const { data, error } = await db()
        .from('trip_events')
        .select('event')
        .eq('trip_id', tripId)
        .in('event', ['cancelled', 'no_show']);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ event: string }>).map((r) => r.event);
    },

    async insertToken(row) {
      const { error } = await db().from(RIDE_RATING_TOKENS_TABLE).insert(row);
      if (error) throw new Error(error.message);
    },

    async findTokenByHash(tokenHash) {
      const { data, error } = await db()
        .from(RIDE_RATING_TOKENS_TABLE)
        .select('id, trip_id, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Awaited<ReturnType<RatingStore['findTokenByHash']>>) ?? null;
    },

    async markTokenUsed(tokenId, at) {
      const { error } = await db()
        .from(RIDE_RATING_TOKENS_TABLE)
        .update({ used_at: at })
        .eq('id', tokenId)
        .is('used_at', null);
      if (error) throw new Error(error.message);
    },

    async findRatingForTrip(tripId) {
      const { data, error } = await db()
        .from(RIDE_RATINGS_TABLE)
        .select('id, score')
        .eq('trip_id', tripId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Awaited<ReturnType<RatingStore['findRatingForTrip']>>) ?? null;
    },

    async insertRating(row) {
      const { data, error } = await db().from(RIDE_RATINGS_TABLE).insert(row).select('id').single();
      if (error) {
        if (error.code === '23505') return 'duplicate';
        throw new Error(error.message);
      }
      return { id: String((data as { id: string }).id) };
    },

    async insertIncident(row) {
      try {
        const { data, error } = await db().from(INCIDENT_REPORTS_TABLE).insert(row).select('id').single();
        if (error) {
          console.error('[ride-ratings] incident_reports insert refused:', error.code, error.message);
          return null;
        }
        return String((data as { id: number | string }).id);
      } catch (e) {
        console.error('[ride-ratings] incident_reports insert failed:', (e as Error).message);
        return null;
      }
    },
  };
}

/** Real dependencies for the page, the server action and the ops endpoint. */
export function ratingDeps(): RatingDeps {
  return {
    store: supabaseRatingStore(),
    alert: (a) => notifyOperatorLowRating(a),
  };
}
