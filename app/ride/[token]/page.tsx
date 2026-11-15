import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { loadRidePage, rideTrackingEnabled, type RidePageResult } from '@/lib/ride-link';
import RideStatusView, { NeutralRidePage } from '@/components/ride/RideStatusView';
import RideMessageForm from '@/components/ride/RideMessageForm';

/**
 * /ride/<token>: "where is my ride", the page texted to the rider (and family numbers on the
 * booking) when a trip is assigned. No login: the 43-character random token is the only key, and
 * only its sha256 is stored. See lib/ride-link.ts for what may and may not be shown.
 *
 * A wrong token, an expired or revoked one, a cancelled trip, a database error, too many requests
 * and the flag being off all render the SAME neutral page with the same 200 status, so the page
 * cannot be used to tell a real link from a guessed one. Never indexed, never cached, no referrer.
 *
 * A live ride page also carries the "Message dispatch about this ride" form (rider messaging):
 * the rider writes, dispatch answers from the TassyOps inbox, the reply goes out by email. The
 * form appears only when public.rider_messages exists (RMSG_01); until then the same section
 * shows a plain call-us note instead. A neutral page never shows either — see messagingAvailable.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Your ride · Tassy Transportation' },
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

async function resolve(token: string): Promise<RidePageResult> {
  if (!rideTrackingEnabled()) return { kind: 'neutral' };
  const limit = Number(process.env.RIDE_PAGE_RATE_LIMIT ?? 60);
  if (!rateLimit(`ride-page:${clientIp(headers())}`, Number.isFinite(limit) && limit > 0 ? limit : 60, 60_000).ok) {
    return { kind: 'neutral' };
  }
  try {
    // Imported here so the flag-off page never touches the service-role client.
    const [{ supabaseAdmin }, { supabaseRideStore }] = await Promise.all([
      import('@/lib/supabase-admin'),
      import('@/lib/ride-link.server'),
    ]);
    return await loadRidePage({ store: supabaseRideStore(supabaseAdmin()), token, enabled: true });
  } catch (e) {
    console.error('[ride-link] page failed:', (e as Error).message);
    return { kind: 'neutral' };
  }
}

/**
 * May this ride page offer the message form? Only ever asked for a page that already resolved
 * to a live ride, so a wrong or dead token never reaches the rider_messages probe, and the
 * neutral page stays byte-for-byte what it was. Any failure — above all the table not existing
 * yet (RMSG_01 not applied) — reads as "not available" and the page shows the call-us note.
 */
async function messagingAvailable(token: string): Promise<boolean> {
  try {
    const [{ supabaseAdmin }, { supabaseRideStore }, msgs] = await Promise.all([
      import('@/lib/supabase-admin'),
      import('@/lib/ride-link.server'),
      import('@/lib/rider-messages.server'),
    ]);
    const db = supabaseAdmin();
    const target = await msgs.resolveRiderMessageTarget({ store: supabaseRideStore(db), token });
    if (!target) return false;
    return await msgs.riderMessagingAvailable(db, target.tripId);
  } catch (e) {
    console.error('[rider-messages] availability check failed:', (e as Error).message);
    return false;
  }
}

export default async function RidePage({ params }: { params: { token: string } }) {
  const result = await resolve(params.token);
  const messaging = result.kind === 'ride' ? await messagingAvailable(params.token) : null;
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-xl px-4">
        <div className="card-tile p-6 sm:p-8">
          {result.kind === 'ride' ? <RideStatusView view={result.view} /> : <NeutralRidePage />}
          {result.kind === 'ride' &&
            (messaging ? (
              <RideMessageForm token={params.token} />
            ) : (
              <p className="ink-soft mt-8 border-t border-line pt-6 text-sm">
                Messaging is not available for this ride — please call{' '}
                <a className="underline" href="tel:+17049418508">(704) 941-8508</a>.
              </p>
            ))}
        </div>
      </div>
    </section>
  );
}
