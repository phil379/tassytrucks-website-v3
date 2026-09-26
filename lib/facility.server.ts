import { supabaseAdmin } from '@/lib/supabase-admin';
import { payerFromBillingMode, type Payer } from '@/lib/facility';

/**
 * SERVER ONLY. Facility reads and writes.
 *
 * Everything goes through the service role and a server action or route
 * handler. RLS is enabled on these tables with no permissive policy, which
 * means a leaked anon key reaches nothing. Facility-scoped read policies land
 * with the portal, written against facility_users.auth_user_id = auth.uid().
 */
if (typeof window !== 'undefined') {
  throw new Error('lib/facility.server.ts was imported in the browser.');
}

export const FACILITIES_TABLE = 'facilities';
export const FACILITY_USERS_TABLE = 'facility_users';
export const FACILITY_INVOICES_TABLE = 'facility_invoices';
export const STANDING_ORDERS_TABLE = 'standing_orders';

export type FacilityRow = {
  id: string;
  name: string;
  kind: string;
  status: string;
  billing_mode: string;
  discount_pct: number;
  account_manager: string | null;
  referred_by_rep: string | null;
  po_required: boolean;
};

/** PostgREST does not throw. An ignored error is how rows silently vanish. */
function ok<T>(res: { data: unknown; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/* ───────────────────────────────────────────────────────────────── lookups */

export async function facilityByEmail(email: string): Promise<{
  facility: FacilityRow;
  userId: string;
  role: string;
} | null> {
  const db = supabaseAdmin();

  const user = ok<{ id: string; facility_id: string; role: string; status: string } | null>(
    await db
      .from(FACILITY_USERS_TABLE)
      .select('id, facility_id, role, status')
      .ilike('email', email)
      .maybeSingle(),
    'facility_users lookup',
  );
  if (!user || user.status === 'disabled') return null;

  const facility = ok<FacilityRow | null>(
    await db
      .from(FACILITIES_TABLE)
      .select('id, name, kind, status, billing_mode, discount_pct, account_manager, referred_by_rep, po_required')
      .eq('id', user.facility_id)
      .maybeSingle(),
    'facilities lookup',
  );
  if (!facility) return null;

  return { facility, userId: user.id, role: user.role };
}

export async function facilityByAuthUser(authUserId: string) {
  const db = supabaseAdmin();
  const user = ok<{ facility_id: string } | null>(
    await db
      .from(FACILITY_USERS_TABLE)
      .select('facility_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle(),
    'facility_users by auth id',
  );
  if (!user) return null;

  return ok<FacilityRow | null>(
    await db
      .from(FACILITIES_TABLE)
      .select('id, name, kind, status, billing_mode, discount_pct, account_manager, referred_by_rep, po_required')
      .eq('id', user.facility_id)
      .maybeSingle(),
    'facilities by auth id',
  );
}

/* ────────────────────────────────────────────────────────────────── signup */

/**
 * Step 0. Creates the facility and its first user, or returns the existing
 * pair when the email is already known.
 *
 * IDEMPOTENT ON EMAIL, on purpose. A coordinator who submits twice, or who
 * comes back a week later, must not end up with two accounts and two weekly
 * invoices. The second submit is a sign-in, not a signup, and the caller can
 * send the same magic link either way.
 */
export async function createOrFindFacility(input: {
  facilityName: string;
  workEmail: string;
  source: string | null;
}): Promise<{ facilityId: string; userId: string; created: boolean }> {
  const db = supabaseAdmin();
  const email = input.workEmail.trim();

  const existing = ok<{ id: string; facility_id: string } | null>(
    await db
      .from(FACILITY_USERS_TABLE)
      .select('id, facility_id')
      .ilike('email', email)
      .maybeSingle(),
    'facility_users pre-check',
  );

  if (existing) {
    return { facilityId: existing.facility_id, userId: existing.id, created: false };
  }

  const facility = ok<{ id: string }>(
    await db
      .from(FACILITIES_TABLE)
      .insert({
        name: input.facilityName.trim(),
        status: 'pending',
        primary_contact_email: email,
        referral_source: input.source,
      })
      .select('id')
      .single(),
    'facilities insert',
  );

  const user = ok<{ id: string }>(
    await db
      .from(FACILITY_USERS_TABLE)
      .insert({
        facility_id: facility.id,
        email,
        role: 'admin', // the first person in is the one who can invite the rest
        status: 'invited',
      })
      .select('id')
      .single(),
    'facility_users insert',
  );

  return { facilityId: facility.id, userId: user.id, created: true };
}

/**
 * A Supabase magic link for this email, generated with the service role.
 *
 * Returns the URL for the caller to put in a Resend email rather than using
 * Supabase's own mailer, so the message looks like Tassy and not like a
 * platform. The link is single-use and short-lived; nothing about it is stored.
 */
export async function generateFacilityMagicLink(email: string, redirectTo: string): Promise<string> {
  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });
  if (error) throw new Error(`magic link: ${error.message}`);

  const url = data?.properties?.action_link;
  if (!url) throw new Error('magic link: Supabase returned no action_link');
  return url;
}

/** Bind the auth user to the facility user the first time they sign in. */
export async function linkAuthUser(facilityUserId: string, authUserId: string): Promise<void> {
  const db = supabaseAdmin();
  ok(
    await db
      .from(FACILITY_USERS_TABLE)
      .update({ auth_user_id: authUserId, status: 'active', last_seen_at: new Date().toISOString() })
      .eq('id', facilityUserId)
      .select('id'),
    'link auth user',
  );
}

/* ───────────────────────────────────────────────────────── booking context */

/**
 * The payer for one trip: the facility's default unless the requester said
 * otherwise. A dialysis centre has standing patients on account AND one-off
 * self-payers, so this is a per-trip question with a sensible default — never
 * a per-facility setting the requester cannot see or change.
 */
export function resolvePayer(facility: { billing_mode: string }, override?: Payer | null): Payer {
  return override ?? payerFromBillingMode(facility.billing_mode);
}
