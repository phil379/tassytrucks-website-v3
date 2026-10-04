import { NextResponse } from 'next/server';
import { facilitySessionClient } from '@/lib/facility-auth';

/**
 * End a facility session.
 *
 * Why this exists: until now there was no way out of the console. A
 * coordinator signs in from the discharge desk — a shared computer, often
 * logged in all shift — and the next person to sit down saw that clinic's
 * passengers and trips. No amount of facility_id scoping in
 * facility-console.server.ts helps when the session itself never ends.
 *
 * POST only, via the form in ConsoleShell. A GET sign-out can be fired by a
 * link prefetch or a browser scanning the page, which would log people out at
 * random and read as the session "not working".
 */
export async function POST(request: Request) {
  const supabase = facilitySessionClient({ writable: true });
  // Clears the sb-* cookies through the setAll writer above. Errors are not
  // worth surfacing: we are leaving either way, and a failed revoke still ends
  // locally when the cookies go.
  await supabase.auth.signOut();

  const url = new URL('/facility/link-expired?signedout=1', request.url);
  // 303 so the browser follows with GET rather than re-POSTing to the page.
  return NextResponse.redirect(url, 303);
}
