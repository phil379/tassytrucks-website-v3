import type { Metadata } from 'next';

// MEGA_TASSY_PUBLISH_READY (2026-07-02) — footer linked /privacy but no route existed (404).
// Baseline policy; TODO(phil): have counsel review before any paid-acquisition push.
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Tassy Transportation collects, uses & protects your information — bookings, health-related trip details & communications. Charlotte, NC.',
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
    h: 'Text messages (SMS)',
    body: [
      'If you check the "Text me" box on an application or booking form, or otherwise give us your mobile number and opt in, we send you text messages about what you asked about — your job application and onboarding, or your booking, trip status, and driver ETAs. Giving consent to texts is never a condition of applying for a role or booking a ride.',
      'Message frequency varies. Message and data rates may apply. Reply STOP at any time to stop texts, or HELP for help. We honor opt-out requests and keep a record of consent and opt-out.',
      'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties. We do not sell your personal information.',
      'You can opt out of texts at any time by replying STOP, and you can still apply for a role or book a ride without agreeing to receive texts. Mobile carriers are not liable for delayed or undelivered messages. Questions about our text program? Email book@tassytrucks.com.',
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
        <p className="mt-3 text-sm ink-mute">Last updated: October 8, 2026</p>
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
