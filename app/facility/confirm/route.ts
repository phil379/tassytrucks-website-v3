import { NextResponse } from 'next/server';
import { facilitySessionClient } from '@/lib/facility-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /facility/confirm?token_hash=…&type=signup|magiclink|email
 *
 * Exchanges the setup link for a session cookie, then sends them to the wizard.
 *
 * Server-side on purpose. The alternative — Supabase's action_link — returns the
 * session in the URL fragment, which never reaches the server, so the first
 * screen would render with no idea who arrived. Here the token is verified and
 * the cookie is set before any redirect, and no token is ever handed to client
 * JavaScript.
 *
 * `writable: true` because a Route Handler may set cookies; a Server Component
 * may not, which is why every other caller reads with the default.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  const failed = (reason: string) => {
    // The reason goes in the log, not the URL — a partner does not need to read
    // "otp_expired", and it should not be reflected back into a page.
    console.warn(`[facility/confirm] rejected: ${reason}`);
    return NextResponse.redirect(new URL('/facility/link-expired', url.origin));
  };

  /**
   * The type is whatever generateFacilityMagicLink was handed by Supabase, and
   * it must be passed through rather than assumed: a first-time facility gets a
   * `signup` token even though we asked for a magic link, and verifying it as
   * `magiclink` fails. Still an allowlist, so the query string cannot steer us
   * at a flow we did not mint — `recovery` and `invite` are not ours.
   */
  const ACCEPTED = ['signup', 'magiclink', 'email'] as const;
  type Accepted = (typeof ACCEPTED)[number];
  const isAccepted = (t: string | null): t is Accepted =>
    t !== null && (ACCEPTED as readonly string[]).includes(t);

  if (!tokenHash) return failed('no token_hash');
  if (!isAccepted(type)) return failed(`unaccepted token type: ${type ?? 'none'}`);

  const supabase = facilitySessionClient({ writable: true });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return failed(error.message);

  // 303 so the browser follows with GET and the token_hash leaves the address
  // bar — it is single-use, but it should not sit in history or a referrer.
  return NextResponse.redirect(new URL('/facility/welcome', url.origin), 303);
}
