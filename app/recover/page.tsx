import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { request } from '@/lib/request-links';

export const metadata: Metadata = {
  title: 'Tassy Recovery — ride home after surgery or sedation | Charlotte',
  description:
    'Charlotte rides home after outpatient surgery, sedation, dental work or a hospital discharge. We meet you at the discharge desk, wait, and take you home. From $129, both directions.',
  alternates: { canonical: '/recover' },
  openGraph: { url: '/recover', images: ['/og-image/recover'] },
};

/**
 * ⚠️ CLAIMS ON THIS PAGE.
 *
 * It used to say Tassy Recovery "is the named adult", and the facility block
 * promised a patient "does not leave until someone responsible is standing
 * there". Whether a surgery center will discharge to a paid escort at all
 * varies by facility, and not one Charlotte center has been asked.
 *
 * Until that is checked, this page describes what the driver DOES — comes
 * inside, waits, drives them home — and never claims a role the facility may
 * not grant. See lib/quote.ts, ESCORT_CENTS, for the same warning.
 */
export default function RecoverPage() {
  return (
    <ServicePage
      eyebrow="Tassy Recovery · After a procedure"
      title="They won't discharge you without someone to take you home."
      tagline="We come inside and wait."
      description="Most surgery centers will not release a sedated patient to a taxi, a rideshare, or their own two feet. Your Tassy driver comes to the discharge desk, waits while the paperwork catches up, and takes you home — with one pharmacy stop on the way. One price, agreed before we move, covering the trip there, the wait, and the trip home. From $129."
      bookHref={request.recover}
      bookLabel="Book your ride home"
      altCta={{ href: 'tel:+17049418508', label: 'Call (704) 941-8508' }}
      serviceName="Post-Procedure Transportation"
      path="/recover"
      highlightsHeading="Rides home after surgery and sedation in Charlotte"
      highlights={[
        {
          title: 'We meet you at the desk, not the curb',
          body: 'A discharge nurse cannot hand a sedated patient to a parking lot. Your driver comes inside to the discharge desk, or whichever entrance your facility names, rather than waiting outside for you to find the car.',
        },
        {
          title: 'Tassy Escort — add $45',
          body: 'Nobody available to collect them? Your driver arrives fifteen minutes early, meets them at the discharge desk and walks them out to the car with their bag and their paperwork. Ask your facility first whether they will discharge to a paid escort — some will, some require a family member, and it is better to know before the day.',
        },
        {
          title: 'Twenty minutes of wait, built into the price',
          body: 'Discharge always runs late. The wait is part of what you booked, not a meter that starts the moment we arrive. If it runs longer we tell you the cost before it is charged — never after.',
        },
        {
          title: 'One pharmacy stop on the way home',
          body: 'You leave with a prescription and no way to fill it. We stop once on the route home and wait while you do. It is included, and nobody else offers it.',
        },
        {
          title: 'A vehicle you can actually get into',
          body: 'A full-size SUV — Suburban, Expedition, Yukon or Navigator class. High seats you step up into rather than drop down into, room for a wheelchair or a walker, and space for a family member to ride home with you.',
        },
        {
          title: 'An operator trained for this trip',
          body: 'Trained in transfer and post-procedure passenger assistance. Where your procedure calls for it, we assign an operator with a CNA, LPN or RN background. This is transportation and passenger assistance — not medical care.',
        },
        {
          title: 'Your family knows where you are',
          body: 'We text whoever you nominate when we have you, and again when you are home and inside. You carry nothing — bags, paperwork and equipment are ours from the door.',
        },
      ]}
      tiers={[
        {
          name: 'Up to 3 miles',
          price: '$129',
          cadence: 'there, the wait, and home',
          features: ['Pickup at the discharge desk', '20 minutes of wait included', 'One pharmacy stop', 'Same driver both ways'],
          cta: { label: 'Book this', href: request.recover },
        },
        {
          name: '4 to 12 miles',
          price: '$149–169',
          cadence: 'there, the wait, and home',
          features: ['Everything above', 'Full-size SUV', 'Wheelchair to the car and to your door', 'Family text on pickup and arrival'],
          cta: { label: 'Book this', href: request.recover },
          highlight: true,
        },
        {
          name: '13 to 30 miles',
          price: '$195–259',
          cadence: 'there, the wait, and home',
          features: ['Everything above', 'Longer routes across Mecklenburg', 'Extra wait $35 per half hour, quoted first', 'Over 30 miles, call us'],
          cta: { label: 'Book this', href: request.recover },
        },
      ]}
      partnerCta={{
        title: 'Surgery centers, dental practices and med spas',
        body: 'Add a private transportation option to your discharge workflow. We book on account, invoice monthly, and your patient is collected from the desk by a named driver at a time you set. Preferred rates from 10 trips a month.',
        href: 'mailto:phil@tassytrucks.com?subject=Facility%20account%20—%20Tassy%20Recovery',
        label: 'Ask for the facility packet',
      }}
    />
  );
}
