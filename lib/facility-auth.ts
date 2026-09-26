import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  facilityContextByAuthUser,
  linkAuthUser,
  facilityByEmail,
  type FacilityRow,
} from './facility.server';

/**
 * Magic-link sessions for the facility wizard and portal.
 *
 * Why this exists at all: `generateFacilityMagicLink` mints a Supabase
 * action_link that lands on /facility/welcome. Without a session read, that
 * page cannot tell who arrived — and every screen behind it is about one
 * specific facility. `facility_users.auth_user_id` and `linkAuthUser` were
 * written for exactly this and were dead until now.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS NOT. This is a facility's own session on tassy-ops. It is NOT
 * an admin session and it must never become one. The service-role client
 * (lib/supabase-admin.ts) stays server-only and is never reachable from here.
 *
 * The four facility tables have RLS enabled with NO policies, so this session
 * can read nothing directly — every read goes through a server action holding
 * the service role. That is deliberate: it means a session cookie alone grants
 * no data access, and facility-scoped policies can be added later without
 * having to first undo a permissive one.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Facility sessions are not configured — NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.',
    );
  }
  return { url, key };
}

/**
 * A request-scoped Supabase client that reads and writes the session cookies.
 *
 * `writable: false` is the default because most callers only read. A Server
 * Component cannot set cookies, and attempting it throws in Next 14 — so the
 * cookie writes are no-ops unless the caller is a Route Handler or Server
 * Action and says so.
 */
export function facilitySessionClient({ writable = false }: { writable?: boolean } = {}) {
  const { url, key } = publicEnv();
  const store = cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        if (!writable) return;
        for (const { name, value, options } of toSet) {
          store.set(name, value, options);
        }
      },
    },
  });
}

export type FacilitySession = {
  authUserId: string;
  email: string;
  facilityUserId: string;
  facilityId: string;
  role: string;
  /**
   * The facility row, resolved here and carried on the session.
   *
   * DO NOT replace this with a second facilityContextByAuthUser() call in a
   * Server Component. Resolving a first arrival WRITES (linkAuthUser binds
   * auth_user_id), and this function has already read the same row by the same
   * auth id a moment earlier — before that write. A second identical read
   * inside one React render is served from Next's request memoization, so it
   * replays the PRE-write empty result and the caller concludes there is no
   * facility. That is exactly how the wizard came to bounce every first
   * arrival to /facility/link-expired while the row in the database was
   * correctly bound. A Route Handler is not a React render and does not
   * memoize, which is why the same code appeared to work when tested there.
   */
  facility: FacilityRow;
};

/**
 * Who is signed in, or null.
 *
 * `getUser()` rather than `getSession()`: getSession trusts the cookie as it
 * stands, getUser verifies it against the auth server. For a page that decides
 * what a partner may see, the verified answer is the only one worth having.
 */
export async function currentFacilitySession(): Promise<FacilitySession | null> {
  const supabase = facilitySessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const authUserId = data.user.id;
  const email = data.user.email ?? '';

  // Normal path: the auth user is already bound to a facility_users row.
  const byAuth = await facilityContextByAuthUser(authUserId);
  if (byAuth) {
    return {
      authUserId,
      email,
      facilityUserId: byAuth.userId,
      facilityId: byAuth.facility.id,
      role: byAuth.role,
      facility: byAuth.facility,
    };
  }

  // First arrival: the row was created at signup with auth_user_id null, so
  // bind them now. Matching on email is safe here because the email came from a
  // verified session, not from a form.
  if (!email) return null;
  const byEmail = await facilityByEmail(email);
  if (!byEmail) return null;

  await linkAuthUser(byEmail.userId, authUserId);
  return {
    authUserId,
    email,
    facilityUserId: byEmail.userId,
    facilityId: byEmail.facility.id,
    role: byEmail.role,
    // The row we just bound. Re-reading it here would hit the memoized
    // pre-write response — see the note on FacilitySession.facility.
    facility: byEmail.facility,
  };
}

/** Throws rather than returning null, for server actions that cannot continue. */
export async function requireFacilitySession(): Promise<FacilitySession> {
  const session = await currentFacilitySession();
  if (!session) {
    throw new Error('Your setup link has expired. Ask us for a new one on (704) 941-8508.');
  }
  return session;
}
