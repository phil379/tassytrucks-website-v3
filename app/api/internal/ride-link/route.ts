import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { bearerMatches, isAudience, isTripId, mintRideLink, rideTrackingEnabled } from '@/lib/ride-link';
import { supabaseRideStore } from '@/lib/ride-link.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/ride-link: TassyOps asks for the "where is my ride" link when it assigns a trip.
 *
 *   Authorization: Bearer <INTERNAL_NOTIFY_SECRET>      (constant-time compare)
 *   Body:          { "tripId": "<uuid>", "audience"?: "rider" | "family" }   (default "rider")
 *                  rider: call at assignment; ops may text it at any hour.
 *                  family: call once the ride is active (on the way); 409 not_active before that.
 *
 *   200 { ok: true, audience, url, recipients: [{ phone: "+1XXXXXXXXXX", role, sendWhen: "any_hour" | "while_active" }], expiresAt }
 *   409 { ok: false, error: "already_sent" }   one text per audience per ride: already issued
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

  const body = (await request.json().catch(() => null)) as { tripId?: unknown; audience?: unknown } | null;
  if (!body || !isTripId(body.tripId) || (body.audience !== undefined && !isAudience(body.audience))) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  try {
    const result = await mintRideLink({ store: supabaseRideStore(supabaseAdmin()), tripId: body.tripId, enabled: true, audience: isAudience(body.audience) ? body.audience : 'rider' });
    switch (result.kind) {
      case 'minted':
        return NextResponse.json(
          { ok: true, audience: result.audience, url: result.url, recipients: result.recipients, expiresAt: result.expiresAt },
          { headers: { 'cache-control': 'no-store' } },
        );
      case 'no_recipients':
        return NextResponse.json({ ok: true, url: null, recipients: [] }, { headers: { 'cache-control': 'no-store' } });
      case 'already_sent':
        // One text per audience per ride: the link for these people was already issued.
        return NextResponse.json({ ok: false, error: 'already_sent' }, { status: 409 });
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
