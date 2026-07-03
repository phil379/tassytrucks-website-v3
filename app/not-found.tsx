import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { book } from '@/lib/saas-links';

// MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN — branded 404. Before this, an unknown
// route rendered Next's stark default page (no header/footer/brand). Now it
// lives inside the layout shell (Header + Footer) and routes visitors back to
// value (home + the booking picker) instead of a dead end.
export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="container-x py-28 lg:py-36 text-center">
      <div className="eyebrow gold-text">Error 404</div>
      <h1 className="h-display mt-4">This page took a wrong turn.</h1>
      <p className="mt-5 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved. Let&rsquo;s get you
        back on the road.
      </p>
      <div className="mt-10 flex gap-3 flex-wrap justify-center">
        <Link href="/" className="btn-gold">
          Back home <ArrowRight size={16} />
        </Link>
        <a href={book.ride} className="btn-ghost">
          Book a ride
        </a>
      </div>
      <p className="mt-10 serif italic text-lg ink-soft">
        We Transport With Care<span className="gold-text">.</span>
      </p>
    </section>
  );
}
