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

/**
 * The signed-in facility user AND their facility, by auth id.
 *
 * Same shape as facilityByEmail on purpose: the session resolver takes either
 * path and must not care which. facilityByAuthUser returns the facility alone
 * and is kept for callers that only need that.
 */
export async function facilityContextByAuthUser(authUserId: string): Promise<{
  facility: FacilityRow;
  userId: string;
  role: string;
} | null> {
  const db = supabaseAdmin();
  const user = ok<{ id: string; facility_id: string; role: string; status: string } | null>(
    await db
      .from(FACILITY_USERS_TABLE)
      .select('id, facility_id, role, status')
      .eq('auth_user_id', authUserId)
      .maybeSingle(),
    'facility_users context by auth id',
  );
  if (!user || user.status === 'disabled') return null;

  const facility = ok<FacilityRow | null>(
    await db
      .from(FACILITIES_TABLE)
      .select('id, name, kind, status, billing_mode, discount_pct, account_manager, referred_by_rep, po_required')
      .eq('id', user.facility_id)
      .maybeSingle(),
    'facilities context by auth id',
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
  /** Rep slug from `?rep=`. Sets BOTH ownership columns. Null is valid. */
  rep?: string | null;
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
        // Both start as the same person and then diverge: referred_by_rep is
        // PERMANENT and drives residual commission; account_manager is who
        // services the account today and can be reassigned. Writing only one
        // of them here would silently break commission the first time an
        // account changed hands.
        referred_by_rep: input.rep ?? null,
        account_manager: input.rep ?? null,
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
/**
 * Mint the setup link.
 *
 * Returns OUR OWN /facility/confirm URL carrying the hashed token, not
 * Supabase's `action_link`. The difference matters: an action_link for a
 * non-PKCE magic link hands the session back in the URL **fragment**, which a
 * Server Component cannot read — the wizard would load with no idea who
 * arrived. A token_hash is exchanged server-side with verifyOtp, so the session
 * cookie is set before the first screen renders and no token ever reaches
 * client JavaScript.
 */
export async function generateFacilityMagicLink(email: string, confirmBase: string): Promise<string> {
  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error) throw new Error(`magic link: ${error.message}`);

  const hashed = data?.properties?.hashed_token;
  if (!hashed) throw new Error('magic link: Supabase returned no hashed_token');

  /**
   * Carry back the type Supabase ACTUALLY minted, not the type we asked for.
   *
   * Asking for `magiclink` does not guarantee you get one. A facility signs up
   * before it has an auth user — createOrFindFacility writes the facilities row,
   * and this call is what brings the auth user into existence — so for every
   * genuinely new partner Supabase mints a token whose verification_type is
   * `signup`, and /auth/v1/verify rejects a signup token presented as
   * `magiclink` with "Email link is invalid or has expired". Hardcoding
   * `magiclink` in the confirm URL therefore broke the wizard for 100% of first
   * arrivals while working perfectly for anyone who had signed in before.
   *
   * Proven against knllznbdpejoaiexmdea 2026-09-26: generate_link{magiclink} on
   * an unknown email returns 200 with verification_type=signup; verify with
   * type=magiclink → 403, with type=signup → 200 and a session.
   */
  const verification = data?.properties?.verification_type ?? 'magiclink';

  return (
    `${confirmBase}?token_hash=${encodeURIComponent(hashed)}` +
    `&type=${encodeURIComponent(verification)}`
  );
}

/** Bind the auth user to the facility user the first time they sign in. */
export async function linkAuthUser(facilityUserId: string, authUserId: string): Promise<void> {
  const db = supabaseAdmin();
  const rows = ok<{ id: string }[]>(
    await db
      .from(FACILITY_USERS_TABLE)
      .update({ auth_user_id: authUserId, status: 'active', last_seen_at: new Date().toISOString() })
      .eq('id', facilityUserId)
      .select('id'),
    'link auth user',
  );

  /**
   * An update that matched nothing must not look like one that worked.
   *
   * PostgREST returns {error: null, data: []} when the filter matches no row —
   * a deleted user, a row RLS hides, an id that never existed — and ok() only
   * inspects `error`. Binding the session is the step every screen behind it
   * depends on, so silence here would strand the partner on a wizard whose
   * every save fails. Same class of bug as the two CHECK-constraint P0s.
   */
  if (!rows || rows.length === 0) {
    throw new Error(`link auth user: no facility_users row matched id ${facilityUserId}`);
  }
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
