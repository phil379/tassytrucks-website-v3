import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { coerceLatLng } from '@/lib/road-distance';
import { hotelQuoteServer } from '@/lib/hotel-price.server';

/**
 * POST /api/hotel-price — the hotel zone price for two picked places, decided on the server.
 *
 * Takes two coordinate pairs, never an address and never a hotel slug: the price comes from where
 * the trip starts and ends, so nobody can ask for a hotel price by naming a hotel. Stores nothing.
 * The booking route works the price out again from its own copy of the coordinates and rejects a
 * client price that does not match.
 */
const LOOKUPS_PER_IP_PER_HOUR = Number(process.env.DISTANCE_RATE_LIMIT) || 120;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limit = rateLimit(`hotel-price:${clientIp(request.headers)}`, LOOKUPS_PER_IP_PER_HOUR);
  if (!limit.ok) return NextResponse.json({ hotel: null, reason: 'rate-limited' });

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ hotel: null, reason: 'bad-body' }, { status: 400 });
  }

  const pickup = coerceLatLng(raw?.pickup);
  const dropoff = coerceLatLng(raw?.dropoff);
  if (!pickup || !dropoff) return NextResponse.json({ hotel: null, reason: 'bad-points' }, { status: 400 });

  const quote = await hotelQuoteServer({
    serviceLine: raw.serviceLine === 'concierge' ? 'concierge' : 'other',
    mobility: typeof raw.mobility === 'string' ? raw.mobility : null,
    pickup,
    dropoff,
    returnTrip: raw.returnTrip === true,
  });
  if (!quote) return NextResponse.json({ hotel: null });

  return NextResponse.json({
    hotel: { slug: quote.slug, label: quote.label, zone: quote.zone },
    chargedCents: quote.chargedCents,
    roundTrip: quote.roundTrip,
    introApplied: quote.introApplied,
  });
}
