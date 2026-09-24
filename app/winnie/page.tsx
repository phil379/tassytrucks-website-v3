import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ServicePage from '@/components/ServicePage';
import PawIcon from '@/components/seo/PawIcon';

import { request } from '@/lib/request-links';

const charlotteServices = [
  { href: '/charlotte/pet-transport', label: 'Pet transport in Charlotte', blurb: 'The full picture — vaccine checks, waivers, photos, trained drivers.' },
  { href: '/charlotte/vet-appointment-rides', label: 'Vet appointment rides', blurb: 'Your pet makes the appointment even when you can’t leave work.' },
  { href: '/charlotte/post-surgery-pet-transport', label: 'Post-surgery pet pickup', blurb: 'Sedation-aware rides home after spay, neuter, or dental procedures.' },
  { href: '/charlotte/calm-pet-transport', label: 'Calm pet transport', blurb: 'Built for anxious, reactive, and senior pets.' },
  { href: '/charlotte/dog-grooming-pickup', label: 'Dog grooming pickup', blurb: 'Same-day and standing weekly grooming runs.' },
  { href: '/charlotte/pet-boarding-transport', label: 'Pet boarding transport', blurb: 'Home to kennel and back, scheduled around your travel.' },
  { href: '/partners/veterinary', label: 'For veterinary clinics', blurb: 'Referral partnerships, vaccine-verified trips, net-30 billing.' },
];

export const metadata: Metadata = {
  title: 'Winnie Ride — Charlotte pet transport | From $49',
  description:
    'Dedicated Charlotte pet transport to the vet, groomer, daycare or boarding — you do not have to go. Flat rates from $49 one way, $89 there and back. (704) 941-8508.',
  alternates: { canonical: '/winnie' },
  openGraph: { url: '/winnie', images: ['/og-image/winnie'] },
};

export default function WinniePage() {
  return (
    <>
    <ServicePage
      eyebrow="Winnie Ride · Pet transport"
      title="Your pet gets there. You don't have to leave work."
      tagline="Vet, groomer, daycare, boarding — and you don't travel with them."
      description="Dedicated pet transportation, with the owner not in the car. We collect your animal from you or from your home, hand them over to the clinic by name, and bring them back. This is the trip you cannot take: the vet appointment on a workday, the standing groomer, the boarding drop-off before a 6am flight. Flat rates from $49 one way, $89 there and back with the wait included."
      bookHref={request.winnie}
      bookLabel="Request a pet ride"
      serviceName="Winnie Ride — Pet Transportation"
      path="/winnie"
      highlightsHeading="Charlotte pet transport, built around your pet"
      highlights={[
        {
          title: 'The owner does not have to come',
          body: 'This is the whole point, and it is what Uber Pet does not do — that is a surcharge for bringing your dog along with you. We take your animal on their own, and hand them over at the other end by name.',
        },
        {
          title: 'A flat price, both ways',
          body: '$49 for anything inside 5 miles one way. $89 there and back, with 20 minutes of wait built in so a quick nail trim does not need two separate trips.',
        },
        {
          title: 'Carrier, harness and a calm cabin',
          body: 'Carrier or harness matched to size, seat protection, and a driver who knows that an anxious dog in a strange car needs a slower door and a quieter voice.',
        },
        {
          title: 'Standing runs cost less',
          body: 'Four trips a month is 10% off, eight trips is 15% off, billed monthly. Built for daycare runs and a groomer you see on the same day every month.',
        },
      ]}
      tiers={[
        {
          name: 'Up to 5 miles',
          price: '$49',
          cadence: 'one way · $89 there and back',
          features: ['Carrier or harness included', 'Seat protection', '20 min wait on a round trip', 'Second pet $15'],
          cta: { label: 'Request this', href: request.winnie },
        },
        {
          name: '6 to 15 miles',
          price: '$59–69',
          cadence: 'one way · $106–124 there and back',
          features: ['Everything above', 'Across Mecklenburg County', 'Handover by name at the clinic', 'Text when they are collected'],
          cta: { label: 'Request this', href: request.winnie },
          highlight: true,
        },
        {
          name: '16 to 25 miles',
          price: '$79–89',
          cadence: 'one way · $142–160 there and back',
          features: ['Everything above', 'Longer runs and out-of-county vets', 'Over 25 miles, call us', 'Monthly plans 10–15% off'],
          cta: { label: 'Request this', href: request.winnie },
        },
      ]}
      partnerCta={{
        title: 'Vets, groomers and boarding facilities',
        body: 'Offer transport to clients who cannot get away during your opening hours. We book on account and invoice monthly, with preferred rates from 10 trips a month.',
        href: 'mailto:phil@tassytrucks.com?subject=Partner%20account%20—%20Winnie%20Ride',
        label: 'Start a partner account',
      }}
    />

    {/* Charlotte Winnie cluster hub — sage accent, additive (MEGA_SEO_002 Phase 3) */}
    <section className="bg-surface border-t border-line">
      <div className="container-x py-16">
        <div className="flex items-center gap-2.5">
          <PawIcon size={22} />
          <div className="eyebrow">Charlotte Services</div>
        </div>
        <h2 className="h-section mt-3 max-w-2xl">
          Winnie Ride across Charlotte, by the trip you need.
        </h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {charlotteServices.map((s) => (
            <Link key={s.href} href={s.href} className="card-tile !p-6 group">
              <div className="h-1 w-10 bg-winnie-sage mb-4" />
              <h3 className="font-serif serif text-xl font-semibold group-hover:text-[#7C9A5C] transition-colors">
                {s.label}
              </h3>
              <p className="mt-2 text-sm ink-mute leading-relaxed">{s.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#7C9A5C]">
                See what&rsquo;s included <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
