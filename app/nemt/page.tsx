import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { request } from '@/lib/request-links';

export const metadata: Metadata = {
  title: 'Tassy Care — Charlotte medical transport | Flat rates from $49',
  description:
    'Private medical transport in Charlotte NC. Dialysis, infusion, physical therapy, specialists. Flat rates by distance from $49 — you know the price before you book. (704) 941-8508.',
  alternates: { canonical: '/nemt' },
  openGraph: { url: '/nemt', images: ['/og-image/nemt'] },
};

export default function NemtPage() {
  return (
    <ServicePage
      eyebrow="Tassy Care · Medical appointments"
      title="Know the price before you book."
      tagline="Dialysis, infusion, physical therapy, the specialist across town."
      description="Planned private transport to and from medical appointments. Booked in advance, priced by distance — $49 for anything inside 3 miles, and a flat number for every band after that. Your driver comes to the door, helps you to the car, and helps you inside at the other end. For passengers who walk, or walk with a cane or a walker."
      bookHref={request.nemt}
      bookLabel="Request a ride"
      altCta={{ href: 'tel:+17049418508', label: 'Call (704) 941-8508' }}
      serviceName="Non-Emergency Medical Transportation"
      path="/nemt"
      highlightsHeading="Private medical transport across Charlotte and Mecklenburg County"
      highlights={[
        {
          title: 'A flat price, not a meter',
          body: 'Anywhere inside 3 miles is $49. Inside 12 miles is $74. The number is agreed before we move and it does not change because the route was slower than we thought.',
        },
        {
          title: 'Door to door, not curb to curb',
          body: 'We come to the door, carry what needs carrying, and see you inside and seated at the other end. Nobody is left on a pavement looking for a car.',
        },
        {
          title: 'Booked ahead, for a time you chose',
          body: 'Send the request whenever suits you. A dispatcher confirms your driver and your exact price within two hours, and the same company answers when you call back.',
        },
        {
          title: 'Riding every week? Stop booking every week.',
          body: 'The Standing Ride Plan holds the same driver at the same time — dialysis Tuesday, Thursday and Saturday, therapy every Monday — at 15% off, billed monthly. You never book again.',
        },
        {
          title: 'Travelling in a wheelchair',
          body: 'Tassy Care WAV uses a ramp-equipped vehicle and an operator trained in securement, booked through our partner network. We quote your route on the call rather than print a rate we cannot hold to.',
        },
        {
          title: 'Veteran-owned, and certified',
          body: 'SDVOSB, MBE, DBE and SBE certified. USDOT #3104152. Licensed and insured for exactly this work.',
        },
      ]}
      tiers={[
        {
          name: 'Up to 7 miles',
          price: '$49–59',
          cadence: 'one way',
          features: ['Door-to-door help', 'Price agreed before we move', 'Text when we set off and arrive', 'Round trip is two rides'],
          cta: { label: 'Request this', href: request.nemt },
        },
        {
          name: '8 to 17 miles',
          price: '$74–89',
          cadence: 'one way',
          features: ['Everything above', 'Across Mecklenburg County', 'Extra passenger $10', '15 minutes of wait included'],
          cta: { label: 'Request this', href: request.nemt },
          highlight: true,
        },
        {
          name: '18 to 30 miles',
          price: '$109–129',
          cadence: 'one way',
          features: ['Everything above', 'Longer runs and out-of-county clinics', 'Over 30 miles, call us', 'Wheelchair quoted on the call'],
          cta: { label: 'Request this', href: request.nemt },
        },
      ]}
      partnerCta={{
        title: 'Clinics, dialysis centers and case managers',
        body: 'Book on account and get one invoice a month instead of chasing receipts. Preferred rates from 10 trips a month, contract rates from 25.',
        href: 'mailto:phil@tassytrucks.com?subject=Facility%20account%20—%20Tassy%20Care',
        label: 'Ask for the facility packet',
      }}
    />
  );
}
