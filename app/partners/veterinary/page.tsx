import Link from 'next/link';
import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { partnerSignup } from '@/lib/partner-links';

export const metadata: Metadata = {
  title: 'Veterinary Partnerships — Pet Transport | Winnie Ride',
  description:
    'Partner with Winnie Ride for pet transport to and from your Charlotte veterinary practice. Current rabies vaccination required. Book a 15-min intro call.',
  alternates: { canonical: '/partners/veterinary' },
  openGraph: { url: '/partners/veterinary', images: ['/og-image/veterinary'] },
};

const CTA_HREF = partnerSignup({ source: 'vet-partners', type: 'veterinary' });

const inlineLink =
  'underline decoration-[#7C9A5C] underline-offset-2';

export default function VeterinaryPartnersPage() {
  return (
    <LandingPageShell
      primaryKeyword="veterinary pet transport charlotte"
      accent="sage"
      heroIcon={<PawIcon />}
      eyebrow="Winnie Ride · Veterinary Partnerships"
      trustExtras={['Current rabies vaccination required', 'Charlotte-based']}
      h1="Partner with Winnie Ride — Trusted Pet Transport for Charlotte Veterinary Clinics"
      heroSubtitle="A dependable transport answer for the clients who ask your front desk, “How am I supposed to get him here?”"
      quickAnswer="Winnie Ride partners with Charlotte-area veterinary practices to transport patients to and from appointments. Current rabies vaccination is required (plus DAPP for dogs, FVRCP for cats), and the pet's owner confirms rabies status when booking."
      ctaText="Schedule a 15-min intro call"
      ctaHref={CTA_HREF}
      secondaryCta={{
        label: 'Email us',
        href: 'mailto:book@tassytrucks.com?subject=Veterinary%20partnership%20inquiry',
      }}
      schemaServiceType="Pet Transportation"
      sections={[
        {
          h2: 'Who we serve',
          body: (
            <>
              <p>
                Winnie Ride is the pet-transport vertical of Tassy Transportation, a
                Charlotte-based, Service-Disabled Veteran-Owned Small Business
                (SDVOSB). We work
                with the full range of veterinary practices in the Charlotte
                area: general practices managing wellness visits and dental
                schedules, specialty hospitals in oncology, cardiology, and
                ophthalmology whose patients come back week after week, and
                emergency and overnight animal hospitals that discharge patients at
                hours when no family member can get there.
              </p>
              <p>
                We also support low-cost spay/neuter clinics, where the
                transportation gap is often the difference between a scheduled
                surgery and a no-show. When a client has the will to get their
                pet cared for but no safe way to make the drive, that is exactly
                the trip we exist for. Our drivers handle the door-to-door
                logistics so your team can focus on the patient in front of
                them.
              </p>
              <p>
                If your practice already refers clients to our consumer
                services, you may know us from{' '}
                <Link href="/charlotte/pet-transport" className={inlineLink}>
                  pet transport in Charlotte
                </Link>{' '}
                or our{' '}
                <Link href="/charlotte/vet-appointment-rides" className={inlineLink}>
                  vet appointment rides
                </Link>
                . A formal partnership simply makes that referral path easier
                for your front desk — and better for your clients.
              </p>
            </>
          ),
        },
        {
          h2: 'Why clinics partner with us',
          body: (
            <>
              <p>
                The first reason is the one your practice manager will care
                about most: <strong>a vaccination requirement protects your
                waiting room</strong>. Current rabies vaccination is required for
                every patient, plus DAPP for dogs and FVRCP for cats — the core
                vaccines as recognized by the{' '}
                <a
                  href="https://www.avma.org/resources-tools/pet-owners/petcare/vaccinations"
                  className={inlineLink}
                  rel="noopener"
                  target="_blank"
                >
                  AVMA
                </a>
                . The pet&rsquo;s owner
                confirms rabies status when booking.
              </p>
              <p>
                The second reason is reliability. For routine rides we ask for a
                2-hour minimum lead time, which keeps our scheduling honest and
                your clients&rsquo; arrival times reliable. All of it happens in
                climate-controlled vehicles, every season.
              </p>
            </>
          ),
        },
        {
          h2: 'What we offer your clients',
          body: (
            <>
              <p>
                Your clients can book same-day through our online wizard or by
                calling dispatch at (704) 941-8508. A dispatcher usually confirms your driver and your price within 2 hours during business hours. For
                chronic patients on recurring schedules — the oncology patient
                with weekly rechecks, the cardiology patient with monthly
                monitoring — we set up recurring transport once so the owner
                never has to re-book, and your patient never misses a visit
                because a ride fell through.
              </p>
              <p>
                Post-procedure pickup is where we earn the most trust. When a
                patient goes home after a dental, a mass removal, or a
                spay/neuter, a carrier is required and we follow the handling
                instructions from the owner and your vet team. You can
                read more about how we handle these trips on our{' '}
                <Link
                  href="/charlotte/post-surgery-pet-transport"
                  className={inlineLink}
                >
                  post-surgery pet transport page
                </Link>
                .
              </p>
              <p>
                We are also available on weekends, when many practices see their
                busiest appointment blocks and the fewest available family
                drivers. And for multi-pet households, we transport more than
                one patient per trip — one driver, one vehicle, one arrival time
                your front desk can count on.
              </p>
            </>
          ),
        },
        {
          h2: 'How partnership works',
          body: (
            <>
              <p>
                We have kept this deliberately simple, because we know your
                practice manager does not need another vendor onboarding
                project. <strong>Step 1:</strong> a 15-minute intro call —
                we learn your patient flow, your discharge process, and where
                transportation gaps actually hurt you. <strong>Step 2:</strong>{' '}
                you add Winnie Ride to your client referral resources, the same
                way you list a trusted boarding facility or groomer.
              </p>
              <p>
                <strong>Step 3:</strong> we share a referral code unique to your
                practice. When a client books with it, we know they came from
                you, and they get a smoother intake because we already
                understand your clinic&rsquo;s pickup and drop-off procedures.{' '}
                <strong>Step 4:</strong> if it makes sense for your practice, we
                offer an optional revenue share on referred trips. Some clinics
                take it; others prefer to keep the relationship purely a client
                service. Either works for us.
              </p>
              <p>
                For practices that want to go further — coordinated transport
                for surgical days, standing arrangements with a specialty
                service — our facility portal supports net-30 invoicing so your
                clinic can book on behalf of clients without handling payment at
                the front desk. The broader program is described on our{' '}
                <Link href="/partners" className={inlineLink}>
                  facility partnerships page
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'How we differ from Uber Pet and Lyft Pet',
          body: (
            <>
              <p>
                Rideshare pet options solved one problem: letting a pet into the
                back seat. They did not solve yours. Uber Pet and Lyft Pet do
                not check vaccination status — Winnie Ride requires current
                rabies vaccination before every ride, and the pet&rsquo;s owner
                confirms rabies status when booking.
              </p>
              <p>
                Their drivers are generalists who happen to allow pets, and a
                groggy patient coming home from anesthesia is not the same cargo
                as a commuter&rsquo;s backpack. And because we are a
                direct transportation company, not a marketplace, there is no
                marketplace markup between your client and the ride — and no
                roulette over which driver shows up.
              </p>
              <p>
                None of this is a knock on rideshare for what it does well. It
                is simply a different product. When the patient is sedated,
                anxious, immunocompromised, or precious to someone — which is to
                say, when it is a veterinary patient — the service-level
                differences matter. The full story of who we are lives on the{' '}
                <Link href="/winnie" className={inlineLink}>
                  Winnie Ride overview
                </Link>
                .
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'What vaccines do you require before a ride?',
          a: 'Current rabies vaccination required (plus DAPP for dogs, FVRCP for cats) — the core vaccines as recognized by the AVMA. The pet\'s owner confirms rabies status when booking.',
        },
        {
          q: 'Do you handle sedated pets?',
          a: 'Yes. For post-procedure and sedated patients a carrier is required, and we follow the handling instructions provided by the owner or your veterinary team.',
        },
        {
          q: 'What is your service area?',
          a: 'Charlotte and all of Mecklenburg County, plus Matthews, Pineville, Huntersville, Concord, and Gastonia. If your practice draws patients from beyond that range, call us — longer trips are quoted case by case.',
        },
        {
          q: 'Can clients book through our front desk?',
          a: 'Yes. Once we partner, your front desk can hand clients your practice referral code for online booking, or call our dispatch line at (704) 941-8508 directly to arrange the ride while the client is still standing at the counter.',
        },
        {
          q: 'Do you offer same-day rides for urgent, non-emergency cases?',
          a: 'When vehicles are available, yes — call (704) 941-8508 and dispatch will tell you honestly whether we can make the window. True emergencies should go to the ER vet directly; we are scheduled transport, not an ambulance.',
        },
      ]}
      relatedLinks={[
        { label: 'Pet transport Charlotte', href: '/charlotte/pet-transport' },
        {
          label: 'Post-surgery pet transport',
          href: '/charlotte/post-surgery-pet-transport',
        },
        {
          label: 'Vet appointment rides',
          href: '/charlotte/vet-appointment-rides',
        },
        { label: 'Winnie Ride overview', href: '/winnie' },
        { label: 'Facility partnerships', href: '/partners' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
