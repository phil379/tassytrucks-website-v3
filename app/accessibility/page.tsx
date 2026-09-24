import type { Metadata } from 'next';

// MEGA_TASSY_PUBLISH_READY (2026-07-02) — footer linked /accessibility but no route existed (404).
export const metadata: Metadata = {
  title: 'Accessibility',
  description:
    'Tassy Transportation accessibility: ADA-compliant wheelchair vehicles, door-through-door assistance & a website built to WCAG 2.1 AA. Charlotte, NC.',
  alternates: { canonical: '/accessibility' },
  robots: { index: true, follow: true },
};

export default function AccessibilityPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Our commitment</div>
        <h1 className="h-section mt-3">Accessibility</h1>
        <p className="mt-3 text-sm ink-mute">Last updated: July 2, 2026</p>

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
              We aim for WCAG 2.1 AA conformance: semantic headings, sufficient color contrast,
              keyboard-navigable menus, text alternatives on images, and motion kept subtle. We
              review the site as it changes, and we treat accessibility problems as bugs.
            </p>
          </div>

          <div>
            <h2 className="serif text-2xl font-semibold">Tell us if something is hard to use</h2>
            <p className="mt-3 ink-soft leading-relaxed">
              If any part of this site or our booking process is difficult to use with assistive
              technology — or you simply prefer to book by phone — call{' '}
              <a href="tel:+17049418508" className="underline underline-offset-2">(704) 941-8508</a>{' '}
              (24/7 dispatch) or email{' '}
              <a href="mailto:book@tassytrucks.com" className="underline underline-offset-2">book@tassytrucks.com</a>.
              A person answers, and we will complete your booking for you.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
