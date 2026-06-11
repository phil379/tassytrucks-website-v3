import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Post-Surgery Pet Transport Charlotte — Dog Pickup | Tassy',
  description:
    'Sedation-aware pet transport in Charlotte NC. Safe rides home after your dog or cat’s spay, neuter, or dental. Book online or call (704) 941-8508.',
  alternates: { canonical: '/charlotte/post-surgery-pet-transport' },
  openGraph: { images: ['/og-image/post-surgery-pet-transport'] },
};

const CTA_HREF = seoBook('winnie', { source: 'seo-postop', sedated: '1' });

const linkCls = 'underline decoration-[#7C9A5C] underline-offset-2';

export default function PostSurgeryPetTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="dog pickup after surgery"
      eyebrow="Winnie Ride · Charlotte, North Carolina"
      heroIcon={<PawIcon />}
      accent="sage"
      trustExtras={['Vaccine-verified trips', 'Liability-covered', 'Charlotte-based']}
      h1="Post-Surgery Pet Transport in Charlotte — Safe Rides Home After Your Dog or Cat's Procedure"
      heroSubtitle="A sedation-aware driver picks your pet up from the vet, follows the discharge instructions, and brings them straight to your door — so nobody has to drive with one eye on the back seat."
      quickAnswer="Winnie Ride by Tassy Trucks provides post-surgery pet pickup across Charlotte and Mecklenburg County. Our drivers are trained in sedation-aware handling, every pet rides secured in a carrier in a climate-controlled vehicle, and you get a photo at pickup. Call (704) 941-8508 or book online — dispatch answers 24/7."
      ctaText="Book a post-op pickup"
      ctaHref={CTA_HREF}
      schemaServiceType="Pet Transportation"
      sections={[
        {
          h2: 'Driving home with a sedated pet is a two-person job',
          body: (
            <>
              <p>
                Here is the moment this page exists for: your dog just had a spay,
                neuter, or dental, the clinic calls to say she&rsquo;s ready, and
                she&rsquo;s still groggy from sedation. You&rsquo;re supposed to
                drive, watch the road, and keep an eye on a wobbly, disoriented pet
                — all at once, alone. Most vets will tell you the same thing:
                that&rsquo;s not a safe setup for you or for her.
              </p>
              <p>
                Winnie Ride is the pet-transport division of Tassy Trucks, a
                Charlotte-based, Service-Disabled Veteran-Owned Small Business
                (SDVOSB) operating under USDOT #3104152 and MC #79222. We handle
                the drive so your only job is meeting your pet at the door. We
                cover all of Charlotte and Mecklenburg County, plus Matthews,
                Pineville, and Huntersville. For everyday trips that aren&rsquo;t
                post-op, see our main{' '}
                <a href="/charlotte/pet-transport" className={linkCls}>
                  Charlotte pet transport page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'How our drivers handle sedated pets',
          body: (
            <>
              <p>
                Post-procedure rides follow a stricter protocol than a routine
                trip. A secured carrier is required — a sedated dog or cat should
                never ride loose, and our drivers are trained on carrier handling
                so loading and unloading stays calm and gentle. Before the wheels
                move, the driver reviews your vet&rsquo;s discharge instructions
                and follows them exactly: how your pet should be positioned, what
                to avoid, and anything the clinic flagged for the trip home.
              </p>
              <p>
                Drivers are also trained on sedation-aware protocols — slower,
                smoother driving, no unnecessary stops, and attention to how your
                pet is doing throughout the ride. The vehicle is climate-controlled
                the entire trip, which matters for a pet whose body is still
                working off anesthesia. And as with every Winnie Ride trip, we
                verify vaccine records before the ride — rabies for all pets, plus
                the core DAPP series for dogs and FVRCP for cats, consistent with
                AVMA core-vaccine guidance. If your pet is healthy but simply
                anxious in cars, our{' '}
                <a href="/charlotte/calm-pet-transport" className={linkCls}>
                  calm pet transport page
                </a>{' '}
                covers how we handle nervous riders.
              </p>
            </>
          ),
        },
        {
          h2: 'Why a signed liability waiver matters after surgery',
          body: (
            <>
              <p>
                Every Winnie Ride trip — post-op or routine — includes a signed
                owner liability waiver before we drive. For post-surgery pickups,
                that paperwork is not a formality. It documents your pet&rsquo;s
                condition, confirms you&rsquo;ve authorized transport while your
                pet is recovering from sedation, and sets out exactly what the
                driver will and won&rsquo;t do en route.
              </p>
              <p>
                That protects both sides. It protects you, because the
                responsibilities are in writing instead of assumed. And it
                protects the driver, because handling a sedated pet carries real
                liability and a professional service should never wave that away
                with a handshake. A company willing to put a post-op trip in
                writing is a company that has actually thought about what can go
                wrong — and built a process so it doesn&rsquo;t.
              </p>
            </>
          ),
        },
        {
          h2: 'After the procedure: follow your vet’s discharge instructions',
          body: (
            <>
              <p>
                We&rsquo;re drivers, not veterinarians, and we&rsquo;re careful
                about that line. The authority on your pet&rsquo;s recovery is
                your veterinarian&rsquo;s written discharge instructions —
                feeding, medication, activity limits, incision care, and what
                warrants a call back to the clinic. Read them before the ride if
                you can, and keep them handy for the first days home.
              </p>
              <p>
                In general terms only: most clinics ask owners to give a recovering
                pet a quiet, comfortable space, limit activity as directed, and
                watch for anything the discharge sheet tells you to watch for. If
                something seems off, call your vet — not us, and not the internet.
                For broader pet-owner guidance, the American Veterinary Medical
                Association maintains{' '}
                <a
                  href="https://www.avma.org/resources-tools/pet-owners"
                  className={linkCls}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  pet owner resources at avma.org
                </a>
                . We also provide compassionate end-of-life transport — please
                call (704) 941-8508 to discuss.
              </p>
            </>
          ),
        },
        {
          h2: 'What to expect on the ride — and booking around discharge times',
          body: (
            <>
              <p>
                When the driver arrives at the clinic, you get a photo at pickup —
                every trip, no exceptions — so you see your pet safely in the
                carrier before the ride starts. The route runs direct to your
                door: no pooled stops, no other pets, no detours. Winnie Ride is a
                direct relationship with one Charlotte company, not a marketplace
                handing your sedated pet to whoever accepts the job.
              </p>
              <p>
                Discharge times move — clinics run long, and a vet may want one
                more hour of observation. That&rsquo;s fine. Book the pickup
                window once you have a rough discharge estimate, and call dispatch
                at (704) 941-8508 if the clinic shifts it; a person answers 24/7.
                Routine rides need a 2-hour minimum lead time, so the moment the
                clinic gives you a window is the moment to book. If your pet has
                regular checkups ahead, our{' '}
                <a href="/charlotte/vet-appointment-rides" className={linkCls}>
                  vet appointment rides
                </a>{' '}
                handle the round trip — and clinics that want a standing transport
                partner can start at our{' '}
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
          q: 'Can you pick up my dog from the vet after surgery if I am at work?',
          a: 'Yes. With your authorization and a signed liability waiver, our driver coordinates directly with the clinic, secures your dog in a carrier, sends you a photo at pickup, and brings them straight to your door. You arrange the handoff at home or authorize a trusted adult to receive them.',
        },
        {
          q: 'Does my pet have to be in a carrier after sedation?',
          a: 'Yes — a secured carrier is required for every post-op trip. A sedated pet riding loose is unsafe for the pet and the driver. If you do not own a carrier, tell dispatch when you book and we will work out the safest option before the ride.',
        },
        {
          q: 'What vaccine records do you need before a post-surgery ride?',
          a: 'We verify vaccine records before every ride: rabies for all pets, plus core DAPP for dogs or FVRCP for cats, per AVMA core-vaccine guidance. Your vet clinic usually has these on file and can share them at discharge, which makes post-op pickups simple.',
        },
        {
          q: 'How soon can you get to the clinic once my pet is discharged?',
          a: 'Routine rides need a 2-hour minimum lead time, so book as soon as the clinic gives you a discharge estimate. If the time shifts, call (704) 941-8508 and dispatch will adjust the pickup window — a person answers 24/7.',
        },
        {
          q: 'What areas around Charlotte do you cover for post-op pet pickup?',
          a: 'All of Charlotte and Mecklenburg County, plus Matthews, Pineville, and Huntersville. If your clinic or home is just outside that range, call us — we quote longer trips case by case.',
        },
      ]}
      relatedLinks={[
        { label: 'Pet transport in Charlotte', href: '/charlotte/pet-transport' },
        { label: 'Vet appointment rides', href: '/charlotte/vet-appointment-rides' },
        { label: 'Calm pet transport', href: '/charlotte/calm-pet-transport' },
        { label: 'Veterinary partnerships', href: '/partners/veterinary' },
        { label: 'Winnie Ride overview', href: '/winnie' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
