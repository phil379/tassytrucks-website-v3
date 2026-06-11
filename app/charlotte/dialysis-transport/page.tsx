import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Dialysis Transport in Charlotte NC — Recurring Rides | Tassy',
  description:
    'Recurring dialysis rides in Charlotte NC — M-W-F or T-Th-Sa schedules, door-to-door, wheelchair accessible. Veteran-owned. Call (704) 941-8508.',
  alternates: { canonical: '/charlotte/dialysis-transport' },
  openGraph: { images: ['/og-image/dialysis-transport'] },
};

const CTA_HREF = seoBook('nemt', { source: 'seo-dialysis', recurring: '1' });

export default function DialysisTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="dialysis transport charlotte"
      eyebrow="Dialysis Transport · Charlotte, North Carolina"
      h1="Dialysis Transport in Charlotte — Rides That Match Your Treatment Schedule"
      heroSubtitle="Recurring, door-to-door rides for Charlotte dialysis patients — booked once as a series, with the same pickup window and a driver who knows your routine."
      quickAnswer="Dialysis transport is scheduled, recurring transportation to and from dialysis treatment — typically three days a week, every week. Tassy Trucks books the entire Monday-Wednesday-Friday or Tuesday-Thursday-Saturday series in one call, with door-to-door service across Charlotte and Mecklenburg County and 24/7 dispatch at (704) 941-8508."
      ctaText="Set up recurring rides"
      ctaHref={CTA_HREF}
      schemaServiceType="Dialysis Patient Transportation"
      sections={[
        {
          h2: 'Why dialysis rides are not ordinary rides',
          body: (
            <>
              <p>
                Dialysis is not one appointment. It is the same appointment,
                three times a week, for as long as treatment lasts. Miss a
                session because a ride fell through and the consequences are
                real — rescheduling is hard, and skipping is not an option your
                care team wants on the table. That is why dialysis transport is
                its own discipline inside{' '}
                <a href="/nemt" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  non-emergency medical transportation
                </a>
                , not just another trip on the schedule.
              </p>
              <p>
                The ride home matters as much as the ride there. After three to
                four hours in the chair, most patients are tired — sometimes
                lightheaded, sometimes just drained. A driver who knows that,
                waits without being chased down, and walks you to your own front
                door is the difference between transport that works and
                transport you have to manage.
              </p>
              <p>
                Tassy Trucks is a Charlotte-based, Service-Disabled
                Veteran-Owned Small Business (SDVOSB) operating under USDOT
                #3104152 and MC #79222. Recurring medical rides are the core of
                what we do, not an add-on.
              </p>
            </>
          ),
        },
        {
          h2: 'Book the whole series once — M-W-F or T-Th-Sa',
          body: (
            <>
              <p>
                Most Charlotte dialysis patients run on one of two rhythms:
                Monday-Wednesday-Friday or Tuesday-Thursday-Saturday. We set up
                the entire recurring series in a single call or booking — same
                pickup window, same destination, every treatment day. You never
                re-book, and you never wonder whether tomorrow&rsquo;s ride
                exists.
              </p>
              <p>
                If your treatment time changes, one call updates the whole
                series. If you have a one-off conflict — a holiday shift at the
                center, a doctor visit on an off day — dispatch adjusts that
                single trip without touching the rest of your schedule. And
                because dispatch answers 24/7 at (704) 941-8508, a 5:30 a.m.
                first-shift chair time is not a problem.
              </p>
              <p>
                Recurring riders also get pricing that reflects the commitment.
                See our{' '}
                <a href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  pricing page
                </a>{' '}
                or ask dispatch to quote your exact route.
              </p>
            </>
          ),
        },
        {
          h2: 'Same driver, small courtesies, no surprises',
          body: (
            <>
              <p>
                Whenever schedules allow, we assign the same driver to a
                recurring dialysis series. Familiarity is not a luxury here — a
                driver who already knows your building, your walker, and your
                preferred door makes every pickup faster and calmer, and it
                gives family members one consistent face to recognize.
              </p>
              <p>
                Our drivers also learn the small things that matter to dialysis
                patients. If you have a fistula or graft in one arm, the driver
                will offer a steadying arm on your non-access side as a simple
                courtesy. To be clear about what that is and is not: our drivers
                provide courtesy assistance — an arm to hold, help with doors
                and steps, carrying a small bag — not medical care. Anything
                clinical stays with your care team at the center.
              </p>
              <p>
                Riders who use a wheelchair full-time or on tired days ride in
                our wheelchair-accessible vehicles with proper securement —
                details on our{' '}
                <a href="/charlotte/wheelchair-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  wheelchair transport page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'For family caregivers and dialysis center social workers',
          body: (
            <>
              <p>
                A lot of dialysis transport is arranged by someone other than
                the patient. If you are a son or daughter coordinating rides for
                a parent in Charlotte, Matthews, or Huntersville, you can book
                the series on their behalf and receive the confirmations and
                driver updates yourself — they just get the ride.
              </p>
              <p>
                If you are a social worker or scheduler at a dialysis center,
                you know the cost of a transport no-show: a missed chair, a
                scrambled schedule, a patient who falls behind on treatment. We
                work with facility coordinators across Mecklenburg County
                through direct partnerships and a booking portal built for
                recurring patients. Our{' '}
                <a href="/partners" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  facility partnership page
                </a>{' '}
                explains how to set that up, or email booking@tassytrucks.com
                and we will walk you through it.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive dialysis patients',
          body: (
            <p>
              Our home base is Charlotte and we cover all of Mecklenburg County,
              plus Matthews, Pineville, Huntersville, Concord, and Gastonia.
              Whether your treatments are at a neighborhood dialysis clinic in
              University City or near a major campus like Atrium Health
              Carolinas Medical Center or Novant Health Presbyterian, the route
              is familiar territory. If you live just outside our standard
              range, call — recurring dialysis routes are exactly the kind of
              trip we quote case by case.
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Can I set up a standing Monday-Wednesday-Friday dialysis ride in Charlotte?',
          a: 'Yes — that is the most common booking we take. We schedule the entire recurring series at once, M-W-F or T-Th-Sa, with the same pickup window each treatment day. One call to (704) 941-8508 sets it up; one call changes it.',
        },
        {
          q: 'Will I have the same driver for every dialysis trip?',
          a: 'Whenever scheduling allows, yes. We assign a consistent driver to recurring dialysis series so pickups stay fast and familiar. If your regular driver is out, dispatch briefs the substitute on your routine before the pickup.',
        },
        {
          q: 'What if I feel weak or tired after my treatment?',
          a: 'That is normal after dialysis, and our drivers plan for it. They wait for you at the center, offer a steadying arm on your non-access side, and walk you to your own door — not the curb. Drivers provide courtesy assistance, not medical care; if you feel unwell beyond the usual fatigue, tell the center staff before leaving.',
        },
        {
          q: 'Do you have wheelchair-accessible vehicles for dialysis rides?',
          a: 'Yes. If you use a wheelchair full-time, or only on treatment days when you are too tired to walk far, we will put your series in a wheelchair-accessible vehicle with proper securement. Tell dispatch when you book so the right vehicle shows up every time.',
        },
        {
          q: 'How do dialysis centers partner with Tassy Trucks?',
          a: 'Social workers and schedulers can set up a facility partnership with portal access for booking recurring patients. Email booking@tassytrucks.com or call (704) 941-8508 and ask for facility partnerships — we serve centers across Charlotte and Mecklenburg County.',
        },
      ]}
      relatedLinks={[
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Wheelchair transport', href: '/charlotte/wheelchair-transport' },
        { label: 'NEMT service overview', href: '/nemt' },
        { label: 'Facility partnerships', href: '/partners' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
