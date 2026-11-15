'use server';

import { headers } from 'next/headers';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { rideTrackingEnabled } from '@/lib/ride-link';

export type RiderMessageResult = { ok: true } | { ok: false; error: string };

/** Max a rider can send at once. Matches the facility composer and the column CHECK. */
const MAX = 4000;

/** The one answer for "this cannot be done here" — flag off, dead token, table missing. */
const NOT_AVAILABLE = 'Messaging is not available for this ride — please call (704) 941-8508.';

/**
 * The send behind the "Message dispatch about this ride" form on
 * /ride/<token>. The token in the form is the same one in the page URL —
 * it is the only credential this page has ever had, and everything about
 * the trip (id, rider name) is resolved from it server-side. The rider is
 * never asked to re-enter a name, email or phone, and nothing about them
 * is sent back.
 */
export async function sendRiderMessage(formData: FormData): Promise<RiderMessageResult> {
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { ok: false, error: 'Write a message first.' };
  if (body.length > MAX) return { ok: false, error: 'That message is too long — please shorten it.' };
  if (!rideTrackingEnabled()) return { ok: false, error: NOT_AVAILABLE };

  // Same shape as the booking limits (lib/rate-limit.ts): 5 sends an hour
  // per connection. A speed bump against form spam, not a security control.
  if (!rateLimit(`ride-message:${clientIp(headers())}`, 5, 60 * 60 * 1000).ok) {
    return {
      ok: false,
      error: 'You have sent several messages in a row. For anything urgent, call (704) 941-8508.',
    };
  }

  const token = String(formData.get('token') ?? '');
  try {
    // Imported here so the flag-off path never touches the service-role client,
    // the same lazy-import pattern as the ride page itself.
    const [{ supabaseAdmin }, { supabaseRideStore }, msgs] = await Promise.all([
      import('@/lib/supabase-admin'),
      import('@/lib/ride-link.server'),
      import('@/lib/rider-messages.server'),
    ]);
    const db = supabaseAdmin();
    const target = await msgs.resolveRiderMessageTarget({ store: supabaseRideStore(db), token });
    if (!target) return { ok: false, error: NOT_AVAILABLE };
    const sent = await msgs.insertRiderMessage(db, { tripId: target.tripId, body });
    if (!sent.ok) return { ok: false, error: NOT_AVAILABLE };
    return { ok: true };
  } catch (e) {
    console.error('[rider-messages] send failed:', (e as Error).message);
    return { ok: false, error: NOT_AVAILABLE };
  }
}
