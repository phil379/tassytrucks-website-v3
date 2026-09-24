import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { request } from '@/lib/request-links';

export const metadata: Metadata = {
  title: 'Tassy Concierge — reserved private car, Charlotte | From $69',
  description:
    'Airport runs, golf, dinner, events and client pickups in Charlotte. A reserved vehicle and a professional driver, booked for a time you chose. Flat rates from $69. No surge.',
  alternates: { canonical: '/vip' },
  openGraph: { url: '/vip', images: ['/og-image/vip'] },
};

export default function VipPage() {
  return (
    <ServicePage
      eyebrow="Tassy Concierge · Premium private transport"
      title="Booked for your time. Not whoever accepts the ping."
      tagline="Airport, golf, dinner, events, and the client you are collecting."
      description="A reserved vehicle and a professional driver, confirmed in advance for a time you chose. Flat rates by distance — you know the number before you book, and it does not move because it started raining. From $69. Nothing medical about this service; if you need the driver to wait for you after a procedure, that is Tassy Recovery."
      bookHref={request.vip}
      bookLabel="Reserve a car"
      altCta={{ href: 'tel:+17049418508', label: 'Call (704) 941-8508' }}
      serviceName="Private Car Service"
      path="/vip"
      highlightsHeading="Reserved private car service in Charlotte"
      highlights={[
        {
          title: 'No surge, ever',
          body: 'A 5am airport run costs what the card says it costs. Flat rates by distance, agreed before the trip, and they do not move for weather, demand or a holiday weekend.',
        },
        {
          title: 'Reserved, not dispatched',
          body: 'Your car is committed to your time in advance. You are not refreshing an app at 4:40am hoping someone accepts, and you are not explaining the address to a driver who has never done this route.',
        },
        {
          title: 'A driver who does this for a living',
          body: 'Professional drivers, licensed and insured, who know the terminal doors, the club entrance and where to wait when the restaurant has no drop-off. Trained, background-checked, and the same standard every trip.',
        },
        {
          title: 'The vehicle is a full-size SUV',
          body: 'Room for luggage, golf clubs or four people who do not want to sit shoulder to shoulder. Suburban, Expedition, Yukon or Navigator class.',
        },
      ]}
      tiers={[
        {
          name: 'Up to 7 miles',
          price: '$69–89',
          cadence: 'one way',
          features: ['Reserved for your time', 'Flat rate, no surge', 'Professional driver', 'Full-size SUV'],
          cta: { label: 'Reserve this', href: request.vip },
        },
        {
          name: '8 to 17 miles',
          price: '$109–129',
          cadence: 'one way',
          features: ['Everything above', 'Airport, uptown, Ballantyne, Lake Norman', 'Luggage and clubs included', 'Round trip is two reserved legs'],
          cta: { label: 'Reserve this', href: request.vip },
          highlight: true,
        },
        {
          name: '18 to 30 miles',
          price: '$155–185',
          cadence: 'one way',
          features: ['Everything above', 'Longer runs across the metro', 'Extra passenger $15', 'Over 30 miles, call us'],
          cta: { label: 'Reserve this', href: request.vip },
        },
      ]}
      partnerCta={{
        title: 'Hotels, clubs and corporate partners',
        body: 'Put a reliable car behind your guests and clients. We book on account and invoice monthly, with preferred rates from 10 trips a month.',
        href: 'mailto:phil@tassytrucks.com?subject=Corporate%20account%20—%20Tassy%20Concierge',
        label: 'Open an account',
      }}
    />
  );
}
