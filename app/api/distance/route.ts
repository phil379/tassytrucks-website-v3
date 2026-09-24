import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { coerceLatLng, roadDistance } from '@/lib/road-distance';

/**
 * POST /api/distance — driving miles between two picked places.
 *
 * WHY A SERVER ROUTE rather than calling Routes from the browser. The Maps key
 * is restricted to a list of referrers, which stops other websites and not
 * scripts; the fewer places it is quoted from, the smaller the blast radius of
 * a leak. It also lets one warm instance serve a cached answer to the next
 * visitor asking the same question, which the browser cannot do.
 *
 * WHAT THIS ROUTE MUST NEVER DO: take an address. It takes two coordinate
 * pairs the visitor has already picked, returns a number of miles, and stores
 * nothing. No address, no name, no request id, and no logging of either point.
 */

const LOOKUPS_PER_IP_PER_HOUR = Number(process.env.DISTANCE_RATE_LIMIT) || 120;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limit = rateLimit(`distance:${clientIp(request.headers)}`, LOOKUPS_PER_IP_PER_HOUR);
  if (!limit.ok) {
    // 200 with miles: null, not 429. The caller's job is to fall back to the
    // straight-line estimate; a failed lookup is not a failed page.
    return NextResponse.json({ miles: null, reason: 'rate-limited' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ miles: null, reason: 'bad-body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const from = coerceLatLng(raw?.pickup);
  const to = coerceLatLng(raw?.dropoff);
  if (!from || !to) {
    return NextResponse.json({ miles: null, reason: 'bad-points' }, { status: 400 });
  }

  const result = await roadDistance(from, to);
  if (!result) return NextResponse.json({ miles: null, reason: 'unavailable' });

  return NextResponse.json({
    miles: Math.round(result.miles * 100) / 100,
    seconds: result.seconds,
  });
}
