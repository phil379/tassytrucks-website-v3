import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS_LOCATION, businessContactLine } from '@/lib/business';

// MEGA_TASSY_PUBLISH_READY (2026-07-02) — footer linked /terms but no route existed (404).
// Baseline terms; TODO(phil): have counsel review before any paid-acquisition push.
export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of service for Tassy Transportation (Tassy Trucks LLC): booking, cancellations, rider responsibilities & standards for our Charlotte transport.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

const LINK = 'underline underline-offset-2';

const SECTIONS: Array<{ h: string; body: ReactNode[] }> = [
  {
    h: 'Who we are',
    body: [
      'Transportation services are provided by Tassy Trucks LLC, d/b/a Tassy Transportation — a transportation company based in ' + BUSINESS_LOCATION + ', and a Service-Disabled Veteran-Owned Small Business (SDVOSB). Non-emergency transportation only: if you are experiencing a medical emergency, call 911.',
    ],
  },
  {
    h: 'Requests & pricing',
    body: [
      'Prices are shown before you confirm a booking — no surge pricing and no hidden fees. Fares are set by distance band and confirmed by a dispatcher before the trip is booked; tolls and wait beyond what is included are quoted to you in advance, never charged afterwards. Recurring plans (Standing Ride, Winnie Monthly, facility accounts) are billed monthly and can be changed or cancelled with 30 days’ notice; changes take effect at the next billing cycle.',
    ],
  },
  {
    h: 'Payments and payment links',
    body: [
      'Asking for a ride does not charge you. After a dispatcher confirms the price and your driver, we send one payment link for the confirmed amount. Payment is by card on a page run by our payment provider, Stripe; we do not see or keep your full card number. The link is meant for the person paying and may be forwarded to them, but please do not post it publicly.',
      'If anything about the trip changes after you are quoted, we tell you the new price before you pay. Waiting time beyond what is included, and tolls, are quoted to you before they are charged.',
    ],
  },
  {
    h: 'Cancellations & no-shows',
    body: [
      'You may cancel or reschedule a trip by phone or email. Trips cancelled with reasonable notice are not charged; late cancellations or no-shows may incur a fee, which is disclosed at booking. On school routes, drivers follow the posted no-show protocol: wait, call the parent, and never leave a child unattended at a curb.',
      <>
        The notice we ask for, what a late cancellation or no-show costs, and how refunds work are on our{' '}
        <Link href="/refunds" className={LINK}>Cancellations &amp; Refunds</Link> page, which forms part of these terms.
      </>,
    ],
  },
  {
    h: 'Rider responsibilities',
    body: [
      'Riders (or their booking party) are responsible for accurate pickup information, securing personal belongings, using provided restraints and securement equipment, and treating drivers with respect. Pets ride in provided carriers or harnesses. We may decline or end a trip that presents a safety risk.',
    ],
  },
  {
    h: 'Driver and vehicle assignments',
    body: [
      'When we confirm your trip we tell you your driver and vehicle once we have assigned them. Sometimes we have to change them, for example if a driver is sick or a vehicle needs repair. When we do, we will use a driver and vehicle that suit the trip you booked, and we will tell you if the change affects the time, the price, or what the trip needs (for example a ramp for a wheelchair). For Tassy Scholar we aim to keep the same driver whenever we can, but we cannot promise it.',
    ],
  },
  {
    h: 'Accessibility and wheelchair trips',
    body: [
      <>
        Tell us what you need when you book: a wheelchair or other mobility equipment, a service animal, extra time, or a caregiver riding with you. Wheelchair trips are run in ramp-equipped vehicles from our partner network. If your equipment cannot be carried safely in the vehicle we would send, we will tell you before the day of the trip. More about our service and this website is on our{' '}
        <Link href="/accessibility" className={LINK}>Accessibility</Link> page.
      </>,
    ],
  },
  {
    h: 'Riders under 18 and Tassy Scholar',
    body: [
      'A rider under 18 must be booked by a parent or legal guardian, who agrees to these terms for the child. Tassy Scholar is set up by a parent or guardian, who confirms the schedule and the policies for the child (including who may collect them). We release a child only to an authorized adult on the pickup list. What we collect about children, and why, is in our Privacy Policy.',
    ],
  },
  {
    h: 'Text messaging (SMS)',
    body: [
      'We run a text-messaging program for people who opt in — applicants who check the SMS consent box on a careers form, and riders or booking parties who ask to receive trip updates. By opting in you agree to receive SMS from Tassy Transportation about your application and onboarding, or your booking and trip status. Consent is not a condition of applying or of purchasing any service.',
      'Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time, or HELP for help. No mobile information will be shared with third parties or affiliates for marketing or promotional purposes, and text messaging opt-in data and consent will not be shared with any third parties. Mobile carriers are not liable for delayed or undelivered messages.',
    ],
  },
  {
    h: 'Liability',
    body: [
      'We carry commercial auto and general liability insurance as required for our operations. To the extent permitted by law, our liability for any claim arising from a trip is limited to the amount paid for that trip, except where the law provides otherwise.',
    ],
  },
  {
    h: 'Governing law',
    body: [
      'These terms are governed by the laws of the State of North Carolina, without regard to its conflict-of-laws rules. Any dispute that we cannot resolve by talking first will be brought in the state or federal courts located in Mecklenburg County, North Carolina.',
    ],
  },
  {
    h: 'Changes to these terms',
    body: [
      'We may update these terms. The date at the top shows when they last changed. A change does not affect a trip you have already booked.',
    ],
  },
  {
    h: 'Related policies',
    body: [
      <>
        <Link href="/privacy" className={LINK}>Privacy Policy</Link> ·{' '}
        <Link href="/refunds" className={LINK}>Cancellations &amp; Refunds</Link> ·{' '}
        <Link href="/accessibility" className={LINK}>Accessibility</Link>
      </>,
    ],
  },
  {
    h: 'Contact',
    body: [
      `Questions about these terms: ${businessContactLine()}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Legal</div>
        <h1 className="h-section mt-3">Terms of Service</h1>
        <p className="mt-3 text-sm ink-mute">Last updated: October 24, 2026</p>
        <div className="mt-8 space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h2 className="serif text-2xl font-semibold">{s.h}</h2>
              {s.body.map((p, i) => (
                <p key={`${s.h}-${i}`} className="mt-3 ink-soft leading-relaxed">{p}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
