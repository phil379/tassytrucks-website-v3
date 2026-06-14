import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Pet Transport in Charlotte NC — Winnie Ride | Tassy',
  description:
    'Professional pet transport in Charlotte NC. Vaccine-verified rides to the vet, groomer, and boarding. Veteran-owned. Book online or call (704) 941-8508.',
  alternates: { canonical: '/charlotte/pet-transport' },
  openGraph: { images: ['/og-image/pet-transport'] },
};

const CTA_HREF = seoBook('winnie', { source: 'seo-pet' });

const linkCls = 'underline decoration-[#7C9A5C] underline-offset-2';

export default function PetTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="pet transport charlotte nc"
      eyebrow="Winnie Ride · Charlotte, North Carolina"
      heroIcon={<PawIcon />}
      accent="sage"
      trustExtras={['Vaccine-verified trips', 'Liability-covered', 'Charlotte-based']}
      h1="Pet Transport in Charlotte, NC — Rides Your Dog or Cat Actually Deserves"
      heroSubtitle="Winnie Ride is door-to-door pet transport for Charlotte families — to the vet, the groomer, or boarding — run by a local company you can call, not an app you hope shows up."
      quickAnswer="Winnie Ride is the pet transport service of Tassy Transportation, a veteran-owned Charlotte company. We move your dog or cat door-to-door in climate-controlled vehicles, with vaccine verification before every ride, a signed liability waiver, and a photo sent at pickup. Book online or call (704) 941-8508 — dispatch answers 24/7."
      ctaText="Book a pet ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Pet Transportation"
      sections={[
        {
          h2: 'What professional pet transport actually is',
          body: (
            <>
              <p>
                Professional pet transport is a scheduled, door-to-door ride for
                your pet — with a trained driver, a climate-controlled vehicle, and
                a process built around animals instead of bolted onto a people
                service. It is not a rideshare driver who happens to tolerate dogs,
                and it is not asking a neighbor for one more favor. Your dog or cat
                travels secured, comfortable, and accounted for from your front
                door to the destination and back.
              </p>
              <p>
                Who books it? Charlotte pet parents who work during clinic hours.
                Families heading out of town at dawn with a dog who still needs to
                get to boarding. Households where the only car leaves at 7 a.m.
                Seniors who no longer drive but whose cat still has a standing
                appointment. If you have ever rearranged an entire workday around
                a twenty-minute vet visit, this service was built for you.
              </p>
              <p>
                Winnie Ride is operated by Tassy Transportation, a Charlotte-based,
                Service-Disabled Veteran-Owned Small Business (SDVOSB) running
                under USDOT #3104152 and MC #79222. We are a real transportation
                company with real authority — the same standards we hold for
                medical transport apply to the seat your pet rides in.
              </p>
              <p>
                That matters because most &ldquo;pet taxi&rdquo; options in
                Charlotte are marketplaces: an app matches you with a stranger, and
                nobody owns the outcome. With Winnie Ride, the company that takes
                your booking is the company that drives your pet. Direct
                relationship, direct accountability.
              </p>
            </>
          ),
        },
        {
          h2: 'What makes Winnie Ride different',
          body: (
            <>
              <p>
                Every Winnie Ride trip — every single one — includes the same
                non-negotiables:
              </p>
              <p>
                <strong>Vaccine verification before every ride.</strong> We confirm
                rabies vaccination for all pets, plus DAPP for dogs and FVRCP for
                cats — the core vaccines recommended by the{' '}
                <a
                  href="https://www.avma.org/resources-tools/pet-owners/petcare/vaccinations"
                  className={linkCls}
                >
                  American Veterinary Medical Association
                </a>
                . It protects your pet, every other pet in our vehicles, and our
                drivers.
              </p>
              <p>
                <strong>A signed liability waiver on every trip.</strong> You know
                exactly where responsibility sits before a wheel turns. No fine
                print buried in an app you agreed to two years ago.
              </p>
              <p>
                <strong>A photo at pickup, every time.</strong> The moment your dog
                or cat is in our care, you see it. You are never left wondering
                whether the ride actually happened.
              </p>
              <p>
                <strong>Drivers trained for animals.</strong> Our team is trained
                on carrier handling and sedation-aware protocols, so a post-surgery
                cat or an anxious dog gets handled correctly, not just hauled.
                Every vehicle is climate-controlled — Charlotte summers are not a
                place for guesswork.
              </p>
            </>
          ),
        },
        {
          h2: 'One service, every trip your pet takes',
          body: (
            <>
              <p>
                Think of this page as the front door. Depending on the trip your
                pet needs, we have a dedicated service — and a dedicated page that
                explains exactly how it works:
              </p>
              <p>
                <strong>Vet appointments.</strong> You are at work, the clinic
                closes at 5, and your dog needs to be seen. Our{' '}
                <a href="/charlotte/vet-appointment-rides" className={linkCls}>
                  rides to the vet
                </a>{' '}
                handle pickup, drop-off, clinic coordination, and the trip home —
                without you burning PTO.
              </p>
              <p>
                <strong>After surgery.</strong> A pet coming out of anesthesia
                needs a quiet, careful, sedation-aware ride home. That is exactly
                what our{' '}
                <a href="/charlotte/post-surgery-pet-transport" className={linkCls}>
                  post-surgery pet transport
                </a>{' '}
                is built for.
              </p>
              <p>
                <strong>Boarding and daycare.</strong> Heading to the airport at 6
                a.m.? Our{' '}
                <a href="/charlotte/pet-boarding-transport" className={linkCls}>
                  pet boarding transport
                </a>{' '}
                gets your dog or cat checked in — and picked up when you land.
              </p>
              <p>
                <strong>Anxious riders.</strong> Some pets shake the moment the
                carrier comes out. Our{' '}
                <a href="/charlotte/calm-pet-transport" className={linkCls}>
                  calm pet transport
                </a>{' '}
                approach slows everything down for pets who need a gentler trip.
              </p>
              <p>
                <strong>Grooming day.</strong> With{' '}
                <a href="/charlotte/dog-grooming-pickup" className={linkCls}>
                  dog grooming pickup
                </a>
                , your dog goes out scruffy and comes home fresh while you get on
                with your day.
              </p>
            </>
          ),
        },
        {
          h2: 'For Charlotte veterinary clinics and pet businesses',
          body: (
            <>
              <p>
                If you run a veterinary practice, you already know the no-show
                math: the client who could not leave work is the appointment that
                did not happen. We work directly with clinics across Charlotte and
                Mecklenburg County as their transport answer — when a client says
                &ldquo;I can&rsquo;t get there,&rdquo; your front desk has a name
                and a number instead of a shrug.
              </p>
              <p>
                Our{' '}
                <a href="/partners/veterinary" className={linkCls}>
                  veterinary partner program
                </a>{' '}
                covers how referrals, scheduling, and coordination work for
                practices, groomers, and boarding facilities. One conversation, and
                your clients have a transport option you can vouch for.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive, and how booking works',
          body: (
            <>
              <p>
                We are based in Charlotte and cover all of Mecklenburg County, plus
                the surrounding towns pet families actually live in — Matthews,
                Pineville, Huntersville, and Concord. If your vet is in one town
                and your home is in another, that is a normal Tuesday for us.
              </p>
              <p>
                Booking takes about two minutes online, or call (704) 941-8508 —
                dispatch answers 24/7. For routine rides we ask for a minimum of
                two hours&rsquo; lead time, though more notice always helps us hold
                your preferred window. Have your pet&rsquo;s vaccine records handy
                the first time; after that, we have them on file.
              </p>
              <p>
                If your pet rides regularly — weekly grooming, recurring vet
                visits, daycare — a{' '}
                <a href="/winnie" className={linkCls}>
                  Winnie Ride subscription
                </a>{' '}
                starting at $39/mo is usually the smarter math than booking trip by
                trip.
              </p>
              <p>
                One more thing worth saying plainly: you will never be guessing
                who has your pet. From the photo at pickup to a driver who answers
                to our dispatch — not an algorithm — every Winnie Ride trip has a
                person accountable for it, and a Charlotte phone number behind it.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'How much notice do you need to book a pet ride in Charlotte?',
          a: 'A minimum of two hours for routine rides. More notice makes it easier to guarantee your preferred pickup window, so book the day before when you can. Call (704) 941-8508 and dispatch will tell you honestly what is available.',
        },
        {
          q: 'What vaccines does my pet need to ride?',
          a: 'We verify rabies vaccination for all pets before every ride, plus DAPP for dogs and FVRCP for cats — the core vaccines per AVMA guidance. Send records when you book the first trip; we keep them on file after that.',
        },
        {
          q: 'How do I know my pet is safe during the ride?',
          a: 'You get a photo at pickup the moment your pet is in our care, a signed liability waiver sets expectations before every trip, and our drivers are trained on carrier handling and sedation-aware protocols. Every vehicle is climate-controlled.',
        },
        {
          q: 'Is Winnie Ride an app or a marketplace?',
          a: 'Neither. Winnie Ride is operated directly by Tassy Transportation, a veteran-owned Charlotte transportation company (USDOT #3104152). The company you book with is the company that drives your pet — no third-party matching.',
        },
        {
          q: 'What areas around Charlotte do you cover?',
          a: 'All of Charlotte and Mecklenburg County, plus Matthews, Pineville, Huntersville, and Concord. For trips beyond that range, call us and we will quote it case by case.',
        },
      ]}
      relatedLinks={[
        { label: 'Rides to the vet', href: '/charlotte/vet-appointment-rides' },
        { label: 'Post-surgery pet transport', href: '/charlotte/post-surgery-pet-transport' },
        { label: 'Pet boarding transport', href: '/charlotte/pet-boarding-transport' },
        { label: 'Calm pet transport', href: '/charlotte/calm-pet-transport' },
        { label: 'Dog grooming pickup', href: '/charlotte/dog-grooming-pickup' },
        { label: 'Veterinary partners', href: '/partners/veterinary' },
        { label: 'Winnie Ride overview', href: '/winnie' },
      ]}
    />
  );
}
