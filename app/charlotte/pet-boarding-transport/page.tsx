import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Pet Boarding Pickup & Drop-Off in Charlotte NC | Tassy',
  description:
    'Pet boarding pickup service in Charlotte NC. We drop your dog at the kennel before your flight and bring them home when you land. Call (704) 941-8508.',
  alternates: { canonical: '/charlotte/pet-boarding-transport' },
  openGraph: { images: ['/og-image/pet-boarding-transport'] },
};

const CTA_HREF = seoBook('winnie', { source: 'seo-boarding' });

const linkCls = 'underline decoration-[#7C9A5C] underline-offset-2';

export default function PetBoardingTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="pet boarding pickup service"
      eyebrow="Winnie Ride · Charlotte, North Carolina"
      heroIcon={<PawIcon />}
      accent="sage"
      trustExtras={['Vaccine-verified trips', 'Liability-covered', 'Charlotte-based']}
      h1="Pet Boarding Pickup & Drop-Off in Charlotte — Kennel Runs Scheduled Around Your Flights"
      heroSubtitle="We take your dog or cat to the boarding facility before you fly and bring them home when you land — no favors to ask, no second car to coordinate."
      quickAnswer="Winnie Ride by Tassy Transportation is a pet boarding pickup service covering Charlotte and Mecklenburg County. We handle home-to-kennel drop-offs, boarding-to-home returns, and daily daycare runs, scheduled around your travel. Every trip is vaccine-verified with a photo at pickup — call (704) 941-8508, where dispatch answers 24/7."
      ctaText="Schedule boarding transport"
      ctaHref={CTA_HREF}
      schemaServiceType="Pet Transportation"
      sections={[
        {
          h2: 'The kennel run nobody can cover',
          body: (
            <>
              <p>
                The trip is booked, the boarding reservation is confirmed, and
                then the math stops working: your flight leaves at 7 a.m. and the
                kennel opens at 8. Or you land at 11 p.m. Tuesday and pickup hours
                end at 6. So you start texting neighbors, bargaining with
                coworkers, or paying for two extra nights of boarding just to
                cover the gap.
              </p>
              <p>
                Winnie Ride closes that gap. We&rsquo;re the pet-transport
                division of Tassy Transportation — a Charlotte-based, Service-Disabled
                Veteran-Owned Small Business (SDVOSB) operating under USDOT
                #3104152 and MC #79222 — and boarding runs are one of the most
                common trips we drive. Your dog gets to the facility on time, you
                make your flight, and nobody owes anybody a favor. For the full
                picture of what we drive, start with our{' '}
                <a href="/charlotte/pet-transport" className={linkCls}>
                  Charlotte pet transport page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'Home to kennel, kennel to home — built around your itinerary',
          body: (
            <>
              <p>
                Both directions work the same way. For drop-offs, we pick your pet
                up at home, secure them in a carrier in a climate-controlled
                vehicle, and deliver them to the boarding facility during its
                check-in window — with a photo at pickup so you board your flight
                knowing they&rsquo;re on their way. For returns, we collect your
                pet when the facility releases them and have them home waiting for
                you, or arriving right after you do.
              </p>
              <p>
                Give dispatch your flight times and we schedule around them, not
                the other way around. The same service works for daycare: a
                standing morning drop-off and evening pickup during a heavy work
                stretch, with B2C subscriptions from $39/mo for families who run
                these trips regularly. And if your traveling pet also needs a
                bath before you get back, our{' '}
                <a href="/charlotte/dog-grooming-pickup" className={linkCls}>
                  dog grooming pickup service
                </a>{' '}
                runs on the same model.
              </p>
            </>
          ),
        },
        {
          h2: 'How we keep boarding transport safe',
          body: (
            <>
              <p>
                Boarding facilities require current vaccine records at check-in —
                and so do we. Before every ride we verify vaccines: rabies for all
                pets, plus core DAPP for dogs or FVRCP for cats, consistent with
                AVMA core-vaccine guidance. That means your pet never arrives at
                the kennel door only to be turned away over paperwork.
              </p>
              <p>
                Every trip also includes a signed owner liability waiver, so
                responsibilities are documented in writing before we drive —
                protection for you and for the driver. Pets ride secured in
                carriers handled by drivers trained on carrier handling, in
                climate-controlled vehicles, direct to the facility with no pooled
                stops. Winnie Ride is a direct relationship with one Charlotte
                company, not a marketplace listing — the same trained team every
                time, and rides for nervous travelers are covered on our{' '}
                <a href="/charlotte/vet-appointment-rides" className={linkCls}>
                  vet appointment rides page
                </a>{' '}
                too, if your trip includes a pre-boarding checkup.
              </p>
            </>
          ),
        },
        {
          h2: 'For boarding facilities and kennels: let us drive your clients',
          body: (
            <>
              <p>
                If you run a boarding facility, kennel, or daycare in the
                Charlotte area, transport is probably your most common
                no-show reason: the client who can&rsquo;t make your pickup
                window, the reservation that cancels because nobody could do the
                drive. A referral relationship with Winnie Ride fixes that — you
                recommend us, we get your clients&rsquo; pets to your door, and
                your occupancy stops depending on their schedules.
              </p>
              <p>
                Partner facilities get access to our facility portal with net-30
                invoicing, so transport you arrange on a client&rsquo;s behalf is
                billed cleanly instead of handled ride by ride. Start at our{' '}
                <a href="/partners/veterinary" className={linkCls}>
                  partnership page
                </a>{' '}
                or email{' '}
                <a href="mailto:booking@tassytrucks.com" className={linkCls}>
                  booking@tassytrucks.com
                </a>{' '}
                and we&rsquo;ll set up a conversation.
              </p>
            </>
          ),
        },
        {
          h2: 'Booking and service area',
          body: (
            <p>
              Book online in about two minutes or call (704) 941-8508 — dispatch
              answers 24/7, which matters when your flight lands late. Routine
              rides need a 2-hour minimum lead time, but boarding runs are best
              booked as soon as your travel is confirmed so your preferred
              windows are locked in. We cover all of Charlotte and Mecklenburg
              County, plus Matthews, Huntersville, and Concord — and if your
              kennel sits just beyond that, call us and we&rsquo;ll quote it. For
              everything else Winnie Ride does, see the{' '}
              <a href="/winnie" className={linkCls}>
                Winnie Ride overview
              </a>
              .
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Can you pick up my dog from boarding while I am still traveling?',
          a: 'Yes. With your authorization and a signed liability waiver on file, we coordinate the release with the facility, send you a photo at pickup, and bring your dog home — to you, or to a trusted adult you authorize to receive them.',
        },
        {
          q: 'What if my flight is delayed and the pickup time changes?',
          a: 'Call (704) 941-8508 and dispatch will move the window — a person answers 24/7. Boarding runs are scheduled around flights all the time, so a shifted arrival is a normal adjustment, not a problem.',
        },
        {
          q: 'Do you handle the vaccine paperwork the boarding facility requires?',
          a: 'We verify vaccine records before every ride — rabies plus core DAPP for dogs or FVRCP for cats, per AVMA guidance — and boarding facilities require the same records at check-in. Send them when you book and your pet will not be turned away at the door.',
        },
        {
          q: 'Can you do recurring daycare drop-offs and pickups?',
          a: 'Yes. We schedule standing daycare runs — same windows, same driver approach, every time — and B2C subscriptions start at $39/mo for families who use pet transport regularly.',
        },
        {
          q: 'How do boarding facilities partner with Winnie Ride?',
          a: 'It is a referral relationship: you recommend us to clients who need transport, and partner facilities get access to our facility portal with net-30 invoicing. Start at our veterinary partnership page or email booking@tassytrucks.com.',
        },
      ]}
      relatedLinks={[
        { label: 'Pet transport in Charlotte', href: '/charlotte/pet-transport' },
        { label: 'Dog grooming pickup', href: '/charlotte/dog-grooming-pickup' },
        { label: 'Vet appointment rides', href: '/charlotte/vet-appointment-rides' },
        { label: 'Winnie Ride overview', href: '/winnie' },
        { label: 'Facility partnerships', href: '/partners/veterinary' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
