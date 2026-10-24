import type { Metadata } from 'next';

// MEGA_TASSY_PUBLISH_READY (2026-07-02) — footer linked /accessibility but no route existed (404).
export const metadata: Metadata = {
  title: 'Accessibility',
  description:
    'Accessibility at Tassy Transportation: wheelchair rides, help booking by phone or email, and what we are doing to improve this website. Charlotte, NC.',
  alternates: { canonical: '/accessibility' },
  robots: { index: true, follow: true },
};

export default function AccessibilityPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Our commitment</div>
        <h1 className="h-section mt-3">Accessibility</h1>
        <p className="mt-3 text-sm ink-mute">Last updated: October 24, 2026</p>

        <div className="mt-8 space-y-10">
          <div>
            <h2 className="serif text-2xl font-semibold">On the road</h2>
            <p className="mt-3 ink-soft leading-relaxed">
              Accessible transportation is our core business, not an add-on. Wheelchair trips
              (Tassy Care WAV) are run in ramp-equipped vehicles from our partner network, with an
              operator trained in securement — you stay in your chair for the whole trip, and we
              quote the route on the call. Every other trip is door-through-door as standard. Tell
              us what you need when you book — mobility equipment, a service animal, extra time,
              or a caregiver riding along — and we will plan the trip around it at no extra charge
              for the accommodation itself.
            </p>
          </div>

          <div>
            <h2 className="serif text-2xl font-semibold">On this website</h2>
            <p className="mt-3 ink-soft leading-relaxed">
              We are working toward the Web Content Accessibility Guidelines (WCAG) 2.1, level AA. We run
              automated accessibility checks every time the site changes and test by keyboard, but we have
              not yet had an outside accessibility audit, and we do not claim the site is fully accessible.
              We treat accessibility problems as bugs.
            </p>
          </div>

          <div>
            <h2 className="serif text-2xl font-semibold">Known gaps we are working on</h2>
            <ul className="mt-3 ink-soft leading-relaxed list-disc pl-6 space-y-2">
              <li>
                Some forms in the signed-in facility portal do not yet tie every error message to its field
                for screen readers.
              </li>
              <li>
                A moving map on the home page has no pause button. It stops on its own if your device is set
                to reduce motion.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="serif text-2xl font-semibold">Ask for help or an accessible alternative</h2>
            <p className="mt-3 ink-soft leading-relaxed">
              If any part of this site or our booking process is difficult to use with assistive
              technology, you do not have to use the website at all. Call{' '}
              <a href="tel:+17049418508" className="underline underline-offset-2 inline-flex min-h-[44px] items-center">(704) 941-8508</a>{' '}
              or email{' '}
              <a href="mailto:book@tassytrucks.com" className="underline underline-offset-2 inline-flex min-h-[44px] items-center">book@tassytrucks.com</a>.
              A person will complete your booking for you, send information in another format, or answer
              any question. Tell us the page and what went wrong and we will fix it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
