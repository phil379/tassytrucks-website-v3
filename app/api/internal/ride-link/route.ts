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
 *   Body:          { "tripId": "<uuid>", "audience"?: "rider" | "family", "replace"?: boolean }
 *                  (default "rider")
 *                  rider: call at assignment; ops may text it at any hour.
 *                  family: call once the ride is active (on the way); 409 not_active before that.
 *                  replace: staff recovery from the TassyOps trip page — revoke the audience's
 *                  live link and mint a fresh one (the old URL dies immediately).
 *
 *   200 { ok: true, audience, url, recipients: [{ phone: "+1XXXXXXXXXX", role, sendWhen: "any_hour" | "while_active" }], expiresAt }
 *   409 { ok: false, error: "already_sent" }   one link per audience per ride: already issued
 *   400 bad body · 401 bad secret · 404 unknown trip · 409 trip cancelled / completed
 *   429 rate limited · 503 secret not configured or database unavailable (do not text)
 *   404 with an EMPTY body while RIDE_TRACKING_LINK_ENABLED is not "true": the route acts as if absent.
 *
 * RLINK (2026-11-15): the link is minted at every assignment, with or without SMS consent —
 * `recipients` may be an empty list, which means "text nobody" and nothing more. The minted URL
 * is also recorded in public.ride_link_urls (RLINK_01) so TassyOps dispatch can recover it.
 * Before RLINK, a consentless booking minted nothing and this route answered url: null.
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

  const body = (await request.json().catch(() => null)) as { tripId?: unknown; audience?: unknown; replace?: unknown } | null;
  if (
    !body ||
    !isTripId(body.tripId) ||
    (body.audience !== undefined && !isAudience(body.audience)) ||
    (body.replace !== undefined && typeof body.replace !== 'boolean')
  ) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  try {
    const result = await mintRideLink({
      store: supabaseRideStore(supabaseAdmin()),
      tripId: body.tripId,
      enabled: true,
      audience: isAudience(body.audience) ? body.audience : 'rider',
      replace: body.replace === true,
    });
    switch (result.kind) {
      case 'minted':
        return NextResponse.json(
          { ok: true, audience: result.audience, url: result.url, recipients: result.recipients, expiresAt: result.expiresAt },
          { headers: { 'cache-control': 'no-store' } },
        );
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
