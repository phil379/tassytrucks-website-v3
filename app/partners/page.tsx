import { wavPartnersClause } from '@/lib/wav';
import Link from 'next/link';
import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { partnerSignup } from '@/lib/partner-links';
import { SERVICE_AREA } from '@/lib/copy';

export const metadata: Metadata = {
  title: 'Facility Transport Partnerships in Charlotte NC',
  description:
    'Facility medical transport partnerships in Charlotte NC. SDVOSB certified, facility portal with weekly invoicing. (704) 941-8508.',
  alternates: { canonical: '/partners' },
  openGraph: { url: '/partners', images: ['/og-image/partners'] },
};

const CTA_HREF = partnerSignup({ source: 'partners-page' });

export default function PartnersPage() {
  return (
    <LandingPageShell
      primaryKeyword="medical transport facility partnerships charlotte nc"
      eyebrow="For Facilities · B2B Partnerships"
      h1="Partner with Tassy Transportation — Charlotte's SDVOSB Medical Transport"
      heroSubtitle="A contracted transport partner for discharge planners and facility coordinators who are tired of chasing no-show rides — with one dispatch line, one portal, and one invoice."
      quickAnswer="Tassy Transportation partners with Charlotte-area hospitals, dialysis centers, and assisted-living facilities to provide reliable non-emergency medical transport (NEMT) and concierge transport. We are SDVOSB certified. A dispatcher usually confirms your driver and your price within 2 hours during business hours."
      ctaText="Schedule a 15-min intro call"
      ctaHref={CTA_HREF}
      secondaryCta={{
        label: 'Email us',
        href: 'mailto:book@tassytrucks.com?subject=Facility%20partnership%20inquiry',
      }}
      schemaServiceType="Non-Emergency Medical Transportation"
      sections={[
        {
          h2: 'Who we partner with',
          body: (
            <>
              <p>
                Our facility partners share one problem: a patient who is medically
                ready to move, and no dependable way to move them. Hospitals
                discharging post-procedure patients can&rsquo;t release someone who
                just came out of anesthesia to a rideshare, and a discharge that
                slips to the next morning ties up a bed nobody can spare. Dialysis
                and infusion centers live with the same math three times a week —
                a patient who misses transport misses treatment, and the chair
                sits empty while the schedule backs up.
              </p>
              <p>
                Skilled nursing and assisted-living communities need recurring,
                door-to-door transport their residents and families can trust —
                the same driver behavior, the same pickup window, every time.
                Oncology practices need drivers who understand that a passenger
                leaving chemotherapy is not a typical passenger, and that the ride
                home is part of the care experience, not an afterthought. Our{' '}
                <Link href="/recover" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Tassy Recovery
                </Link>{' '}
                service was built specifically around that reality.
              </p>
              <p>
                As a Service-Disabled Veteran-Owned Small Business,
                veteran transport is personal for us — you can read how we handle
                it on our{' '}
                <Link href="/charlotte/veteran-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  veteran transport page
                </Link>
                . If your facility coordinates care for veterans in Mecklenburg
                County, we should talk.
              </p>
            </>
          ),
        },
        {
          h2: 'Why facilities choose Tassy',
          body: (
            <>
              <p>
                Start with procurement. Tassy Transportation is SDVOSB certified —
                Service-Disabled Veteran-Owned Small Business — which means a
                contract with us counts toward your organization&rsquo;s
                supplier-diversity goals. For hospital systems and government-adjacent
                buyers with diversity spend targets, that turns a vendor decision
                your team already needs to make into one that also helps a number
                your leadership reports on.
              </p>
              <p>
                Then there is the operational side, which is where transport
                vendors usually fall down. Our dispatch line, (704) 941-8508, is
                where your coordinator talks to someone who can actually change
                the schedule when a discharge moves up or a treatment runs long.
                A dispatcher usually confirms your driver and your price within 2 hours during business hours. Our drivers are trained on patient
                handling: door-to-door assistance is the standard, not curb
                drop-offs, and {wavPartnersClause()}.
              </p>
              <p>
                Finally, the paperwork. Your team sees every trip you have booked
                and its status in one place, so &ldquo;where&rsquo;s the
                ride?&rdquo; is a glance before it is a phone call. If a trip
                needs a form from your side, tell dispatch when you book and we
                will work it out with your staff before the ride.
              </p>
            </>
          ),
        },
        {
          h2: 'Services we contract for',
          body: (
            <>
              <p>
                The core of most facility contracts is{' '}
                <Link href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  ambulatory NEMT
                </Link>{' '}
                — scheduled rides for patients who can walk with minimal
                assistance — and wheelchair-accessible NEMT for residents and
                patients who can&rsquo;t safely transfer to a standard seat. Both
                run on recurring schedules when you need them to: a dialysis
                census can be booked as a standing series rather than trip by
                trip, which is exactly how our{' '}
                <Link href="/charlotte/dialysis-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  dialysis transport
                </Link>{' '}
                service is built.
              </p>
              <p>
                Beyond routine NEMT, we contract for post-procedure transport —
                patients recovering from anesthesia who need a trained driver and
                a documented handoff, not a stranger with an app. And for
                senior-living communities, there is one more service residents
                genuinely love:
                Winnie Ride, our pet transport vertical, which gets a
                resident&rsquo;s dog or cat to the vet and back when family
                can&rsquo;t. Details on facility pet programs are on our{' '}
                <Link href="/partners/veterinary" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  veterinary partnerships page
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'How contracting works',
          body: (
            <>
              <p>
                We keep onboarding deliberately simple, because the longer a
                transport contract takes to stand up, the longer your staff keeps
                improvising. Here is the whole process:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>15-minute intro call.</strong> You tell us your trip
                  volume, your pain points, and what your current vendor
                  isn&rsquo;t doing. We tell you honestly whether we&rsquo;re a
                  fit.
                </li>
                <li>
                  <strong>Volume and lane assessment.</strong> We map your common
                  routes — facility to dialysis center, hospital campus to home
                  zip codes — and confirm capacity for your schedule.
                </li>
                <li>
                  <strong>Master Service Agreement.</strong> One contract covering
                  rates, service levels, and documentation. Our{' '}
                  <Link href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                    pricing page
                  </Link>{' '}
                  shows how our rate structure works before you ever get a quote.
                </li>
                <li>
                  <strong>First-week pilot.</strong> We run a real week of your
                  trips so your coordinators judge us on performance, not
                  promises.
                </li>
                <li>
                  <strong>Go live.</strong> Your team gets access to a dedicated
                  facility portal, and trip requests become a two-minute task
                  instead of a phone marathon.
                </li>
              </ol>
              <p>
                At any step, if it isn&rsquo;t working, you walk away. We would
                rather lose a contract in week one than keep a partner who
                doesn&rsquo;t trust the service.
              </p>
            </>
          ),
        },
        {
          h2: 'What you get in our facility portal',
          body: (
            <>
              <p>
                Every contracted facility gets a dedicated portal — not a generic
                booking form, but a working dashboard for the people who
                coordinate transport all day. The centerpiece is your trip list: every ride you&rsquo;ve booked
                and its current status, visible to your whole team at once. When
                a family member calls asking about mom&rsquo;s ride, your front
                desk can check the status first and call our dispatch line for
                anything more.
              </p>
              <p>
                Billing runs through the portal too. Trips roll up to a weekly
                invoice on 7-day terms, listed trip by trip, so your
                accounts-payable team matches every charge to a completed trip
                instead of untangling a monthly statement. When your compliance
                department asks for driver or vehicle documentation, ask us and
                we send it.
              </p>
              {/* TODO(counsel): the paragraph promising privacy-law-compliant messaging was removed 2026-11-13.
                  Do not restore a HIPAA/PHI promise until counsel has reviewed the portal. */}
              <p>
                Your coordinators can also send pickup notes to dispatch from
                inside the portal, so the details for a trip stay with that
                trip. Keep clinical detail to what the driver needs for the ride.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'What documentation can you provide for our compliance team?',
          a: 'Our SDVOSB certification, certificates of insurance for our commercial liability coverage on request, and driver and vehicle credentials — all sent to your compliance team on request.',
        },
        {
          q: 'How fast can you onboard a new facility?',
          a: 'It starts with a 15-minute intro call, followed by a lane assessment, a Master Service Agreement, and a first-week pilot. The overall timeline mostly depends on your credentialing and legal review — on our side, we move as fast as your process allows. Call (704) 941-8508 and we will scope it honestly.',
        },
        {
          q: 'How are rides paid for?',
          a: 'Two ways today: private pay by card, or a direct agreement where your facility is invoiced. We are not a Medicaid or Medicare provider and we do not bill insurance or broker networks at this time. Bring your situation to the intro call and we will tell you plainly what we can do.',
        },
        {
          q: 'What is your service area?',
          a: `We serve ${SERVICE_AREA}. If your facility regularly discharges patients beyond that range, raise it on the intro call and we will tell you what we can commit to.`,
        },
        {
          q: 'Do you bill directly or through us?',
          a: 'For facility agreements, we invoice the facility directly every week on 7-day terms, with every trip listed line by line. Riders who book on their own pay by card through a secure link after we confirm the price.',
        },
      ]}
      /* Credentials block, rendered directly above the FAQ whose first question
         is "What documentation can you provide for our compliance team?".
         Everything listed here is documentable -- no claim goes in this block
         that Tassy cannot produce on request. */
      beforeFaq={
        <div className="rounded-tile border border-line p-7" style={{ background: 'var(--surface)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* White chip: the medal's outer ring is navy and the theme is dark.
                The badge is not recoloured or cropped. */}
            <div className="rounded-full bg-white p-2 shrink-0 self-start sm:self-center">
              <img
                src="/brand/hirevets-2023-gold.png"
                alt="2023 HIRE Vets Medallion Award, Gold -- U.S. Department of Labor"
                width={96}
                height={96}
                loading="lazy"
                className="h-20 w-20 block"
              />
            </div>
            <div>
              <div className="eyebrow mb-2">Credentials</div>
              <h2 className="serif text-2xl font-semibold leading-snug">
                2023 HIRE Vets Medallion Award &mdash; Gold
              </h2>
              <p className="mt-2 ink-soft leading-relaxed max-w-2xl">
                Awarded by the U.S. Department of Labor to employers who recruit, hire
                and retain veterans. Alongside it we hold SDVOSB certification,
                MBE, DBE and SBE certification. Certificates of insurance, driver
                credentials and vehicle credentials are available to your compliance
                team on request.
              </p>
            </div>
          </div>
        </div>
      }
      relatedLinks={[
        { label: 'Tassy Care rides', href: '/charlotte/nemt-rides' },
        { label: 'Dialysis transport', href: '/charlotte/dialysis-transport' },
        { label: 'Veteran transport', href: '/charlotte/veteran-transport' },
        { label: 'Veterinary partnerships', href: '/partners/veterinary' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
