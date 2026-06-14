import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Rides to the Vet in Charlotte — Winnie Ride | Tassy',
  description:
    'Stuck at work during clinic hours? Winnie Ride picks up your pet, gets them to the vet, and brings them home. Charlotte NC. Call (704) 941-8508.',
  alternates: { canonical: '/charlotte/vet-appointment-rides' },
  openGraph: { images: ['/og-image/vet-appointment-rides'] },
};

const CTA_HREF = seoBook('winnie', { source: 'seo-vet', purpose: 'vet' });

const linkCls = 'underline decoration-[#7C9A5C] underline-offset-2';

export default function VetAppointmentRidesPage() {
  return (
    <LandingPageShell
      primaryKeyword="rides to the vet charlotte"
      eyebrow="Winnie Ride · Charlotte, North Carolina"
      heroIcon={<PawIcon />}
      accent="sage"
      trustExtras={['Vaccine-verified trips', 'Liability-covered', 'Charlotte-based']}
      h1="Rides to the Vet in Charlotte — Pet Transport for Appointments You Can't Make"
      heroSubtitle="Your clinic closes at 5 and your job doesn't — Winnie Ride picks up your pet, handles the appointment trip, and brings them home while you stay at work."
      quickAnswer="Winnie Ride provides scheduled rides to the vet across Charlotte and Mecklenburg County when you can't leave work — we pick up your dog or cat, deliver them to the clinic, and bring them home. Every trip includes vaccine verification, a signed liability waiver, and a photo at pickup. Book with at least two hours' notice or call (704) 941-8508."
      ctaText="Schedule a vet ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Pet Transportation"
      sections={[
        {
          h2: 'The 3 p.m. vet appointment problem',
          body: (
            <>
              <p>
                Most veterinary clinics in Charlotte run on business hours. So does
                your job. When the only open slot is Tuesday at 3 p.m., you are
                left choosing between burning a half day of PTO, pushing the
                appointment another two weeks, or asking someone for a favor they
                can&rsquo;t really spare. Meanwhile your dog still has the limp, or
                your cat is still due for that recheck.
              </p>
              <p>
                And rescheduling has a cost beyond the calendar. A skipped recheck
                becomes a worse limp. An overdue vaccine becomes a boarding
                facility turning your dog away the week you travel. Getting your
                pet seen on time is not a luxury — it is the cheapest version of
                the problem.
              </p>
              <p>
                Winnie Ride exists for exactly this gap. We pick up your pet from
                home, get them to the clinic on time, and bring them home after —
                you never leave your desk. It is{' '}
                <a href="/charlotte/pet-transport" className={linkCls}>
                  professional pet transport
                </a>{' '}
                from Tassy Transportation, a veteran-owned, Charlotte-based company
                operating under USDOT #3104152 — not a stranger from an app with a
                towel on the back seat.
              </p>
            </>
          ),
        },
        {
          h2: 'What a vet ride looks like, start to finish',
          body: (
            <>
              <p>
                <strong>You book.</strong> Online in about two minutes, or call
                (704) 941-8508 — dispatch answers 24/7. Tell us the pickup address,
                the clinic, and the appointment time. Routine rides need a minimum
                of two hours&rsquo; lead time; more notice makes your preferred
                window easier to hold.
              </p>
              <p>
                <strong>We verify and confirm.</strong> Before the first ride, we
                check vaccine records and you sign our liability waiver, so
                everything is settled before a wheel turns. We coordinate with your
                clinic on drop-off and pickup timing so your pet is not sitting in
                a lobby longer than necessary.
              </p>
              <p>
                <strong>Pickup, with proof.</strong> Your driver — trained on
                carrier handling and sedation-aware protocols — secures your dog or
                cat in a climate-controlled vehicle, and you get a photo at pickup
                the moment they are in our care.
              </p>
              <p>
                <strong>Appointment and the ride home.</strong> We deliver your pet
                to the clinic, stay reachable while they are seen, and bring them
                home when the visit wraps. You get your evening back, and your pet
                got seen this week instead of next month.
              </p>
            </>
          ),
        },
        {
          h2: 'Vaccine verification before every ride',
          body: (
            <>
              <p>
                Every pet that rides with us is vaccine-verified first — rabies for
                all pets, plus DAPP for dogs and FVRCP for cats. These are the core
                vaccines recommended by the{' '}
                <a
                  href="https://www.avma.org/resources-tools/pet-owners/petcare/vaccinations"
                  className={linkCls}
                >
                  American Veterinary Medical Association
                </a>
                , and verifying them protects your pet and every other pet who
                shares our vehicles.
              </p>
              <p>
                Send records when you book your first trip; we keep them on file
                after that, so repeat rides take seconds to schedule. If your pet
                is overdue, that is worth knowing anyway — and conveniently, you
                already have a ride to the vet.
              </p>
            </>
          ),
        },
        {
          h2: 'Not just routine checkups',
          body: (
            <>
              <p>
                Annual exams and vaccine boosters are the bread and butter, but vet
                trips come in more flavors than that. If your dog or cat is coming
                home after a procedure, our{' '}
                <a href="/charlotte/post-surgery-pet-transport" className={linkCls}>
                  post-surgery pet transport
                </a>{' '}
                handles the careful, sedation-aware ride home. If your pet panics
                at the sight of a carrier, our{' '}
                <a href="/charlotte/calm-pet-transport" className={linkCls}>
                  calm pet transport
                </a>{' '}
                approach slows the whole trip down for them. We also provide
                compassionate end-of-life transport — please call (704) 941-8508 to
                discuss.
              </p>
              <p>
                Veterinary clinics: if no-shows from transportation problems are
                eating your schedule, our{' '}
                <a href="/partners/veterinary" className={linkCls}>
                  veterinary partner program
                </a>{' '}
                gives your front desk a transport option you can recommend by name.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive',
          body: (
            <>
              <p>
                We cover all of Charlotte and Mecklenburg County, plus Matthews,
                Pineville, and Huntersville. Home in one town, clinic in another?
                Cross-town vet runs are most of what we do. If your clinic is
                farther out, call us and we will quote the trip case by case.
              </p>
              <p>
                If your pet has a standing rhythm of vet visits, grooming, or
                daycare, a{' '}
                <a href="/winnie" className={linkCls}>
                  Winnie Ride subscription
                </a>{' '}
                from $39/mo usually beats booking one ride at a time.
              </p>
              <p>
                Booking is the same two-minute process every time: pickup address,
                clinic, appointment time. Dispatch answers (704) 941-8508 around
                the clock — a person, not a phone tree — and your pet&rsquo;s
                vaccine records stay on file after the first trip.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Can you take my pet to the vet while I am at work?',
          a: 'Yes — that is the core of the service. We pick up your dog or cat from home, deliver them to the clinic, coordinate timing with the front desk, and bring them home after the appointment. You get a photo at pickup so you know the trip is underway.',
        },
        {
          q: 'How much notice do you need for a vet ride?',
          a: 'A minimum of two hours for routine rides. Booking the day before is ideal, especially for popular morning slots. Call (704) 941-8508 and dispatch will tell you what is available today.',
        },
        {
          q: 'Does my pet need vaccines to ride?',
          a: 'Yes. We verify rabies for all pets, plus DAPP for dogs and FVRCP for cats — core vaccines per AVMA guidance — before every ride. Send records with your first booking and we keep them on file for future trips.',
        },
        {
          q: 'Who is actually driving my pet?',
          a: 'A Tassy Transportation driver trained on carrier handling and sedation-aware protocols, in a climate-controlled company vehicle. We are not a marketplace — the company you book with is the company that drives, and a signed liability waiver covers every trip.',
        },
        {
          q: 'What if the vet keeps my pet longer than expected?',
          a: 'Appointments run long — we plan for it. Dispatch stays in contact with you and coordinates the return pickup around when your pet is actually ready, not a guess made that morning.',
        },
      ]}
      relatedLinks={[
        { label: 'Pet transport in Charlotte', href: '/charlotte/pet-transport' },
        { label: 'Post-surgery pet transport', href: '/charlotte/post-surgery-pet-transport' },
        { label: 'Calm pet transport', href: '/charlotte/calm-pet-transport' },
        { label: 'Veterinary partners', href: '/partners/veterinary' },
        { label: 'Winnie Ride overview', href: '/winnie' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
