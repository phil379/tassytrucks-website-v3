'use client';

import './globals.css';

// MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN — root error boundary. Only fires when the
// root layout itself throws, so it must render its own <html>/<body>. Kept
// dependency-free (no Header/Footer, which may be the thing that failed).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <section className="container-x py-28 lg:py-36 text-center">
          <h1 className="h-display mt-4">We hit a bump in the road.</h1>
          <p className="mt-5 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
            Something went wrong on our end. Please try again, or call dispatch at
            (704)&nbsp;941-8508.
          </p>
          <div className="mt-10 flex gap-3 flex-wrap justify-center">
            <button onClick={reset} className="btn-gold">
              Try again
            </button>
            <a href="/" className="btn-ghost">
              Back home
            </a>
          </div>
        </section>
      </body>
    </html>
  );
}
