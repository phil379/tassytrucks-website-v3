import type { Metadata } from 'next';
import Link from 'next/link';
import { looksLikeUuid } from '@/lib/school-billing';

export const dynamic = 'force-dynamic';
// Next caches identical GET fetches (Supabase reads, Stripe lookups) even here, so a repeat
// request can see a stale card status. Billing state must always be read live.
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: 'Add your card · Tassy Scholar',
  robots: { index: false, follow: false },
};

/**
 * Where a parent lands if they leave Stripe's card page without adding a card, or if
 * the page could not be opened. The booking is already saved either way, so this page's
 * only jobs are to say so plainly and to offer a fresh card page.
 */
export default function CardCancelledPage({
  searchParams,
}: {
  searchParams: { o?: string | string[]; e?: string | string[] };
}) {
  const order = Array.isArray(searchParams.o) ? searchParams.o[0] : searchParams.o;
  const problem = Array.isArray(searchParams.e) ? searchParams.e[0] : searchParams.e;
  const canRetry = looksLikeUuid(order);
  const alreadyHaveCard = problem === 'have';

  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center sm:py-24" data-testid="card-cancelled-page">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">Tassy Scholar</p>
      <h1 className="serif mt-3 text-3xl font-semibold sm:text-4xl">
        {alreadyHaveCard ? 'A card is already on file.' : 'Your booking is saved. No card was added.'}
      </h1>
      <p className="mt-4 text-sm text-[color:var(--ink-soft)]">
        {alreadyHaveCard
          ? 'You do not need to do anything else. Nothing has been charged.'
          : 'Nothing has been charged. We confirm your price and your driver before the first ride, and we need a card on file to start billing after that.'}
      </p>

      {!alreadyHaveCard && canRetry && (
        <p className="mt-6">
          <a
            href={`/api/school-card?o=${encodeURIComponent(order as string)}`}
            className="btn-primary inline-flex min-h-[44px] items-center"
            data-testid="retry-card"
          >
            Add your card
          </a>
        </p>
      )}
      {problem === 'unavailable' && (
        <p className="mt-4 text-sm text-[color:var(--ink-soft)]">
          The card page is not available right now. Please try again in a few minutes, or call us.
        </p>
      )}

      <p className="mt-6 text-sm">
        Questions? <a className="underline" href="tel:+17049418508">(704) 941-8508</a>
      </p>
      <p className="mt-8">
        <Link href="/school" className="text-sm underline">Back to Tassy Scholar</Link>
      </p>
    </div>
  );
}
