import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Dog Grooming Pickup Service in Charlotte NC | Winnie Ride',
  description:
    'Dog grooming pickup and drop-off in Charlotte NC. Same-day rides when available, recurring slots for standing appointments. Call (704) 941-8508.',
  alternates: { canonical: '/charlotte/dog-grooming-pickup' },
  openGraph: { images: ['/og-image/dog-grooming-pickup'] },
};

const CTA_HREF = seoBook('winnie', { source: 'seo-grooming' });

const linkCls = 'underline decoration-winnie-sage underline-offset-2';

export default function DogGroomingPickupPage() {
  return (
    <LandingPageShell
      primaryKeyword="dog grooming pickup service"
      eyebrow="Winnie Ride · Charlotte, North Carolina"
      heroIcon={<PawIcon />}
      accent="sage"
      trustExtras={['Vaccine-verified trips', 'Liability-covered', 'Charlotte-based']}
      h1="Dog Grooming Pickup Service in Charlotte — Your Dog Makes the Appointment, Even When You Can’t"
      heroSubtitle="Round-trip or one-way rides between your door and your groomer’s — same-day when vehicles are available, or on a recurring schedule that matches your standing appointment."
      quickAnswer="Winnie Ride is a dog grooming pickup service covering Charlotte and Mecklenburg County. We drive your dog to the groomer and back — round-trip or one-way, same-day when a vehicle is available, or on a recurring weekly or biweekly schedule. Every trip includes vaccine verification, a signed liability waiver, and a photo at pickup."
      ctaText="Schedule a grooming ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Pet Transportation"
      sections={[
        {
          h2: 'The grooming appointment problem every Charlotte dog owner knows',
          body: (
            <>
              <p>
                It happens two ways. You have a standing grooming appointment —
                same chair, same time, every six weeks — and a work meeting lands
                right on top of it. Or the opposite: your groomer calls with a
                cancellation and can take your dog today, but you are across town
                and can&rsquo;t break away. Either way, the appointment you waited
                weeks for is about to slip.
              </p>
              <p>
                Winnie Ride closes that gap. We pick your dog up at your door,
                deliver him to the groomer, and bring him home freshly trimmed —
                while you stay where you need to be. It is the same Charlotte-based{' '}
                <a href="/charlotte/pet-transport" className={linkCls}>
                  pet transport service
                </a>{' '}
                we run for vet visits and daycare, pointed at the one errand that
                eats half a workday: the grooming run.
              </p>
            </>
          ),
        },
        {
          h2: 'Same-day rides and recurring grooming schedules',
          body: (
            <>
              <p>
                When your groomer has a last-minute opening, call our 24/7 dispatch
                line at (704) 941-8508. If a vehicle is available, we can run a
                same-day trip — we ask for a 2-hour minimum lead time on routine
                rides, which is usually shorter than the window the groomer gives
                you anyway.
              </p>
              <p>
                For standing appointments, set the ride up once and stop thinking
                about it. We schedule recurring weekly or biweekly slots that match
                your grooming cadence, with the same pickup window each time. Book
                round-trip and we handle both legs, including the wait-and-return
                coordination with your groomer&rsquo;s front desk. Book one-way if
                you can manage drop-off but not pickup — or the reverse. Frequent
                riders can put the whole routine on a{' '}
                <a href="/winnie" className={linkCls}>
                  Winnie Ride subscription
                </a>
                , which starts at $39/mo.
              </p>
            </>
          ),
        },
        {
          h2: 'What every grooming ride includes',
          body: (
            <>
              <p>
                This is not a rideshare with a towel on the seat. Winnie Ride is a
                direct relationship with a veteran-owned Charlotte carrier
                operating under USDOT #3104152, and every grooming ride follows the
                same protocol as our medical and{' '}
                <a href="/charlotte/pet-boarding-transport" className={linkCls}>
                  boarding transport
                </a>{' '}
                trips. We verify core vaccines before every ride — rabies plus
                DAPP, consistent with AVMA core vaccine guidance, which is also
                what most Charlotte groomers require at check-in. You sign an owner
                liability waiver for every trip, and you get a photo at pickup so
                you can see your dog loaded and comfortable before the wheels turn.
              </p>
              <p>
                Drivers are trained on carrier handling, and vehicles are
                climate-controlled — which matters twice on a grooming run, because
                your dog rides home freshly bathed and clipped. A hot car undoes a
                blowout fast; ours won&rsquo;t.
              </p>
            </>
          ),
        },
        {
          h2: 'Nervous about the ride? We handle that too',
          body: (
            <p>
              Plenty of dogs love the groomer and hate the car. If your dog is
              anxious, reactive, or getting older, the booking flow captures his
              temperament and triggers, and we match a driver accordingly —
              unhurried handling, no blasting music, and never forcing a reluctant
              dog. That approach has its own page:{' '}
              <a href="/charlotte/calm-pet-transport" className={linkCls}>
                calm pet transport in Charlotte
              </a>
              . Mention anything we should know at booking and the right driver
              shows up prepared.
            </p>
          ),
        },
        {
          h2: 'For groomers: fill the chairs your clients can’t reach',
          body: (
            <>
              <p>
                If you run a grooming shop in Charlotte, Matthews, Concord, or
                Gastonia, you know the math: a no-show because the owner got stuck
                at work is an empty chair you can&rsquo;t refill. A referral
                partnership with Winnie Ride gives your clients a transport option
                you can offer the moment they hesitate — and gives you a way to
                fill last-minute cancellations with clients who want the slot but
                can&rsquo;t make the drive. Email{' '}
                <a href="mailto:book@tassytrucks.com" className={linkCls}>
                  book@tassytrucks.com
                </a>{' '}
                and we will set it up.
              </p>
              <p>
                We serve all of Charlotte and Mecklenburg County, plus Matthews,
                Concord, and Gastonia. Heading out of town and need your dog moved
                to a boarding facility instead? That is a different trip with its
                own logistics — see our pet boarding transport page.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Can you pick up my dog for a grooming appointment today?',
          a: 'Often, yes. Same-day rides run whenever a vehicle is available, with a 2-hour minimum lead time on routine trips. Call 24/7 dispatch at (704) 941-8508 and we will tell you honestly whether we can make your groomer’s window.',
        },
        {
          q: 'Do you offer recurring rides for standing grooming appointments?',
          a: 'Yes — recurring weekly or biweekly slots are one of the main reasons owners use us. We set the series once, matched to your grooming cadence, with the same pickup window every time.',
        },
        {
          q: 'Is the ride round-trip or one-way?',
          a: 'Your choice. Round-trip covers both legs, including coordinating the return pickup with your groomer’s front desk. One-way works when you can handle drop-off but not pickup, or the other way around.',
        },
        {
          q: 'What do you require before a grooming ride?',
          a: 'Vaccine verification before every ride — rabies plus DAPP for dogs, per AVMA core vaccine guidance — and a signed owner liability waiver. Most groomers require the same vaccines, so your records do double duty. You get a photo at pickup on every trip.',
        },
        {
          q: 'How do I know my dog is okay during the ride?',
          a: 'Every trip starts with a photo at pickup, your dog rides in a climate-controlled vehicle with a driver trained on carrier handling, and this is a direct relationship with one Charlotte company — not a marketplace handing your dog to whoever accepts the job.',
        },
      ]}
      relatedLinks={[
        { label: 'Pet transport in Charlotte', href: '/charlotte/pet-transport' },
        { label: 'Pet boarding transport', href: '/charlotte/pet-boarding-transport' },
        { label: 'Calm pet transport', href: '/charlotte/calm-pet-transport' },
        { label: 'Winnie Ride overview', href: '/winnie' },
        { label: 'Veterinary partnerships', href: '/partners/veterinary' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
