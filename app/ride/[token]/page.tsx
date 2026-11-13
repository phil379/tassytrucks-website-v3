import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { loadRidePage, rideTrackingEnabled, type RidePageResult } from '@/lib/ride-link';
import RideStatusView, { NeutralRidePage } from '@/components/ride/RideStatusView';

/**
 * /ride/<token>: "where is my ride", the page texted to the rider (and family numbers on the
 * booking) when a trip is assigned. No login: the 43-character random token is the only key, and
 * only its sha256 is stored. See lib/ride-link.ts for what may and may not be shown.
 *
 * A wrong token, an expired or revoked one, a cancelled trip, a database error, too many requests
 * and the flag being off all render the SAME neutral page with the same 200 status, so the page
 * cannot be used to tell a real link from a guessed one. Never indexed, never cached, no referrer.
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

export default async function RidePage({ params }: { params: { token: string } }) {
  const result = await resolve(params.token);
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-xl px-4">
        <div className="card-tile p-6 sm:p-8">
          {result.kind === 'ride' ? <RideStatusView view={result.view} /> : <NeutralRidePage />}
        </div>
      </div>
    </section>
  );
}
