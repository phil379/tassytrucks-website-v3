import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Wheelchair Transport in Charlotte NC — Book a Ride | Tassy',
  description:
    'Wheelchair accessible transport in Charlotte NC. Securement-equipped vans, door-through-door help, companions welcome. Call (704) 941-8508.',
  alternates: { canonical: '/charlotte/wheelchair-transport' },
  openGraph: { images: ['/og-image/wheelchair-transport'] },
};

const CTA_HREF = seoBook('nemt', { source: 'seo-wc', mobility: 'wheelchair' });

export default function WheelchairTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="wheelchair transport charlotte nc"
      eyebrow="Wheelchair Transport · Charlotte, North Carolina"
      h1="Wheelchair Transport in Charlotte, NC — Accessible Rides, Door Through Door"
      heroSubtitle="Wheelchair-accessible vehicles with proper securement, drivers trained to assist, and dispatch that asks the right questions before the van ever rolls."
      quickAnswer="Wheelchair transport is a scheduled ride in a vehicle equipped with a ramp or lift and four-point securement, for riders who travel in their wheelchair. Tassy Trucks provides wheelchair-accessible transport across Charlotte and Mecklenburg County with door-through-door assistance and 24/7 dispatch at (704) 941-8508."
      ctaText="Book a wheelchair ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Wheelchair Accessible Transportation"
      sections={[
        {
          h2: 'What a wheelchair-accessible ride actually includes',
          body: (
            <>
              <p>
                A wheelchair-accessible ride is more than a van with a ramp. It
                means you board in your own chair, the chair is secured at four
                points so it cannot shift in transit, and you ride with a
                separate lap and shoulder belt — the same way every trip. The
                driver handles the ramp or lift, the securement, and the
                release at the other end. You never transfer out of your chair
                unless you choose to.
              </p>
              <p>
                Tassy Trucks runs wheelchair-accessible vehicles as a core part
                of our{' '}
                <a href="/nemt" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  non-emergency medical transportation
                </a>{' '}
                service. We are a Charlotte-based, Service-Disabled
                Veteran-Owned Small Business (SDVOSB) operating under USDOT
                #3104152 and MC #79222, with dispatch answering around the
                clock at (704) 941-8508.
              </p>
            </>
          ),
        },
        {
          h2: 'Door-through-door, not curb-to-curb',
          body: (
            <>
              <p>
                Plenty of transport companies stop at the curb. We do not. Our
                drivers come to your door, help with thresholds, ramps, and
                tight entryways, and see you through the destination&rsquo;s
                front door — to the check-in desk, not the parking lot. On the
                return trip, the driver confirms the pickup point before
                leaving, so you are not waiting outside wondering.
              </p>
              <p>
                One thing we say plainly: drivers provide courtesy assistance —
                a steady hand, help with doors and small bags, careful
                navigation of steps and curb cuts — not medical care. If a trip
                requires clinical support, that belongs to your care team, and
                dispatch will tell you honestly if a request is outside what a
                driver can safely do.
              </p>
              <p>
                Booking for a parent or spouse who uses a wheelchair? You can
                arrange everything and receive the confirmations yourself — see{' '}
                <a href="/charlotte/family-medical-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  booking for a family member
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'Wheelchair van vs. ambulance vs. rideshare',
          body: (
            <>
              <p>
                Families often ask which service they actually need, so here is
                the honest breakdown. An ambulance is for emergencies and for
                patients who must travel on a stretcher with medical monitoring
                — it is the right call when a clinician says it is, and it is
                priced accordingly. A rideshare is fine for an ambulatory rider
                in a hurry, but standard rideshare vehicles cannot secure a
                wheelchair, and the driver is not trained or expected to assist.
              </p>
              <p>
                Wheelchair transport sits in the practical middle: a scheduled,
                properly insured, securement-equipped vehicle with a trained
                driver, at a fraction of ambulance cost. For medical
                appointments, dialysis, therapy, and family events alike, it is
                usually the right tool. If your trips repeat on a schedule —
                dialysis is the classic case — our{' '}
                <a href="/charlotte/dialysis-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  dialysis transport page
                </a>{' '}
                explains how we book recurring series, and our{' '}
                <a href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  pricing page
                </a>{' '}
                shows how costs work.
              </p>
            </>
          ),
        },
        {
          h2: 'Power chairs, manual chairs, and companions',
          body: (
            <>
              <p>
                Not every wheelchair fits every vehicle, and finding that out
                at the curb is the worst possible time. So when you book,
                dispatch asks the type of chair — power or manual — and its
                rough dimensions and weight. Power chairs are heavier and often
                wider, which determines the vehicle and securement setup we
                send. Manual chairs are simpler, but we still confirm, because
                &ldquo;the right vehicle the first time&rdquo; is the whole
                point of asking.
              </p>
              <p>
                Companion riders are welcome at no drama and no surprise.
                A spouse, an adult child, or an aide can ride along in a
                standard seat — just mention it when you book so we plan the
                space. Many of our riders never travel alone, and the booking
                works exactly the same way.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive in and around Charlotte',
          body: (
            <p>
              We are based in Charlotte and cover all of Mecklenburg County —
              Uptown, South End, University City, Steele Creek, Ballantyne —
              plus Matthews, Pineville, Huntersville, Concord, and Gastonia.
              Appointments at major campuses like Atrium Health Carolinas
              Medical Center or Novant Health Presbyterian, neighborhood
              clinics, therapy offices, and family gatherings are all standard
              territory. For trips beyond that range, call (704) 941-8508 and
              dispatch will quote it straight.
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Do I have to transfer out of my wheelchair during the ride?',
          a: 'No. You board and ride in your own chair. The driver secures it at four points and fits a separate lap and shoulder belt. If you prefer to transfer to a vehicle seat and stow the chair, that works too — tell dispatch when you book.',
        },
        {
          q: 'Can you transport power wheelchairs in Charlotte?',
          a: 'Yes. When you book, dispatch asks whether your chair is power or manual, plus approximate dimensions and weight, so we send a vehicle with the right ramp or lift capacity and securement setup the first time.',
        },
        {
          q: 'Can a family member or aide ride along?',
          a: 'Yes — companion riders are welcome in a standard seat. Just mention the companion when you book so we plan the space. There is no special process; the booking works the same way.',
        },
        {
          q: 'Is wheelchair transport the same as an ambulance?',
          a: 'No. An ambulance is for emergencies and stretcher-bound patients needing medical monitoring. Wheelchair transport is a scheduled ride in a securement-equipped vehicle with a trained driver who provides courtesy assistance, not medical care — and it costs far less.',
        },
        {
          q: 'How far in advance should I book a wheelchair ride in Charlotte?',
          a: 'Booking the day before is ideal so we can guarantee the right vehicle. Same-day requests are accepted whenever an accessible vehicle is available — call (704) 941-8508 and dispatch will tell you honestly whether we can make your window.',
        },
      ]}
      relatedLinks={[
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Dialysis transport', href: '/charlotte/dialysis-transport' },
        { label: 'Book for a family member', href: '/charlotte/family-medical-rides' },
        { label: 'NEMT service overview', href: '/nemt' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
