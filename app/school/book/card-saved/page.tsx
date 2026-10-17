import type { Metadata } from 'next';
import Link from 'next/link';
import { looksLikeSessionId, recordCardFromSession } from '@/lib/school-billing';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
// Next caches identical GET fetches (Supabase reads, Stripe lookups) even here, so a repeat
// request can see a stale card status. Billing state must always be read live.
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: 'Card saved · Tassy Scholar',
  // A parent mid-booking. Nothing here belongs in an index.
  robots: { index: false, follow: false },
};

type Outcome = { state: 'saved'; label: string | null } | { state: 'finishing' } | { state: 'unconfirmed' };

/**
 * Where Stripe sends a parent after they add a card.
 *
 * The page does the same recording the webhook does, so the parent sees the truth
 * immediately; whichever runs second is a harmless no-op. If our database cannot be
 * reached the card is still safe in Stripe and the webhook retries, so that case says
 * "finishing" rather than showing a failure the parent cannot act on.
 */
async function resolve(sessionId: string | undefined): Promise<Outcome> {
  if (!looksLikeSessionId(sessionId)) return { state: 'unconfirmed' };
  try {
    const result = await recordCardFromSession(supabaseAdmin(), sessionId);
    if (result.ok) {
      const label = result.last4 ? `${result.brand ? capitalize(result.brand) : 'Card'} ending ${result.last4}` : null;
      return { state: 'saved', label };
    }
    if (result.reason === 'db_error' || result.reason === 'stripe_error') return { state: 'finishing' };
    return { state: 'unconfirmed' };
  } catch (e) {
    console.error('[card-saved] could not confirm card:', (e as Error).message);
    return { state: 'finishing' };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function CardSavedPage({
  searchParams,
}: {
  searchParams: { session_id?: string | string[] };
}) {
  const raw = Array.isArray(searchParams.session_id) ? searchParams.session_id[0] : searchParams.session_id;
  const outcome = await resolve(raw);

  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center sm:py-24" data-testid="card-saved-page" data-state={outcome.state}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">Tassy Scholar</p>

      {outcome.state === 'saved' && (
        <>
          <h1 className="serif mt-3 text-3xl font-semibold sm:text-4xl">Your card is saved.</h1>
          {outcome.label && <p className="mt-3 text-sm text-[color:var(--ink-soft)]">{outcome.label}</p>}
          <p className="mt-4 text-sm text-[color:var(--ink-soft)]">
            <strong>Nothing has been charged.</strong> We confirm your price and your driver before the first ride,
            and billing starts only after that.
          </p>
        </>
      )}

      {outcome.state === 'finishing' && (
        <>
          <h1 className="serif mt-3 text-3xl font-semibold sm:text-4xl">Your card was added.</h1>
          <p className="mt-4 text-sm text-[color:var(--ink-soft)]">
            We are finishing the setup on our side. You do not need to do anything, and nothing has been charged.
          </p>
        </>
      )}

      {outcome.state === 'unconfirmed' && (
        <>
          <h1 className="serif mt-3 text-3xl font-semibold sm:text-4xl">Your booking is saved.</h1>
          <p className="mt-4 text-sm text-[color:var(--ink-soft)]">
            We could not confirm a card on this visit. Nothing has been charged. We will contact you to add one, or you can
            call us.
          </p>
        </>
      )}

      <p className="mt-6 text-sm">
        Questions? <a className="underline" href="tel:+17049418508">(704) 941-8508</a>
      </p>
      <p className="mt-8">
        <Link href="/school" className="btn-primary inline-flex min-h-[44px] items-center">
          Back to Tassy Scholar
        </Link>
      </p>
    </div>
  );
}
