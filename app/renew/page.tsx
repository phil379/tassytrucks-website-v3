import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { request } from '@/lib/request-links';

export const metadata: Metadata = {
  title: 'IV therapy & med-spa rides in Charlotte | Tassy Transportation',
  description:
    'Rides to and from IV therapy, med-spa and aesthetic appointments in Charlotte. Flat rates from $69 one way — or from $129 both ways with the driver waiting, if the procedure leaves you unable to drive.',
  alternates: { canonical: '/renew' },
  openGraph: { url: '/renew', images: ['/og-image/renew'] },
};

export default function RenewPage() {
  return (
    <ServicePage
      eyebrow="Wellness &amp; med-spa appointments"
      title="Two ways to get to a wellness appointment."
      tagline="Which one you need depends on how you will feel afterwards."
      description="Wellness and med-spa runs used to be their own service line. They are now handled by the two lines that actually fit: Tassy Concierge when you are simply going there and back under your own steam, and Tassy Recovery when the procedure means you should not be driving and someone needs to wait for you. Same company, clearer pricing, and you are never sold the expensive one when the cheaper one is right."
      bookHref={request.renew}
      bookLabel="Book a ride"
      altCta={{ href: 'tel:+17049418508', label: 'Call (704) 941-8508' }}
      serviceName="Wellness and Med-Spa Transportation"
      path="/renew"
      highlightsHeading="Getting to IV therapy, med-spa and aesthetic appointments in Charlotte"
      highlights={[
        {
          title: 'Going there and coming back on your own',
          body: 'An IV drip, a facial, a routine appointment you walk out of feeling fine. That is Tassy Concierge — a reserved car and a professional driver, flat rate from $69 one way. Book the return separately for whenever you expect to be finished.',
        },
        {
          title: 'If you should not be driving afterwards',
          body: 'Sedation, anything that leaves you groggy, or a clinic that asks you to arrange a ride home. That is Tassy Recovery — from $129 for the trip there, the wait, and the trip home, with one pharmacy stop on the way.',
        },
        {
          title: 'Ask us which one you need',
          body: 'Call and describe the appointment. If Concierge covers it we will tell you, because selling you the round trip when you do not need one is how a company loses the next booking.',
        },
        {
          title: 'Going regularly?',
          body: 'A standing course of treatment can go on the Standing Ride Plan — the same driver at the same time each week, 15% off, billed monthly, minimum eight legs.',
        },
      ]}
      tiers={[
        {
          name: 'Tassy Concierge',
          price: 'From $69',
          cadence: 'one way',
          features: ['Reserved for your time', 'Flat rate, no surge', 'Full-size SUV', 'Book the return separately'],
          cta: { label: 'Reserve a car', href: request.vip },
        },
        {
          name: 'Tassy Recovery',
          price: 'From $129',
          cadence: 'there, the wait, and home',
          features: ['Driver waits 20 minutes', 'One pharmacy stop included', 'Help to the car and to your door', 'Family text on the way home'],
          cta: { label: 'Book the round trip', href: request.recover },
          highlight: true,
        },
      ]}
    />
  );
}
