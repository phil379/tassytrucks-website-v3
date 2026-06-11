import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Best NEMT Providers in Charlotte — How to Choose | Tassy',
  description:
    'How to evaluate NEMT providers in Charlotte NC: licensing, insurance, driver training, reliability — and how Tassy Trucks measures up. (704) 941-8508.',
  alternates: { canonical: '/charlotte/best-nemt-providers' },
  openGraph: { images: ['/og-image/best-nemt-providers'] },
};

const CTA_HREF = seoBook('nemt', { source: 'seo-best' });

export default function BestNemtProvidersPage() {
  return (
    <LandingPageShell
      primaryKeyword="best nemt providers charlotte"
      eyebrow="NEMT Buyer&rsquo;s Guide · Charlotte, North Carolina"
      h1="Best NEMT Providers in Charlotte: How to Actually Choose One"
      heroSubtitle="A plain-English checklist for vetting any medical transport company in Mecklenburg County — then judge us by the same standard."
      quickAnswer="The best NEMT providers in Charlotte share traits you can verify before booking: active USDOT and MC operating authority, current insurance certificates, trained drivers, a dependable on-time record, 24/7 reachability, and wheelchair-accessible vehicles. This page walks through that checklist so you can evaluate any provider. Tassy Trucks is a Charlotte-based, veteran-owned NEMT provider — USDOT #3104152, MC #79222."
      ctaText="Try Tassy for your next ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Non-Emergency Medical Transportation"
      sections={[
        {
          h2: 'Start with licensing and insurance — the non-negotiables',
          body: (
            <>
              <p>
                Every legitimate medical transport company operating for hire
                should be able to give you two numbers without hesitation: a
                USDOT number and, where applicable, an MC (motor carrier)
                number. Those numbers are public. You can enter them in the
                FMCSA&rsquo;s free SAFER lookup and see for yourself whether
                the authority is active and registered to the company name on
                the website. If a provider can&rsquo;t — or won&rsquo;t — give
                you those numbers, that is your answer.
              </p>
              <p>
                Insurance is the second gate. Ask for a current certificate of
                insurance, the same document hospitals and facilities require
                before signing a transport contract. A professional provider
                will send it the same day without acting like you asked for
                something unusual. You are putting a parent, a spouse, or
                yourself in this vehicle; you are allowed to ask who covers it.
              </p>
            </>
          ),
        },
        {
          h2: 'Ask about the drivers, not just the vehicles',
          body: (
            <>
              <p>
                Photos of clean vans are easy. What matters is the person
                behind the wheel. Ask how drivers are trained: do they know how
                to assist a rider with a walker on entry steps, secure a
                wheelchair correctly, and recognize when a passenger needs
                help versus space? Ask whether door-to-door service is the
                standard or an upcharge — a curb-to-curb driver who watches a
                rider struggle up their own front steps is not providing
                medical transport in any meaningful sense.
              </p>
              <p>
                Wheelchair capability deserves its own question. Some companies
                advertise it but run one accessible vehicle for an entire
                metro. If your rider uses a wheelchair full-time, ask
                specifically how the chair is secured and what happens if the
                accessible vehicle is already booked. You can see how we
                approach this on our{' '}
                <a href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Charlotte NEMT page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'Reliability you can test before you depend on it',
          body: (
            <>
              <p>
                On-time performance is the whole product. A dialysis patient in
                Pineville who is picked up forty minutes late doesn&rsquo;t get
                a shorter treatment — they lose the slot. Before you commit a
                standing schedule to any provider, ask how they handle a late
                vehicle, whether they confirm return pickups before the driver
                leaves, and what their plan is when traffic on I-77 or
                Independence does what it always does.
              </p>
              <p>
                Then test reachability. Call the dispatch line at 9 p.m. on a
                weekday. Does a person answer, or a voicemail box? Medical
                schedules do not keep business hours, and a provider you
                can&rsquo;t reach after five is a provider who can&rsquo;t fix
                a problem after five. Finally, ask about recurring scheduling:
                the best providers will book an entire series — every
                Monday-Wednesday-Friday for months — in one conversation, so
                nobody has to re-book week after week.
              </p>
            </>
          ),
        },
        {
          h2: 'Direct provider or broker? Know who actually drives',
          body: (
            <>
              <p>
                Some companies you find online never put a vehicle on the road.
                They are brokers: they take your booking and resell the trip to
                whichever local operator accepts it. Brokers serve a real
                purpose in Medicaid systems, but for a family arranging private
                rides, the distinction matters. With a broker, the company you
                called is not the company that shows up, and accountability can
                evaporate between the two. With a direct provider, the
                dispatcher, the driver, and the vehicle all answer to the same
                name.
              </p>
              <p>
                Ask plainly: &ldquo;Do your own drivers and vehicles run this
                trip, or do you contract it out?&rdquo; Facilities ask us this
                in every contracting conversation — our{' '}
                <a href="/partners" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  facility partnership page
                </a>{' '}
                covers how those relationships work. And if you are weighing
                NEMT against app-based options, our{' '}
                <a href="/compare/tassy-vs-uber-health-vs-lyft-healthcare" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  comparison guide
                </a>{' '}
                lays out the differences honestly.
              </p>
            </>
          ),
        },
        {
          h2: 'How Tassy Trucks measures against this checklist',
          body: (
            <>
              <p>
                We will not tell you we are the best NEMT provider in Charlotte
                — that is yours to decide, and any company that crowns itself
                has already failed the honesty test. Here is where we stand on
                each item above. Licensing: USDOT #3104152 and MC #79222, both
                public, both checkable tonight. Certification: Service-Disabled
                Veteran-Owned Small Business (SDVOSB). Insurance: certificates
                available on request, same as we provide to facility partners.
              </p>
              <p>
                Operations: door-to-door is our standard, not an add-on. We run
                wheelchair-accessible vehicles, book recurring series in a
                single call, and staff our dispatch line 24/7 at (704)
                941-8508 — call it at an odd hour and see who picks up. We are
                a direct provider based in Charlotte, serving all of
                Mecklenburg County plus Matthews, Huntersville, Concord, and
                Gastonia. Put us through the same checklist you would apply to
                anyone else; that is exactly how we want to be chosen.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'How do I verify a NEMT provider’s USDOT number?',
          a: 'Use the FMCSA SAFER company snapshot tool — it is free and public. Enter the USDOT number and confirm the operating status is active and the legal name matches the company you are talking to. Tassy Trucks operates under USDOT #3104152 and MC #79222.',
        },
        {
          q: 'What is the difference between a NEMT provider and a NEMT broker?',
          a: 'A provider owns the vehicles and employs the drivers who run your trip. A broker takes bookings and assigns them to third-party operators. Neither is inherently bad, but with a broker the company you booked is not the company that arrives, which can complicate accountability when something goes wrong.',
        },
        {
          q: 'What questions should I ask a NEMT company before booking?',
          a: 'Five good ones: What are your USDOT and MC numbers? Can you send a current insurance certificate? Is door-to-door standard? Do you have wheelchair-accessible vehicles available on my schedule? And who answers the phone if my pickup runs late at night?',
        },
        {
          q: 'Does the best NEMT provider mean the most expensive one?',
          a: 'No. Price should track the service level — wheelchair securement, door-to-door assistance, recurring scheduling — not marketing. Get a clear quote in writing before the first ride; our pricing page explains how we structure ours.',
        },
        {
          q: 'Can I switch NEMT providers if my current one keeps running late?',
          a: 'Yes, at any time — you are not locked in, even for recurring schedules. Bring your standing appointment list to the new provider and have the full series rebooked in one call. We do this for new riders regularly at (704) 941-8508.',
        },
      ]}
      relatedLinks={[
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Tassy vs. Uber Health vs. Lyft Healthcare', href: '/compare/tassy-vs-uber-health-vs-lyft-healthcare' },
        { label: 'Facility partnerships', href: '/partners' },
        { label: 'NEMT service overview', href: '/nemt' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
