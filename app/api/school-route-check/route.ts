import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { checkScholarLeg, routeCapEnforced, SCHOLAR_MAX_LEG_MINUTES } from '@/lib/school-route-cap';
import { householdRequestHref } from '@/lib/school-household';

/**
 * POST /api/school-route-check — an early, courtesy answer: is the drive from
 * this home to this school inside the standard 20-minute Scholar route?
 *
 * The wizard asks as soon as both addresses are set so a family with a long
 * route learns it on step 2, not after six steps. THIS ANSWER IS NEVER TRUSTED:
 * /api/school-booking measures again from the addresses actually booked.
 *
 * Privacy: takes two addresses, returns a verdict and whole minutes, stores
 * nothing, and logs neither address.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHECKS_PER_IP_PER_HOUR = Number(process.env.SCHOOL_ROUTE_CHECK_RATE_LIMIT) || 60;
const MAX_ADDRESS_LEN = 300;

export async function POST(request: Request) {
  if (!routeCapEnforced()) {
    return NextResponse.json({ verdict: 'within', minutes: null, max_minutes: SCHOLAR_MAX_LEG_MINUTES });
  }

  const limit = rateLimit(`school-route-check:${clientIp(request.headers)}`, CHECKS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    // Not an error page: the server check at booking time still decides.
    return NextResponse.json({ verdict: 'unknown', minutes: null, max_minutes: SCHOLAR_MAX_LEG_MINUTES, reason: 'rate-limited' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const home = typeof raw.home_address === 'string' ? raw.home_address.trim() : '';
  const school = typeof raw.school_address === 'string' ? raw.school_address.trim() : '';
  if (home.length < 5 || school.length < 5 || home.length > MAX_ADDRESS_LEN || school.length > MAX_ADDRESS_LEN) {
    return NextResponse.json({ error: 'Two addresses are required.' }, { status: 400 });
  }

  const leg = await checkScholarLeg(home, school);
  const plan = typeof raw.plan === 'string' ? raw.plan : null;
  const reason = leg.verdict === 'too_long' ? 'route_too_long' : leg.verdict === 'unknown' ? 'route_unverified' : null;

  return NextResponse.json({
    verdict: leg.verdict,
    minutes: leg.minutes,
    max_minutes: SCHOLAR_MAX_LEG_MINUTES,
    ...(reason ? { redirect: householdRequestHref([reason], plan) } : {}),
  });
}
