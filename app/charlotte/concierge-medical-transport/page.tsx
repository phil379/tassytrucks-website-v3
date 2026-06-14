import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Concierge Medical Transport in Charlotte NC | Tassy',
  description:
    'Discreet, white-glove concierge medical transport in Charlotte NC for plastic surgery and aesthetic patients. Private rides, 24/7 — (704) 941-8508.',
  alternates: { canonical: '/charlotte/concierge-medical-transport' },
  openGraph: { images: ['/og-image/concierge-medical-transport'] },
};

const CTA_HREF = seoBook('vip', { source: 'seo-concierge' });

export default function ConciergeMedicalTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="concierge medical transport"
      eyebrow="VIP Concierge · Charlotte, North Carolina"
      h1="Concierge Medical Transport in Charlotte — Private, Discreet, Door to Door"
      heroSubtitle="White-glove transportation for plastic surgery, aesthetic, and med-spa patients — and anyone in Charlotte who wants their medical ride handled quietly and well."
      quickAnswer="Concierge medical transport is private, white-glove transportation to and from medical appointments and procedures — one rider, one dedicated driver, no shared vehicles, no strangers. Tassy Transportation runs a dedicated VIP concierge service for plastic surgery, aesthetic, and med-spa patients across Charlotte and Mecklenburg County. Book online or call 24/7 dispatch at (704) 941-8508."
      ctaText="Book concierge transport"
      ctaHref={CTA_HREF}
      schemaServiceType="Concierge Medical Transportation"
      sections={[
        {
          h2: 'What concierge medical transport actually means',
          body: (
            <>
              <p>
                Strip away the label and it comes down to three promises:
                privacy, careful handling, and a vehicle that is yours alone.
                A concierge medical ride is never shared. There is no second
                pickup on the way, no app matching you with whoever is nearby,
                and no driver learning your situation in the moment. One rider
                — or one rider plus the companion they choose — and a driver
                who already knows the plan before the vehicle leaves the lot.
              </p>
              <p>
                White-glove means the small things are handled without being
                asked. The driver meets you at the door rather than idling at
                the curb. The cabin is quiet, clean, and temperature-set before
                you sit down. Bags, post-procedure supplies, and pillows are
                managed for you. Conversation happens if you want it and
                doesn&rsquo;t if you don&rsquo;t.
              </p>
              <p>
                This is the heart of our{' '}
                <a href="/vip" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  VIP concierge service
                </a>
                . Tassy Transportation is a Charlotte-based, Service-Disabled
                Veteran-Owned Small Business operating under USDOT #3104152 and
                MC #79222 — discretion backed by real operating authority, not
                just a nice website.
              </p>
            </>
          ),
        },
        {
          h2: 'Post-procedure pickup, handled with discretion',
          body: (
            <>
              <p>
                The ride home after a procedure is the one that matters most —
                and the one rideshare handles worst. You may be groggy,
                bandaged, moving slowly, and in no mood to make small talk with
                a stranger or wait on a sidewalk in view of a waiting room. Our
                drivers stage at the practice&rsquo;s preferred exit, often a
                private or side door, and time the pickup so you walk straight
                from recovery into the vehicle.
              </p>
              <p>
                Inside, the pace is yours. We help you settle in, position any
                pillows or supports your care team sent with you, and drive
                gently — no hard stops, no shortcuts over rough pavement. At
                home, door-to-door means exactly that: the driver walks you to
                your front door and makes sure you are inside before pulling
                away.
              </p>
              <p>
                Recovering over several days with follow-up visits? Our{' '}
                <a href="/charlotte/post-surgery-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  post-surgery transport page
                </a>{' '}
                covers how we handle the full recovery window, not just day
                one.
              </p>
            </>
          ),
        },
        {
          h2: 'We coordinate directly with your practice’s front desk',
          body: (
            <>
              <p>
                Surgical and aesthetic practices in Charlotte run on tight
                schedules, and patient coordinators do not have time to chase a
                ride that may or may not show up. We work with front-desk teams
                and coordinators directly: they tell us the discharge window,
                we confirm the vehicle, and we update them if anything shifts.
                When the patient is ready, the car is already there.
              </p>
              <p>
                Many practices ask patients to arrange a ride home after
                sedation, and a confirmed concierge booking gives the
                coordinator something concrete to note in the chart. For
                practices that want a standing arrangement, our facility
                partnerships put a dedicated transport partner one phone call
                away. Med-spas and wellness studios can also route clients
                through{' '}
                <a href="/renew" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Tassy Renew
                </a>
                , our wellness transport vertical.
              </p>
            </>
          ),
        },
        {
          h2: 'How concierge differs from NEMT — and from rideshare',
          body: (
            <>
              <p>
                NEMT (non-emergency medical transportation) is dependable,
                scheduled medical transport — it is what we built our company
                on, and you can read about it on our{' '}
                <a href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Charlotte NEMT page
                </a>
                . Concierge is a different tier of the same craft: the same
                licensed, insured operation, with privacy and presentation
                turned all the way up. Dedicated vehicle, flexible waiting,
                coordination with your practice, and a driver briefed on your
                preferences in advance.
              </p>
              <p>
                Rideshare is the opposite end of the spectrum. The driver is
                whoever accepts the ping, the vehicle is whatever they drive,
                and there is no training for helping a post-procedure patient
                — and no accountability if the ride cancels while you sit in a
                recovery chair. For a routine errand, that trade-off is fine.
                For the ride home from surgery, it isn&rsquo;t.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive',
          body: (
            <p>
              Our base is Charlotte, and we serve the practices and patients of
              Mecklenburg County daily — SouthPark, Uptown, Ballantyne,
              Dilworth — along with the surrounding towns clients actually
              travel from: Matthews, Pineville, Huntersville, and Concord.
              Coming in from farther out for a procedure with a Charlotte
              surgeon? Call (704) 941-8508 and dispatch will quote the trip
              directly.
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'How private is a concierge medical ride, really?',
          a: 'Completely private. One rider (plus any companion you choose), one driver, one vehicle — never shared, never pooled. Drivers are briefed on a need-to-know basis and treat your itinerary as confidential. We can stage at a side or private entrance when your practice has one.',
        },
        {
          q: 'Can my surgeon’s office or patient coordinator book the ride for me?',
          a: 'Yes, and many do. Coordinators can book by phone at (704) 941-8508 or by email at booking@tassytrucks.com, and we confirm the pickup window directly with the front desk. Practices that send patients regularly can set up a facility partnership.',
        },
        {
          q: 'Will the driver wait during my procedure or appointment?',
          a: 'For shorter appointments we can hold the vehicle nearby so you never wait. For longer procedures we time the return pickup to your discharge window and stay in contact with the practice, so the car arrives when you are actually ready — not an hour early or twenty minutes late.',
        },
        {
          q: 'Is concierge transport only for plastic surgery patients?',
          a: 'No. Our VIP vertical was built around plastic surgery and aesthetic patients, but anyone who wants discreet, premium, door-to-door medical transport can book it — executives, public figures, or anyone who simply prefers privacy over a shared ride.',
        },
        {
          q: 'How far in advance should I book concierge medical transport in Charlotte?',
          a: 'As soon as your procedure date is set is ideal, since dedicated vehicles are reserved per client. That said, dispatch answers 24/7 at (704) 941-8508, and we accommodate short-notice requests whenever a vehicle is available.',
        },
      ]}
      relatedLinks={[
        { label: 'VIP concierge service', href: '/vip' },
        { label: 'Tassy Renew wellness transport', href: '/renew' },
        { label: 'Post-surgery transport', href: '/charlotte/post-surgery-transport' },
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
