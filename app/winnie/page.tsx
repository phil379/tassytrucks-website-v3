import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ServicePage from '@/components/ServicePage';
import PawIcon from '@/components/seo/PawIcon';

import WinnieWaitlistForm from '@/components/winnie/WinnieWaitlistForm';
import { winnieRoundTrip, winnieRoundTripRange } from '@/lib/price-table';

const charlotteServices = [
  { href: '/charlotte/pet-transport', label: 'Pet transport in Charlotte', blurb: 'The full picture — how it works, what it costs, and what your pet needs to ride.' },
  { href: '/charlotte/vet-appointment-rides', label: 'Vet appointment rides', blurb: 'Your pet makes the appointment even when you can’t leave work.' },
  { href: '/charlotte/post-surgery-pet-transport', label: 'Post-surgery pet pickup', blurb: 'Rides home after spay, neuter, or dental procedures.' },
  { href: '/charlotte/calm-pet-transport', label: 'Calm pet transport', blurb: 'Built for anxious, reactive, and senior pets.' },
  { href: '/charlotte/dog-grooming-pickup', label: 'Dog grooming pickup', blurb: 'Same-day and standing weekly grooming runs.' },
  { href: '/charlotte/pet-boarding-transport', label: 'Pet boarding transport', blurb: 'Home to kennel and back, scheduled around your travel.' },
  { href: '/partners/veterinary', label: 'For veterinary clinics', blurb: 'Referral partnerships and weekly invoicing.' },
];

export const metadata: Metadata = {
  title: { absolute: 'Winnie Ride — coming soon' },
  description:
    'Winnie Ride, dedicated Charlotte pet transport to the vet, groomer, daycare or boarding, is coming soon. Join the list and we will contact you when it opens.',
  alternates: { canonical: '/winnie' },
  openGraph: { url: '/winnie', images: ['/og-image/winnie'] },
};

/**
 * Winnie Ride — COMING SOON / JOIN LIST (Phil, 2026-11-18).
 *
 * The phased launch opens Care, Recovery and Concierge first; Winnie does
 * not take bookings until a real Winnie driver exists. This page keeps
 * selling what the service will be — the tiers and published rates stay,
 * framed as what rides will cost when the service opens — and every
 * booking CTA became a join-list CTA. The form collects a lead
 * (lib/winnie-waitlist.ts); it does not book, charge or promise a start
 * date. Same flip Scholar got on 2026-11-17 (PR #111). The marketing
 * content — highlights, tiers, the Charlotte cluster below — is unchanged
 * apart from the CTAs and the coming-soon framing.
 */

export default function WinniePage() {
  return (
    <>
    <ServicePage
      eyebrow="Winnie Ride · Coming soon"
      title="Your pet gets there. You don't have to leave work."
      tagline="Vet, groomer, daycare, boarding — and you don't travel with them."
      description={`Dedicated pet transportation, with the owner not in the car. We collect your animal from you or from your home, hand them over to the clinic by name, and bring them back. This is the trip you cannot take: the vet appointment on a workday, the standing groomer, the boarding drop-off before a 6am flight. Flat rates from $59 one way, ${winnieRoundTrip(0)} there and back with the wait included. Winnie Ride is not open yet — we open it when its first driver is in place, and the list below is how you hear first.`}
      bookHref="#join-list"
      bookLabel="Join the Winnie list"
      serviceName="Winnie Ride — Pet Transportation"
      trustChips={['SDVOSB certified', 'Licensed & insured']}
      path="/winnie"
      highlightsHeading="Charlotte pet transport, built around your pet"
      highlights={[
        {
          title: 'The owner does not have to come',
          body: 'This is the whole point, and it is what Uber Pet does not do — that is a surcharge for bringing your dog along with you. We take your animal on their own, and hand them over at the other end by name.',
        },
        {
          title: 'A flat price, both ways',
          body: `$59 for anything inside 5 miles one way. ${winnieRoundTrip(0)} there and back, with 20 minutes of wait built in so a quick nail trim does not need two separate trips.`,
        },
        {
          title: 'Carrier, harness and a calm cabin',
          body: 'Carrier or harness matched to size, seat protection, and a driver who knows that an anxious dog in a strange car needs a slower door and a quieter voice.',
        },
        {
          title: 'Standing runs cost less',
          body: 'Four trips a month is 10% off, eight trips is 15% off, each ride billed after the ride. Built for daycare runs and a groomer you see on the same day every month.',
        },
      ]}
      tiers={[
        {
          name: 'Up to 5 miles',
          price: '$59',
          cadence: `one way · ${winnieRoundTrip(0)} there and back`,
          features: ['Carrier or harness included', 'Seat protection', '20 min wait on a round trip', 'Second pet $15', 'Weekends +$20'],
          cta: { label: 'Join the list', href: '#join-list' },
        },
        {
          name: '6 to 15 miles',
          price: '$79–89',
          cadence: `one way · ${winnieRoundTripRange(1, 2)} there and back`,
          features: ['Everything above', 'Across Mecklenburg County', 'Handover by name at the clinic', 'Text when they are collected', 'Second pet $15', 'Weekends +$20'],
          cta: { label: 'Join the list', href: '#join-list' },
          highlight: true,
        },
        {
          name: '16 to 25 miles',
          price: '$99–109',
          cadence: `one way · ${winnieRoundTripRange(3, 4)} there and back`,
          features: ['Everything above', 'Longer runs and out-of-county vets', 'Over 25 miles, call us', 'Monthly plans 10–15% off', 'Second pet $15', 'Weekends +$20'],
          cta: { label: 'Join the list', href: '#join-list' },
        },
      ]}
      partnerCta={{
        title: 'Vets, groomers and boarding facilities',
        body: 'Offer transport to clients who cannot get away during your opening hours. We book on account and invoice weekly on 7-day terms — no card taken.',
        href: 'mailto:phil@tassytrucks.com?subject=Partner%20account%20—%20Winnie%20Ride',
        label: 'Start a partner account',
      }}
    />

    {/* JOIN LIST — the waitlist form, framed as registering interest */}
    <section id="join-list" className="bg-surface border-t border-line">
      <div className="container-x py-16">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2.5">
            <PawIcon size={22} />
            <div className="eyebrow">Join the list</div>
          </div>
          <h2 className="h-section mt-3 text-center">Be first in line when Winnie Ride opens.</h2>
          <p className="mt-3 text-center text-sm ink-mute leading-relaxed">
            Tell us about your pet and the rides you will need, and we will contact you when
            Winnie Ride opens. Joining the list is not a booking: it does not charge you,
            reserve a ride, or promise a start date — it is how we learn how many pets are
            waiting, and how we reach you first. The rates above are what rides will cost
            when the service opens.
          </p>
          <div className="mt-10">
            <WinnieWaitlistForm />
          </div>
        </div>
      </div>
    </section>

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
