import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BRIDGE_HEADER, verifyBridgeSignature } from '@/lib/ops-bridge';
import { notifyRefundHeld, refundTrip } from '@/lib/ops-refund';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  tripId: z.string().uuid(),
  // "held": the cancel held the refund (rider-initiated late cancel,
  // late-cancellation fee) — no money moves; the call only emails the
  // rider the held variant of the cancellation email. Absent = refund,
  // as before.
  outcome: z.enum(['held']).optional(),
  // Block B1: a PARTIAL refund of exactly this many cents, sent only by
  // the TassyOps held-payments queue when a human decides a held refund
  // at the late-cancel fee (the amount is the remainder after the fee —
  // the split the held email already promised the rider). Absent =
  // refund in full, exactly as before. The cancel-time call never sends it.
  amountCents: z.number().int().positive().optional(),
});

/**
 * Refund a cancelled trip, from the TassyOps dispatch board (or the Winnie
 * manager page). Not a public endpoint: it needs a signature made with the
 * shared server secret, and the ops app only signs after checking the staff
 * login. The money logic lives in lib/ops-refund.ts.
 *
 * The ops app calls this right after it sets the trip to "cancelled". This
 * endpoint refunds the Stripe payment in full, marks the trip "refunded",
 * records the refund in the audit log and on the timeline, and emails the
 * rider that their booking was cancelled and their fare refunded. A trip that
 * was never paid, was never cancelled, or was already refunded is refused or
 * reported, never charged twice.
 *
 * The one exception to "in full": with amountCents set (the held-payments
 * queue deciding a held refund, Block B1) the refund is exactly that amount
 * — the remainder after the late-cancel fee. Everything else about the
 * call is identical, including the idempotency key, so a held trip can only
 * ever be refunded once, at whichever amount was decided first.
 *
 * With outcome: "held" the same call moves no money at all: the refund was
 * held for the late-cancel fee, and the endpoint only emails the rider
 * the held variant (fee named, remainder promised by hand) — see
 * notifyRefundHeld in lib/ops-refund.ts.
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
    if (parsed.outcome === 'held') {
      const held = await notifyRefundHeld({ id: parsed.tripId });
      if (!held.ok) {
        const status = held.code === 'not_found' ? 404 : 422;
        return NextResponse.json({ ok: false, error: held.code }, { status });
      }
      return NextResponse.json({
        ok: true,
        emailSent: held.emailSent,
        alreadyNotified: held.alreadyNotified,
      });
    }
    const result = await refundTrip({ id: parsed.tripId, amountCents: parsed.amountCents });
    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : 422;
      return NextResponse.json({ ok: false, error: result.code }, { status });
    }
    return NextResponse.json({
      ok: true,
      refundId: result.refundId,
      amountCents: result.amountCents,
      emailSent: result.emailSent,
      alreadyRefunded: result.alreadyRefunded,
    });
  } catch (e) {
    console.error('[ops-bridge] refund failed:', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
