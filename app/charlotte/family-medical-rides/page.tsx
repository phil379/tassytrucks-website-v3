import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Book a Medical Ride for Someone Else in Charlotte | Tassy',
  description:
    'Book and pay for a medical ride for a parent or loved one in Charlotte NC. You get the confirmations and driver updates; they get door-to-door care.',
  alternates: { canonical: '/charlotte/family-medical-rides' },
  openGraph: { images: ['/og-image/family-medical-rides'] },
};

const CTA_HREF = seoBook('nemt', { source: 'seo-family' });

export default function FamilyMedicalRidesPage() {
  return (
    <LandingPageShell
      primaryKeyword="book a medical ride for someone else"
      eyebrow="Family Bookings · Charlotte, North Carolina"
      h1="Book a Medical Ride for Someone Else in Charlotte — Parents, Spouses, Loved Ones"
      heroSubtitle="For the daughter in Denver and the son in D.C. coordinating Mom’s appointments in Charlotte — book the ride, get every update, and know she made it to the door."
      quickAnswer="Yes — you can book and pay for a medical ride for someone else, even from out of town. With Tassy Trucks, you schedule the ride online or by phone, the confirmations and driver updates come to you, and a trained driver meets your loved one at their door anywhere in Charlotte or Mecklenburg County. Dispatch answers 24/7 at (704) 941-8508."
      ctaText="Book for a loved one"
      ctaHref={CTA_HREF}
      schemaServiceType="Non-Emergency Medical Transportation"
      sections={[
        {
          h2: 'How third-party booking works: you book, they ride',
          body: (
            <>
              <p>
                The arrangement is simple and very common. You are the booker:
                you schedule the ride, you pay for it, and you are our point of
                contact. Your parent, spouse, or loved one is the rider: their
                only job is to be ready when the driver arrives. Nothing about
                the booking requires them to have a smartphone, download an
                app, or handle payment at the curb.
              </p>
              <p>
                Roughly speaking, you tell us three things — where to pick
                them up, when the appointment is, and what help they need
                getting in and out of the vehicle — and we handle the rest.
                Many of the families we drive for are coordinating from
                another city or another state entirely, managing a parent in
                Charlotte or Matthews from hundreds of miles away. This is
                ordinary non-emergency medical transportation, the service
                described on our{' '}
                <a href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Charlotte NEMT page
                </a>
                , with the communication routed to you instead of the rider.
              </p>
            </>
          ),
        },
        {
          h2: 'You stay in the loop, even from another state',
          body: (
            <>
              <p>
                The hardest part of long-distance caregiving is the silence
                between &ldquo;the ride is booked&rdquo; and &ldquo;Mom is
                home.&rdquo; We close that gap. As the booker, you receive the
                booking confirmation, the pickup details, and the driver
                updates along the way — so you know the vehicle arrived, your
                loved one is aboard, and the return trip is handled, without
                calling them mid-appointment to check.
              </p>
              <p>
                If anything needs to change — the clinic runs long, the
                appointment moves, your dad decides he wants to stop being
                stubborn and use the walker — you call us, not the driver, and
                dispatch sorts it out. One number, answered around the clock:
                (704) 941-8508. Tassy Trucks is a Charlotte-based,
                Service-Disabled Veteran-Owned Small Business operating under
                USDOT #3104152 and MC #79222, so the company you are trusting
                with a parent is licensed, insured, and checkable.
              </p>
            </>
          ),
        },
        {
          h2: 'Door-to-door means the driver meets them at the door',
          body: (
            <>
              <p>
                This is the detail out-of-town family members care about most,
                so let&rsquo;s be precise. Our standard is door-to-door, not
                curb-to-curb. The driver parks, comes to the front door, and
                offers a steady arm down the steps. At the clinic, the driver
                walks your loved one inside and confirms they are checked in
                before leaving. On the return trip, the driver brings them back
                to their own door — not the end of the driveway.
              </p>
              <p>
                If your parent uses a wheelchair full-time or can&rsquo;t
                safely transfer to a standard seat, we run
                wheelchair-accessible vehicles with proper securement; the
                details are on our{' '}
                <a href="/charlotte/wheelchair-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  wheelchair transport page
                </a>
                . Not sure which vehicle fits? Describe their mobility honestly
                when you book and dispatch will choose correctly the first
                time.
              </p>
            </>
          ),
        },
        {
          h2: 'Standing appointments? Set the schedule once',
          body: (
            <>
              <p>
                Aging parents rarely have one appointment — they have a
                calendar. Cardiology this month, physical therapy twice a week,
                dialysis on a fixed Monday-Wednesday-Friday rhythm. Recurring
                scheduling means you set the series up in a single call and
                never re-book it: same pickup window, same routine, a driver
                your parent comes to recognize at the door.
              </p>
              <p>
                For treatment schedules that cannot slip, like dialysis, see
                our{' '}
                <a href="/charlotte/dialysis-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  dialysis transport page
                </a>{' '}
                — those riders are the reason our dispatch obsesses over
                punctuality. Recurring riders across Mecklenburg County,
                Huntersville, Pineville, and Concord are the backbone of our
                schedule, and standing bookings get first claim on it.
              </p>
            </>
          ),
        },
        {
          h2: 'What you need to book a ride for someone else',
          body: (
            <>
              <p>
                Have these ready and the booking takes about two minutes,
                online or by phone. First, their pickup address — home,
                assisted living community, or rehab facility. Second, the
                appointment time and the clinic or hospital address; we
                schedule the pickup so they arrive comfortably early. Third,
                their mobility needs: walker, cane, wheelchair, oxygen tank,
                slow on stairs — the more honest the picture, the smoother the
                ride. Finally, your own phone number and email, since the
                confirmations and updates come to you.
              </p>
              <p>
                Payment is handled by you at booking, so there is nothing for
                your loved one to pay or sign at pickup. Costs are quoted
                up-front — no surprises on either end of the trip. You can
                also reach us anytime at booking@tassytrucks.com.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Can I book and pay for a medical ride for my parent from out of state?',
          a: 'Yes. You book online or call (704) 941-8508 from wherever you live, pay at booking, and receive all confirmations and driver updates yourself. Your parent just needs to be ready at the door in the Charlotte area — no app, no smartphone, no payment at pickup.',
        },
        {
          q: 'Does my loved one need a smartphone or the booking link?',
          a: 'No. The rider needs nothing but the pickup time, which we confirm with you. The driver comes to their door, introduces themselves, and helps them to the vehicle. All the technology stays on your side of the booking.',
        },
        {
          q: 'How will I know my mom actually got picked up and made it home?',
          a: 'As the booker, you are our contact: you get the confirmation when the ride is scheduled and driver updates as the trip progresses. If you ever want a live status check, call dispatch at (704) 941-8508 — a person answers 24/7.',
        },
        {
          q: 'What if the appointment runs long and the return pickup needs to move?',
          a: 'Call us and we adjust the return window — that is routine, not an inconvenience. Drivers also confirm the return plan before leaving the drop-off, so a slow-running clinic does not leave your loved one stranded in a waiting room.',
        },
        {
          q: 'Can I set up recurring rides for my parent’s standing appointments?',
          a: 'Yes — recurring scheduling is one of the most common requests from adult children. We book the entire series in one call (for example, therapy every Tuesday and Thursday), with the same pickup window each visit, and you stay the contact for the whole series.',
        },
      ]}
      relatedLinks={[
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Dialysis transport', href: '/charlotte/dialysis-transport' },
        { label: 'Wheelchair transport', href: '/charlotte/wheelchair-transport' },
        { label: 'NEMT service overview', href: '/nemt' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
