import type { Metadata } from 'next';

// MEGA_TASSY_PUBLISH_READY (2026-07-02) — footer linked /privacy but no route existed (404).
// Baseline policy; TODO(phil): have counsel review before any paid-acquisition push.
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Tassy Transportation (Tassy Trucks LLC) collects, uses, and protects your information — bookings, health-related trip details, and communications. Charlotte, NC.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

const SECTIONS: Array<{ h: string; body: string[] }> = [
  {
    h: 'What we collect',
    body: [
      'When you book a ride or contact us, we collect the information needed to run the trip: your name, phone number, email, pickup and drop-off addresses, and any trip notes you provide (for example mobility needs, a pet profile, or a student rider profile).',
      'For medical and recovery transport, trip details may include health-related information you choose to share (such as appointment type or mobility equipment). We treat this information as confidential, use it only to operate your transportation, and train our team on HIPAA-aware handling.',
    ],
  },
  {
    h: 'How we use it',
    body: [
      'We use your information to dispatch and complete trips, send confirmations and driver ETAs by text or email, invoice facilities and payers, and meet our regulatory obligations as a licensed motor carrier (USDOT #3104152 · MC #79222).',
      'We do not sell your personal information. We share it only with the people needed to complete your trip (your driver and dispatcher), with a facility or broker that arranged your ride, or when the law requires it.',
    ],
  },
  {
    h: 'Safety recordings',
    body: [
      'Vehicles may be equipped with in-vehicle recording for rider and driver safety — including on student transportation, where recordings are retained for your protection and reviewed only when a safety concern is raised.',
    ],
  },
  {
    h: 'Your choices',
    body: [
      'You can ask us to correct or delete the personal information we hold about you, or to stop non-essential communications, by emailing book@tassytrucks.com or calling (704) 941-8508. Trip records required for regulatory, insurance, or billing purposes are retained for the period the law requires.',
    ],
  },
  {
    h: 'Contact',
    body: [
      'Tassy Trucks LLC (d/b/a Tassy Transportation) · Charlotte, North Carolina · book@tassytrucks.com · (704) 941-8508.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Legal</div>
        <h1 className="h-section mt-3">Privacy Policy</h1>
        <p className="mt-3 text-sm ink-mute">Last updated: July 2, 2026</p>
        <div className="mt-8 space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h2 className="serif text-2xl font-semibold">{s.h}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 32)} className="mt-3 ink-soft leading-relaxed">{p}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
