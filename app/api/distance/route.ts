import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { coerceLatLng, pricingPoint, roadDistance, roadDistanceVia } from '@/lib/road-distance';

/**
 * POST /api/distance — driving miles between two picked places.
 *
 * WHY A SERVER ROUTE rather than calling Routes from the browser. The Maps key
 * is restricted to a list of referrers, which stops other websites and not
 * scripts; the fewer places it is quoted from, the smaller the blast radius of
 * a leak. It also lets one warm instance serve a cached answer to the next
 * visitor asking the same question, which the browser cannot do.
 *
 * WHAT THIS ROUTE MUST NEVER DO: take an address. It takes coordinate pairs
 * the visitor has already picked, returns a number of miles, and stores
 * nothing. No address, no name, no request id, and no logging of any point.
 *
 * STOPS (2026-11-19): an optional `stop` point prices the outbound route
 * through it (pickup -> stop -> dropoff), and `returnMiles` prices the way
 * back whenever a stop is on the trip: through an optional `returnStop`
 * point (dropoff -> stop -> pickup), or the direct dropoff -> pickup drive
 * when only the way there has a stop (the return does not retrace the
 * detour). With no stop anywhere there is no returnMiles — the quote
 * engine mirrors the outbound miles for the way back, as it always has.
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
  const fromRaw = coerceLatLng(raw?.pickup);
  const toRaw = coerceLatLng(raw?.dropoff);
  if (!fromRaw || !toRaw) {
    return NextResponse.json({ miles: null, reason: 'bad-points' }, { status: 400 });
  }

  // PRICING POINTS (lib/road-distance.ts pricingPoint, Phil 2026-11-21). An
  // airport end measures as the canonical CLT terminal point, whichever pin
  // the visitor picked for the airport's address — the price band must not
  // depend on the pin. Stop and return-stop points are NOT snapped: a stop
  // is priced on the route actually driven through it.
  const from = pricingPoint(fromRaw);
  const to = pricingPoint(toRaw);

  const stop = coerceLatLng(raw?.stop);
  const result = stop ? await roadDistanceVia(from, stop, to) : await roadDistance(from, to);
  if (!result) return NextResponse.json({ miles: null, reason: 'unavailable' });

  const returnStop = coerceLatLng(raw?.returnStop);
  const returnResult = returnStop
    ? await roadDistanceVia(to, returnStop, from)
    : stop
      ? await roadDistance(to, from)
      : null;

  return NextResponse.json({
    miles: Math.round(result.miles * 100) / 100,
    seconds: result.seconds,
    returnMiles: returnResult ? Math.round(returnResult.miles * 100) / 100 : null,
    returnSeconds: returnResult ? returnResult.seconds : null,
  });
}
