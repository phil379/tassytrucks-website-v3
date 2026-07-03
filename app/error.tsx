'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

// MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN — branded route-level error boundary.
// Replaces Next's stock error screen; keeps the Header/Footer shell and offers
// recovery (retry + home) instead of a dead end.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="container-x py-28 lg:py-36 text-center">
      <div className="eyebrow gold-text">Something went wrong</div>
      <h1 className="h-display mt-4">We hit a bump in the road.</h1>
      <p className="mt-5 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
        An unexpected error interrupted this page. Try again, or head back home &mdash; our
        dispatch line is always open at{' '}
        <a href="tel:+17049418508" className="gold-text underline underline-offset-2">
          (704)&nbsp;941-8508
        </a>
        .
      </p>
      <div className="mt-10 flex gap-3 flex-wrap justify-center">
        <button onClick={reset} className="btn-gold">
          Try again <RefreshCw size={16} />
        </button>
        <Link href="/" className="btn-ghost">
          Back home
        </Link>
      </div>
    </section>
  );
}
