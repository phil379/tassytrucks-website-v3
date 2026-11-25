import { Play } from 'lucide-react';

/**
 * "How to Book a Ride" — the step-by-step booking walk-through Phil asked
 * for on 2026-11-19 and approved for the homepage + /request on 2026-11-25.
 *
 * Native <video>, self-hosted (public/videos/), no autoplay and no
 * third-party embed: nothing loads until the visitor presses play
 * (preload="none" + poster). The frame is a phone-width card in the site's
 * own surfaces (#161b22 card on the #0d1117 canvas, hairline border) so it
 * sits the same on the dark homepage and the dark /request page.
 *
 * Two placements:
 *  - `section`  — homepage block under the hero, next to the booking story.
 *  - `details`  — /request, collapsed by default above the form so a
 *    returning rider is never blocked; a native <details> needs no JS and
 *    cannot intercept form interactions while closed.
 */
export default function HowToBookVideo({
  variant = 'section',
}: {
  variant?: 'section' | 'details';
}) {
  const player = (
    <div className="mx-auto w-full max-w-[340px] rounded-[1.4rem] border border-line bg-[#161b22] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <video
        className="block h-auto w-full rounded-[1rem]"
        width={720}
        height={1280}
        controls
        preload="none"
        poster="/videos/how-to-book-a-ride-poster.jpg"
        playsInline
        aria-label="Video: how to book a ride with Tassy Transportation, step by step"
      >
        <source src="/videos/how-to-book-a-ride.mp4" type="video/mp4" />
        Your browser cannot play this video — you can{' '}
        <a href="/videos/how-to-book-a-ride.mp4" className="underline">
          download it here
        </a>{' '}
        instead.
      </video>
    </div>
  );

  if (variant === 'details') {
    return (
      <details className="group mt-8 rounded-2xl border border-line bg-[#161b22] px-5 py-4 sm:px-6">
        <summary className="tap-target cursor-pointer list-none items-center gap-2.5 font-medium [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2.5">
            <Play size={16} className="gold-text shrink-0" aria-hidden />
            <span>
              New here? Watch how booking works{' '}
              <span className="ink-mute">(about a minute)</span>
            </span>
          </span>
        </summary>
        <div className="pt-4">{player}</div>
      </details>
    );
  }

  return (
    <section aria-labelledby="how-to-book-heading" className="border-b border-line">
      <div className="container-x py-14 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow gold-text mb-3">Booking, step by step</div>
          <h2 id="how-to-book-heading" className="serif text-3xl lg:text-4xl font-semibold leading-tight">
            See how booking works
          </h2>
          <p className="ink-soft mt-3 leading-relaxed">
            Two minutes, start to finish — pick your service, tell us where and
            when, and see your flat price before you book.
          </p>
        </div>
        <div className="mt-8">{player}</div>
      </div>
    </section>
  );
}
