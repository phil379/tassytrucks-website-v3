import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Calm Pet Transport in Charlotte NC | Winnie Ride',
  description:
    'Calm pet transport in Charlotte NC for anxious, fearful, and senior pets. Drivers matched to temperament, quiet climate-controlled rides. (704) 941-8508.',
  alternates: { canonical: '/charlotte/calm-pet-transport' },
  openGraph: { images: ['/og-image/calm-pet-transport'] },
};

const CTA_HREF = seoBook('winnie', { source: 'seo-calm', temperament: 'anxious' });

const linkCls = 'underline decoration-winnie-sage underline-offset-2';

export default function CalmPetTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="calm pet transport charlotte"
      eyebrow="Winnie Ride · Charlotte, North Carolina"
      heroIcon={<PawIcon />}
      accent="sage"
      trustExtras={['Vaccine-verified trips', 'Liability-covered', 'Charlotte-based']}
      h1="Calm Pet Transport in Charlotte for Anxious, Fearful, and Senior Pets"
      heroSubtitle="A quiet, climate-controlled ride with a driver matched to your pet’s temperament — because a stressed pet shouldn’t have to ride in a stranger’s car."
      quickAnswer="Calm pet transport means a quiet, climate-controlled vehicle, a driver trained on carrier handling, and a pace set by your pet rather than the clock. Winnie Ride by Tassy Transportation matches drivers to your pet's temperament across Charlotte and Mecklenburg County. You tell us your pet's triggers at booking, and the right driver shows up prepared."
      ctaText="Book a calm ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Pet Transportation"
      sections={[
        {
          h2: 'Why car rides stress some pets — and what a calm setup looks like',
          body: (
            <>
              <p>
                For a lot of pets, the car only ever means one thing: something
                unfamiliar is about to happen. Add engine noise, sliding around on a
                seat, a hot interior, and a stranger reaching for them, and you have
                a recipe for panting, drooling, whining, or a dog who plants all
                four feet at the curb and refuses to move.
              </p>
              <p>
                A calm setup is not complicated — it is just deliberate. Your
                pet&rsquo;s carrier is secured so it doesn&rsquo;t shift in turns.
                The cabin is climate-controlled and held at a stable, comfortable
                temperature. There is no blasting music and no hurried handling at
                either end of the trip. The driver moves at your pet&rsquo;s pace,
                not the schedule&rsquo;s. These are common-sense practices, but they
                only happen when the person behind the wheel is trained to do them
                every single time.
              </p>
              <p>
                That is the core difference between Winnie Ride and the
                pet-friendly rideshare option. A rideshare is a stranger&rsquo;s
                car with no pet handling training and no idea what your pet needs.
                Winnie Ride is a direct relationship with a Charlotte-based,
                veteran-owned carrier — our{' '}
                <a href="/charlotte/pet-transport" className={linkCls}>
                  pet transport service
                </a>{' '}
                runs on drivers trained in carrier handling and sedation-aware
                protocols, with a signed owner liability waiver and vaccine
                verification before every ride.
              </p>
            </>
          ),
        },
        {
          h2: 'Reactive and fearful dogs: we plan around triggers',
          body: (
            <>
              <p>
                If your dog is reactive to other dogs, wary of men in hats, or
                terrified of slamming doors, you already manage those triggers
                every day. Your dog&rsquo;s ride should manage them too. When you
                book, you tell us exactly what sets your dog off, and we plan the
                trip around it — which driver is assigned, how the approach at
                pickup happens, and how much time is built in.
              </p>
              <p>
                One rule never bends: we never force a frightened pet. If your dog
                needs a few extra minutes at the door, the driver takes a few extra
                minutes. Veterinary medicine has moved in the same direction —
                programs like Fear Free (fearfreepets.com) have raised awareness of
                low-stress handling across clinics nationwide, and owners in
                Charlotte increasingly expect that standard everywhere their pet
                goes, including the ride to the appointment. Many of the{' '}
                <a href="/charlotte/vet-appointment-rides" className={linkCls}>
                  vet appointment rides
                </a>{' '}
                we run are for exactly these dogs.
              </p>
            </>
          ),
        },
        {
          h2: 'Senior pets: slower pace, steadier hands',
          body: (
            <>
              <p>
                Older pets need a different kind of care. Arthritic joints
                don&rsquo;t do well with a quick boost into a tall vehicle. Hearing
                or vision loss means sudden movement is more startling than it used
                to be. Our drivers take lifts, steps, and thresholds slowly, support
                your dog&rsquo;s weight properly, and never rush a senior pet who
                needs an extra moment to find footing.
              </p>
              <p>
                For families managing a senior pet&rsquo;s medical care — recheck
                visits, lab work, or recovery after a procedure — calm transport
                pairs naturally with our{' '}
                <a href="/charlotte/post-surgery-pet-transport" className={linkCls}>
                  post-surgery pet transport
                </a>
                , where drivers follow the discharge instructions you share at
                booking.
              </p>
            </>
          ),
        },
        {
          h2: 'Cats: carrier-first, always',
          body: (
            <>
              <p>
                Cats are not small dogs, and we don&rsquo;t treat them like small
                dogs. Every cat rides carrier-first: the carrier stays secured and
                level, it is carried smoothly rather than swung, and it is never
                opened in transit. The cabin stays quiet, because a cat who can
                hear the road but not see a threat does better without a radio
                competing for attention.
              </p>
              <p>
                If your cat hides at the sight of the carrier, tell us at booking.
                We schedule pickup windows with enough margin that you are not
                wrestling your cat into a carrier with a driver idling outside. As
                with every Winnie Ride trip, we verify core vaccines first — rabies
                plus FVRCP for cats, per AVMA core vaccine guidance — and you get a
                photo at pickup so you know your cat is settled and on the way.
              </p>
            </>
          ),
        },
        {
          h2: 'How booking captures your pet’s temperament',
          body: (
            <>
              <p>
                The booking flow asks about temperament directly — anxious,
                fearful, reactive, senior, or easygoing — along with specific
                triggers and handling notes. That information is not a courtesy
                field; it determines which driver is assigned to your trip. A dog
                who panics around other dogs gets a driver and a plan that keep the
                route and pickup clear of them. An anxious first-timer gets the
                unhurried treatment from the first knock.
              </p>
              <p>
                Booking takes about two minutes online, or you can call our 24/7
                dispatch line at (704) 941-8508 and talk it through with a person.
                We ask for a 2-hour minimum lead time on routine rides, and we
                serve all of Charlotte and Mecklenburg County plus Matthews,
                Pineville, and Huntersville. If you ride with us regularly,{' '}
                <a href="/winnie" className={linkCls}>
                  Winnie Ride subscriptions
                </a>{' '}
                start at $39/mo. Veterinary clinics looking for a calm-transport
                partner can learn more on our{' '}
                <a href="/partners/veterinary" className={linkCls}>
                  veterinary partnership page
                </a>
                .
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'What makes a pet transport ride "calm"?',
          a: 'A secured carrier, a stable cabin temperature, no loud music, and unhurried handling at pickup and drop-off — delivered by a driver trained on carrier handling who knows your pet’s temperament before arriving. We capture triggers and handling notes at booking so the right driver shows up prepared.',
        },
        {
          q: 'Can you transport a reactive or fearful dog in Charlotte?',
          a: 'Yes. Tell us your dog’s triggers when you book and we plan the trip around them, from driver assignment to how the pickup approach happens. We never force a frightened pet — if your dog needs extra time, the driver takes extra time.',
        },
        {
          q: 'Do you sedate pets for transport?',
          a: 'No. Sedation decisions belong to you and your veterinarian. If your vet has prescribed a pre-ride medication, let us know at booking — our drivers are trained on sedation-aware protocols and will handle and monitor your pet accordingly.',
        },
        {
          q: 'What do you require before a calm pet transport ride?',
          a: 'Vaccine verification before every ride — rabies for all pets, plus DAPP for dogs or FVRCP for cats, consistent with AVMA core vaccine guidance — and a signed owner liability waiver. You also get a photo at pickup on every trip.',
        },
        {
          q: 'What areas around Charlotte do you cover for anxious-pet transport?',
          a: 'All of Charlotte and Mecklenburg County, plus Matthews, Pineville, and Huntersville. Routine rides need a 2-hour minimum lead time; call 24/7 dispatch at (704) 941-8508 for anything time-sensitive.',
        },
      ]}
      relatedLinks={[
        { label: 'Pet transport in Charlotte', href: '/charlotte/pet-transport' },
        { label: 'Vet appointment rides', href: '/charlotte/vet-appointment-rides' },
        { label: 'Post-surgery pet transport', href: '/charlotte/post-surgery-pet-transport' },
        { label: 'Winnie Ride overview', href: '/winnie' },
        { label: 'Veterinary partnerships', href: '/partners/veterinary' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
