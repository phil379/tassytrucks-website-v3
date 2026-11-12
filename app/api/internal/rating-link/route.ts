import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bearerMatches, mintRatingLink } from '@/lib/ride-ratings';
import { ratingDeps } from '@/lib/ride-ratings.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({ tripId: z.string().uuid() });

const STATUS: Record<string, number> = {
  disabled: 503,
  not_found: 404,
  test_data: 409,
  not_ratable: 409,
  already_rated: 409,
  server_error: 500,
};

/**
 * POST /api/internal/rating-link — called by TassyOps after it records a trip as completed.
 * Not public: needs `Authorization: Bearer <INTERNAL_NOTIFY_SECRET>` (constant-time compare).
 * Body { tripId }. Answers { ok: true, url, expiresAt } only when RATINGS_ENABLED is exactly "true"
 * and the trip is completed/closed, not cancelled or no_show, not test data and not yet rated.
 * Mints a fresh private link each call; the website sends nothing. TassyOps sends the text (with its
 * STOP line, consent and quiet-hours rules) or the email.
 */
export async function POST(request: Request) {
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'unconfigured' }, { status: 503 });
  if (!bearerMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let tripId: string;
  try {
    tripId = bodySchema.parse(await request.json()).tripId;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  try {
    const result = await mintRatingLink(ratingDeps(), tripId);
    if (result.ok) {
      return NextResponse.json({ ok: true, url: result.url, expiresAt: result.expiresAt }, { headers: { 'cache-control': 'no-store' } });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: STATUS[result.error] ?? 500 });
  } catch (e) {
    console.error('[ride-ratings] rating-link failed:', (e as Error).message);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
