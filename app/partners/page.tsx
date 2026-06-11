import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { facilityIntake } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Partner With Tassy Trucks — Charlotte Medical Transport',
  description:
    'Facility medical transport partnerships in Charlotte NC. SDVOSB certified, 24/7 dispatch, dedicated facility portal with net-30 invoicing. (704) 941-8508.',
  alternates: { canonical: '/partners' },
  openGraph: { images: ['/og-image/partners'] },
};

const CTA_HREF = facilityIntake({ source: 'partners-page' });

export default function PartnersPage() {
  return (
    <LandingPageShell
      primaryKeyword="medical transport facility partnerships charlotte nc"
      eyebrow="For Facilities · B2B Partnerships"
      h1="Partner with Tassy Trucks — Charlotte's SDVOSB Medical Transport"
      heroSubtitle="A contracted transport partner for discharge planners and facility coordinators who are tired of chasing no-show rides — with one dispatch line, one portal, and one invoice."
      quickAnswer="Tassy Trucks partners with Charlotte-area hospitals, dialysis centers, and assisted-living facilities to provide reliable non-emergency medical transport (NEMT) and concierge transport. We are SDVOSB certified, operate under USDOT #3104152 / MC #79222, and dispatch 24/7."
      ctaText="Schedule a 15-min intro call"
      ctaHref={CTA_HREF}
      secondaryCta={{
        label: 'Email us',
        href: 'mailto:booking@tassytrucks.com?subject=Facility%20partnership%20inquiry',
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
                <a href="/recover" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Tassy Recover
                </a>{' '}
                vertical was built specifically around that reality.
              </p>
              <p>
                We also work with VA Community Care providers coordinating rides
                for veterans. As a Service-Disabled Veteran-Owned Small Business,
                veteran transport is personal for us — you can read how we handle
                it on our{' '}
                <a href="/charlotte/veteran-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  veteran transport page
                </a>
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
                Start with procurement. Tassy Trucks is SDVOSB certified —
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
                answered by a person 24 hours a day — when a discharge moves up or
                a treatment runs long, your coordinator talks to someone who can
                actually change the schedule. Our drivers are trained on patient
                handling: door-to-door assistance is the standard, not curb
                drop-offs, and wheelchair-accessible vehicles are part of the
                fleet, not a special request.
              </p>
              <p>
                Finally, the paperwork. Your team gets real-time ETA visibility on
                every trip, so &ldquo;where&rsquo;s the ride?&rdquo; stops being a
                phone call. And we handle PCS forms — the Physician Certification
                Statement, the document certifying that a patient&rsquo;s condition
                requires a given level of transport — electronically, so your
                staff isn&rsquo;t faxing signatures or chasing paper between
                departments.
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
                <a href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  ambulatory NEMT
                </a>{' '}
                — scheduled rides for patients who can walk with minimal
                assistance — and wheelchair-accessible NEMT for residents and
                patients who can&rsquo;t safely transfer to a standard seat. Both
                run on recurring schedules when you need them to: a dialysis
                census can be booked as a standing series rather than trip by
                trip, which is exactly how our{' '}
                <a href="/charlotte/dialysis-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  dialysis transport
                </a>{' '}
                service is built.
              </p>
              <p>
                Beyond routine NEMT, we contract for post-procedure transport —
                patients recovering from anesthesia who need a trained driver and
                a documented handoff, not a stranger with an app. We provide
                veteran transport under VA Community Care Network (CCN)
                arrangements, the VA program that lets veterans receive care from
                community providers close to home. And for senior-living
                communities, there is one more service residents genuinely love:
                Winnie Ride, our pet transport vertical, which gets a
                resident&rsquo;s dog or cat to the vet and back when family
                can&rsquo;t. Details on facility pet programs are on our{' '}
                <a href="/partners/veterinary" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  veterinary partnerships page
                </a>
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
                  <a href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                    pricing page
                  </a>{' '}
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
                coordinate transport all day. The centerpiece is a live trip
                board: every ride you&rsquo;ve booked, its status, its driver, and
                its real-time ETA, visible to your whole team at once. When a
                family member calls asking where mom&rsquo;s ride is, your front
                desk answers in one glance.
              </p>
              <p>
                Billing runs through the portal too. Trips roll up to net-30
                invoices with line-item reconciliation, so your accounts-payable
                team matches every charge to a completed trip instead of
                untangling a monthly statement. Driver and vehicle credentials are
                available on demand — when your compliance department asks for
                documentation, you pull it yourself in seconds rather than
                emailing a vendor and waiting.
              </p>
              <p>
                And because trip details often involve patient information, the
                portal includes PHI-compliant messaging — PHI meaning protected
                health information, the patient data covered by federal privacy
                rules. Your coordinators can communicate pickup notes and mobility
                needs to dispatch inside the portal instead of over unsecured text
                or email.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'What documentation can you provide for our compliance team?',
          a: 'Our SDVOSB certification, federal operating authority (USDOT #3104152, MC #79222), certificates of insurance for our commercial liability coverage on request, and driver and vehicle credentials — all retrievable on demand through the facility portal once you are onboarded.',
        },
        {
          q: 'How fast can you onboard a new facility?',
          a: 'It starts with a 15-minute intro call, followed by a lane assessment, a Master Service Agreement, and a first-week pilot. The overall timeline mostly depends on your credentialing and legal review — on our side, we move as fast as your process allows. Call (704) 941-8508 and we will scope it honestly.',
        },
        {
          q: 'Do you accept Medicaid broker contracts?',
          a: 'Yes — we serve Medicaid riders through broker and facility contracts alongside direct facility agreements and private pay. Bring your broker arrangement to the intro call and we will confirm exactly how your trips would flow and be billed.',
        },
        {
          q: 'What is your service area?',
          a: 'We are based in Charlotte and serve all of Mecklenburg County, plus Matthews, Pineville, Huntersville, Concord, and Gastonia. If your facility regularly discharges patients beyond that range, raise it on the intro call and we will tell you what we can commit to.',
        },
        {
          q: 'Do you bill directly or through us?',
          a: 'For facility contracts, we bill the facility directly on net-30 terms through the facility portal, with line-item reconciliation for every trip. If your trips run through a Medicaid broker instead, billing follows the broker arrangement — we will map it out before the contract is signed.',
        },
      ]}
      relatedLinks={[
        { label: 'NEMT rides', href: '/charlotte/nemt-rides' },
        { label: 'Dialysis transport', href: '/charlotte/dialysis-transport' },
        { label: 'Veteran transport', href: '/charlotte/veteran-transport' },
        { label: 'Veterinary partnerships', href: '/partners/veterinary' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
