import type { SupabaseClient } from '@supabase/supabase-js';
import { TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import type { RideLinkStore, RideTripRecord } from '@/lib/ride-link';

/**
 * SERVER ONLY. The Supabase-backed store for lib/ride-link.ts.
 *
 * Reads are deliberately narrow: drivers -> first_name only (never last_name or phone), vehicles ->
 * color, make, model only (never plate). The trip row is mapped to RideTripRecord immediately, so no
 * price, pay or contact field travels any further than this function. Every failure throws, and the
 * callers turn a throw into the neutral page (the public page) or a 503 (the internal endpoint).
 */

export const RIDE_TOKENS_TABLE = 'ride_tracking_tokens';

type Row = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function toTrip(r: Row): RideTripRecord {
  const details = r.trip_details;
  return {
    id: String(r.id),
    status: str(r.status),
    driverId: str(r.driver_id),
    vehicleId: str(r.vehicle_id),
    pickupAddress: str(r.pickup_address),
    requestedAt: str(r.requested_at),
    scheduledFor: str(r.scheduled_for),
    completedAt: str(r.completed_at),
    contactPhone: str(r.contact_phone),
    // The column exists in production (TassyOps), not in this repo's migrations: absent reads as null.
    contactSmsConsent: typeof r.contact_sms_consent === 'boolean' ? r.contact_sms_consent : null,
    tripDetails: details && typeof details === 'object' && !Array.isArray(details) ? (details as Record<string, unknown>) : null,
  };
}

export function supabaseRideStore(db: SupabaseClient): RideLinkStore {
  return {
    async getTrip(tripId) {
      // `*` rather than a column list: contact_sms_consent is not in every environment's schema, and
      // naming a missing column fails the whole query. toTrip() keeps only the fields listed above.
      const { data, error } = await db.from(TRIP_REQUESTS_TABLE).select('*').eq('id', tripId).maybeSingle();
      if (error) throw new Error(`trip lookup: ${error.message}`);
      return data ? toTrip(data as Row) : null;
    },

    async getDriverFirstName(driverId) {
      const { data, error } = await db.from('drivers').select('first_name').eq('id', driverId).maybeSingle();
      if (error) throw new Error(`driver lookup: ${error.message}`);
      return str((data as Row | null)?.first_name);
    },

    async getVehicle(vehicleId) {
      const { data, error } = await db.from('vehicles').select('color, make, model').eq('id', vehicleId).maybeSingle();
      if (error) throw new Error(`vehicle lookup: ${error.message}`);
      if (!data) return null;
      const r = data as Row;
      return { color: str(r.color), make: str(r.make), model: str(r.model) };
    },

    async getEvents(tripId) {
      const { data, error } = await db
        .from('trip_events')
        .select('event, at')
        .eq('trip_id', tripId)
        .order('at', { ascending: true })
        .limit(200);
      if (error) throw new Error(`events lookup: ${error.message}`);
      return ((data ?? []) as Row[]).map((r) => ({ event: String(r.event), at: String(r.at) }));
    },

    async getDriverLocation() {
      // Nothing in the schema records where a driver is. See the PR note for what the driver app
      // would have to report before this can return anything.
      return null;
    },

    async insertToken(row) {
      const { data, error } = await db
        .from(RIDE_TOKENS_TABLE)
        .insert({ trip_id: row.tripId, token_hash: row.tokenHash, expires_at: row.expiresAt })
        .select('id')
        .single();
      if (error || !data) throw new Error(`token insert: ${error?.message ?? 'no row'}`);
      return { id: String((data as Row).id) };
    },

    async revokeOtherTokens(tripId, keepId, at) {
      const { error } = await db
        .from(RIDE_TOKENS_TABLE)
        .update({ revoked_at: at })
        .eq('trip_id', tripId)
        .neq('id', keepId)
        .is('revoked_at', null);
      if (error) throw new Error(`token revoke: ${error.message}`);
    },

    async findTokenByHash(tokenHash) {
      const { data, error } = await db
        .from(RIDE_TOKENS_TABLE)
        .select('id, trip_id, expires_at, revoked_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();
      if (error) throw new Error(`token lookup: ${error.message}`);
      if (!data) return null;
      const r = data as Row;
      return { id: String(r.id), tripId: String(r.trip_id), expiresAt: String(r.expires_at), revokedAt: str(r.revoked_at) };
    },
  };
}
