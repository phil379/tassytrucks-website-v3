import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * SERVER ONLY. Holds the service-role key, which bypasses RLS.
 *
 * This module must never be imported from a Client Component. Nothing here is
 * prefixed NEXT_PUBLIC_, so Next.js will not inline these values into the client
 * bundle — but the guard below turns a mistaken import into a loud crash during
 * development rather than a silent key leak.
 */
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase-admin.ts was imported in the browser. It holds the service-role key.');
}

export const TRIP_REQUESTS_TABLE = 'trip_requests';

let cached: SupabaseClient | null = null;

/**
 * Throws if env is missing, so a misconfigured deploy fails at the call site
 * with a clear message instead of inserting into nowhere.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !url && 'SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Supabase is not configured — missing ${missing.join(', ')}`);
  }

  cached = createClient(url!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}

/** Shape of a row as the ops queue reads it. */
export type TripRequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  service_line: string;
  status: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  preferred_contact: string | null;
  pickup_address: string;
  dropoff_address: string;
  requested_at: string;
  return_trip: boolean;
  return_at: string | null;
  passengers: number | null;
  mobility: string | null;
  vehicle_notes: string | null;
  /** Per-service answers. Shape varies by service_line — lib/trip-details.ts. */
  trip_details: Record<string, string | number | boolean> | null;
  quoted_cents: number | null;
  wait_included_min: number | null;
  overage_cents_per_30min: number | null;
  payment_status: string | null;
  source: string | null;
  user_agent: string | null;
  internal_notes: string | null;
};

export const TRIP_STATUSES = [
  'new',
  'quoted',
  'confirmed',
  'assigned',
  'completed',
  'closed',
  'cancelled',
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];
