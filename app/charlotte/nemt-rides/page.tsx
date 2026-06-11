import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'NEMT in Charlotte NC — Book Medical Transport | Tassy',
  description:
    'Non-emergency medical transportation in Charlotte NC. Veteran-owned, 24/7 dispatch, ambulatory and wheelchair rides. Book online or call (704) 941-8508.',
  alternates: { canonical: '/charlotte/nemt-rides' },
  openGraph: { images: ['/og-image/nemt-rides'] },
};

const CTA_HREF = seoBook('nemt', { source: 'seo-nemt' });

export default function NemtRidesPage() {
  return (
    <LandingPageShell
      primaryKeyword="nemt charlotte nc"
      eyebrow="NEMT · Charlotte, North Carolina"
      h1="NEMT in Charlotte, NC — Medical Rides You Can Set Your Watch By"
      heroSubtitle="Non-emergency medical transportation for Charlotte patients and the families who coordinate their care — bookable tonight, on the road tomorrow."
      quickAnswer="NEMT (non-emergency medical transportation) gets you to medical appointments when you can't drive yourself — dialysis, follow-ups, infusions, therapy. Tassy Trucks provides ambulatory and wheelchair-accessible NEMT across Charlotte and Mecklenburg County, with 24/7 phone dispatch at (704) 941-8508."
      ctaText="Book a medical ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Non-Emergency Medical Transportation"
      sections={[
        {
          h2: 'What NEMT actually is — in plain English',
          body: (
            <>
              <p>
                NEMT stands for non-emergency medical transportation. It is not an
                ambulance and it is not a rideshare. It is a scheduled ride, in a
                clean and properly insured vehicle, with a driver who is trained to
                help passengers who are older, recovering, or living with limited
                mobility get from their front door to their appointment — and back.
              </p>
              <p>
                The &ldquo;non-emergency&rdquo; part matters. If someone is having a
                medical emergency, call 911. NEMT is for everything else: the
                cardiology follow-up, the three-times-a-week dialysis session, the
                physical therapy block, the infusion appointment that leaves you too
                tired to drive home.
              </p>
              <p>
                Tassy Trucks is a Charlotte-based, Service-Disabled Veteran-Owned
                Small Business (SDVOSB) operating under USDOT #3104152 and MC
                #79222. Medical transport is not a side business for us — it is the
                core of what we do.
              </p>
            </>
          ),
        },
        {
          h2: 'Who uses NEMT in Charlotte',
          body: (
            <>
              <p>
                Most of our riders fall into a few groups. Seniors who no longer
                drive but still have a full calendar of appointments. Adults
                recovering from surgery whose care team told them not to get behind
                the wheel. Dialysis and infusion patients who need the same ride,
                the same days, every week. And family caregivers — often a daughter
                or son in another city — booking dependable transport for a parent
                in Charlotte, Matthews, or Huntersville.
              </p>
              <p>
                We also work directly with discharge planners and facility
                coordinators at hospitals, skilled nursing facilities, and dialysis
                centers across Mecklenburg County who need a transport partner that
                shows up on time, every time. If that is you, our{' '}
                <a href="/partners" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  facility partnership page
                </a>{' '}
                explains how contracting works.
              </p>
            </>
          ),
        },
        {
          h2: 'Ambulatory and wheelchair-accessible rides',
          body: (
            <>
              <p>
                Ambulatory NEMT is for riders who can walk to and from the vehicle,
                possibly with a cane or a walker and a steady arm to hold. Our
                drivers meet you at the door, not the curb, and they wait to confirm
                you are checked in before leaving.
              </p>
              <p>
                Wheelchair-accessible NEMT uses vehicles equipped for riders who use
                a wheelchair full-time or can&rsquo;t safely transfer to a standard
                seat. If you are not sure which you need, call us — dispatch will
                ask a few questions and put you in the right vehicle the first time.
                You can read more on our{' '}
                <a href="/charlotte/wheelchair-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  wheelchair transport page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'How booking works',
          body: (
            <>
              <p>
                Book online through our two-minute wizard, or call (704) 941-8508 —
                a person answers around the clock, not a phone tree. Tell us the
                pickup address, the appointment time, and any mobility needs. We
                schedule the pickup so you arrive early, not breathless. For
                recurring trips like dialysis, we set the whole series at once so
                you never have to re-book.
              </p>
              <p>
                Need a ride for a parent or spouse instead of yourself? That works
                too — see{' '}
                <a href="/charlotte/family-medical-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  booking for a family member
                </a>
                . You get the confirmation and the driver updates, they get the
                ride.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive',
          body: (
            <p>
              Our home base is Charlotte, and we cover all of Mecklenburg County —
              Uptown, South End, University City, Steele Creek, Ballantyne — plus
              the surrounding towns patients actually travel between: Matthews,
              Pineville, Huntersville, Concord, and Gastonia. If your appointment is
              at a major Charlotte hospital campus or a neighborhood clinic, we have
              almost certainly been there this week.
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'How far in advance do I need to book a NEMT ride in Charlotte?',
          a: 'For routine appointments, booking the day before is ideal. We accept same-day requests whenever a vehicle is available — call (704) 941-8508 and dispatch will tell you honestly whether we can make the window.',
        },
        {
          q: 'Does Tassy Trucks accept Medicaid for NEMT rides?',
          a: 'We serve Medicaid riders through broker and facility contracts, and private-pay riders directly. Call us with your situation and we will tell you exactly how your ride can be covered before you commit.',
        },
        {
          q: 'Will the driver help me to the door?',
          a: 'Yes. Door-to-door is our standard, not curb-to-curb. Drivers help with entryways, steps, and getting checked in, and they confirm your return pickup before they leave.',
        },
        {
          q: 'Can I schedule recurring rides for dialysis or therapy?',
          a: 'Yes — recurring scheduling is one of the main reasons patients switch to us. We book the full series (for example, Monday-Wednesday-Friday dialysis) in one call, with the same pickup window each visit.',
        },
        {
          q: 'What areas around Charlotte do you serve?',
          a: 'All of Charlotte and Mecklenburg County, plus Matthews, Pineville, Huntersville, Concord, and Gastonia. For trips beyond that range, call us — longer-distance medical transport is quoted case by case.',
        },
      ]}
      relatedLinks={[
        { label: 'Dialysis transport', href: '/charlotte/dialysis-transport' },
        { label: 'Wheelchair transport', href: '/charlotte/wheelchair-transport' },
        { label: 'Book for a family member', href: '/charlotte/family-medical-rides' },
        { label: 'NEMT service overview', href: '/nemt' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
