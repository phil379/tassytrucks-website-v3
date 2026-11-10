import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { bearerMatches, isTripId, mintRideLink, rideTrackingEnabled } from '@/lib/ride-link';
import { supabaseRideStore } from '@/lib/ride-link.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/ride-link: TassyOps asks for the "where is my ride" link when it assigns a trip.
 *
 *   Authorization: Bearer <INTERNAL_NOTIFY_SECRET>      (constant-time compare)
 *   Body:          { "tripId": "<uuid>" }
 *
 *   200 { ok: true, url, recipients: [{ phone: "+1XXXXXXXXXX", role: "rider" | "family" }], expiresAt }
 *   200 { ok: true, url: null, recipients: [] }   no consent on the booking: nothing minted, text nobody
 *   400 bad body · 401 bad secret · 404 unknown trip · 409 trip cancelled / completed
 *   429 rate limited · 503 secret not configured or database unavailable (do not text)
 *   404 with an EMPTY body while RIDE_TRACKING_LINK_ENABLED is not "true": the route acts as if absent.
 *
 * This route sends nothing. TassyOps decides consent rules on its side too (STOP, quiet hours,
 * dry-run) and sends the texts. Full contract: the PR that added this file.
 */
export async function POST(request: Request) {
  if (!rideTrackingEnabled()) return new Response(null, { status: 404 });

  const limit = Number(process.env.RIDE_LINK_RATE_LIMIT ?? 120);
  if (!rateLimit(`ride-link:${clientIp(request.headers)}`, Number.isFinite(limit) && limit > 0 ? limit : 120, 60_000).ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!secret) {
    console.error('[ride-link] INTERNAL_NOTIFY_SECRET is not set; refusing to mint.');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tripId?: unknown } | null;
  if (!body || !isTripId(body.tripId)) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  try {
    const result = await mintRideLink({ store: supabaseRideStore(supabaseAdmin()), tripId: body.tripId, enabled: true });
    switch (result.kind) {
      case 'minted':
        return NextResponse.json(
          { ok: true, url: result.url, recipients: result.recipients, expiresAt: result.expiresAt },
          { headers: { 'cache-control': 'no-store' } },
        );
      case 'no_recipients':
        return NextResponse.json({ ok: true, url: null, recipients: [] }, { headers: { 'cache-control': 'no-store' } });
      case 'not_found':
        return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
      case 'not_active':
        return NextResponse.json({ ok: false, error: 'not_active' }, { status: 409 });
      case 'disabled':
      default:
        return new Response(null, { status: 404 });
    }
  } catch (e) {
    console.error('[ride-link] mint failed:', (e as Error).message);
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
}
