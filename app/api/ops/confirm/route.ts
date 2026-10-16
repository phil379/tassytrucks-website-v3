import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BRIDGE_HEADER, verifyBridgeSignature } from '@/lib/ops-bridge';
import { confirmTrip } from '@/lib/ops-confirm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  tripId: z.string().uuid(),
  agreedCents: z.number().int().positive().max(5_000_000),
  onAccount: z.boolean().optional().default(false),
});

/**
 * One-tap confirm from the TassyOps dispatch board. Not a public endpoint: it needs a signature
 * made with the shared server secret, and the ops app only signs after checking the staff login.
 * The money logic is identical to the /ops page (lib/ops-confirm.ts).
 */
export async function POST(request: Request) {
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'unconfigured' }, { status: 503 });

  const raw = await request.text();
  const check = verifyBridgeSignature(
    secret,
    raw,
    request.headers.get(BRIDGE_HEADER),
    Math.floor(Date.now() / 1000),
  );
  if (!check.ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  try {
    const result = await confirmTrip({
      id: parsed.tripId,
      agreedCents: parsed.agreedCents,
      onAccount: parsed.onAccount,
      refuseClosed: true,
      refuseIfAlreadyConfirmed: true,
    });
    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : 422;
      return NextResponse.json({ ok: false, error: result.code }, { status });
    }
    return NextResponse.json({
      ok: true,
      confirmationCode: result.confirmationCode,
      hasPayLink: Boolean(result.payUrl),
      textSent: result.textSent,
    });
  } catch (e) {
    console.error('[ops-bridge] confirm failed:', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
