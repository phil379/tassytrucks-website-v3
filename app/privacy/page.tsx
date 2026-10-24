import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS, businessContactLine } from '@/lib/business';
import { PRIVACY_POLICY_UPDATED, PRIVACY_RESPONSE_DAYS, PROVIDERS, RETENTION } from '@/lib/privacy-policy';

// MEGA_TASSY_PUBLISH_READY (2026-07-02) — footer linked /privacy but no route existed (404).
// Baseline policy; TODO(phil): have counsel review before any paid-acquisition push.
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Tassy Transportation collects, uses & protects your information — bookings, health-related trip details & communications. Charlotte, NC.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

const LINK = 'underline underline-offset-2';
const CELL = 'border border-line px-3 py-2 align-top text-sm';

const SECTIONS: Array<{ h: string; body: ReactNode[] }> = [
  {
    h: 'What we collect',
    body: [
      'When you book a ride or contact us, we collect the information needed to run the trip: your name, phone number, email, pickup and drop-off addresses, and any trip notes you provide (for example mobility needs, a pet profile, or a student rider profile).',
      'For medical and recovery transport, trip details may include health-related information you choose to share (such as appointment type or mobility equipment). We treat this information as confidential, use it only to operate your transportation, and train our team on HIPAA-aware handling. Our forms ask you not to type diagnoses or procedure names, and we do not need them to take you where you are going.',
      'We also record some things automatically. When you send a ride request we store the page you came from (including any campaign tags in the link) and your browser type. If a form asks you to sign a consent, we store the time of your consent and may store your IP address and browser type with it. Our website host keeps ordinary server logs. We also store the map coordinates of your pickup and drop-off so we can price the trip.',
    ],
  },
  {
    h: 'How we use it',
    body: [
      'We use your information to dispatch and complete trips, send confirmations and driver ETAs by text or email, invoice facilities and payers, and meet our regulatory obligations as a transportation provider.',
      'We do not sell your personal information. We share it only with the people needed to complete your trip (your driver and dispatcher), with a facility or broker that arranged your ride, or when the law requires it.',
    ],
  },
  {
    h: 'Who else handles your information',
    body: [
      'We use these outside services to run the website and your trips. Each only receives what it needs for the job described. We do not sell your personal information and we do not share it for advertising.',
      <div key="providers" className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${CELL} text-left`} scope="col">Service</th>
              <th className={`${CELL} text-left`} scope="col">What it does for us</th>
              <th className={`${CELL} text-left`} scope="col">What it can receive</th>
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map((p) => (
              <tr key={p.name}>
                <th className={`${CELL} text-left font-medium`} scope="row">{p.name}</th>
                <td className={CELL}>{p.does}</td>
                <td className={CELL}>{p.receives}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
      'Facilities that book rides for their patients or residents see the trips booked for them. We may also share information when the law requires it or to protect someone’s safety.',
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
    h: 'Cookies, browser storage and analytics',
    body: [
      <>
        We do not use advertising cookies or advertising trackers. Our website counts visits with analytics only if you press Accept on our cookie banner, and it keeps your answer in your browser. A few things are stored because the site needs them (for example, your progress while you sign a child up for Tassy Scholar). The full list, and how to change your choice, is on our{' '}
        <Link href="/cookies" className={LINK}>Cookies page</Link>.
      </>,
    ],
  },
  {
    h: 'Children’s information',
    body: [
      'Our website is for adults. We do not collect information directly from children, and we do not ask a child to create an account or fill in a form. For Tassy Scholar and other rides for a child, a parent or legal guardian gives us the information.',
      'For Tassy Scholar we collect the child’s name, school, grade (optional), pickup address and schedule, the parent’s contact details, an emergency contact, and an optional safety note. We do not ask for medical, disability or school-record information, and we ask you not to type it into the notes. We use this information only to arrange and carry out the child’s rides and to contact the parent. A parent can ask to see, correct or delete their child’s information at any time (see Your choices below).',
      'If you think a child has given us information without a parent’s knowledge, contact us and we will delete it.',
    ],
  },
  {
    h: 'How we protect your information',
    body: [
      'We use encrypted connections (HTTPS) on our website, we do not keep full card numbers (Stripe handles them), and our team sees ride requests in a password-protected system. No website or storage system is perfectly secure, so we cannot guarantee absolute security. If we learn of a problem that affects your information, we will tell you as the law requires.',
    ],
  },
  {
    h: 'How long we keep it',
    body: [
      'We keep records only as long as we need them for the reasons above and to meet tax, insurance and legal duties. After that we aim to delete them or remove what identifies you.',
      <div key="retention" className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${CELL} text-left`} scope="col">Records</th>
              <th className={`${CELL} text-left`} scope="col">How long we keep them</th>
            </tr>
          </thead>
          <tbody>
            {RETENTION.map((r) => (
              <tr key={r.records}>
                <th className={`${CELL} text-left font-medium`} scope="row">{r.records}</th>
                <td className={CELL}>{r.keptFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    ],
  },
  {
    h: 'Your choices',
    body: [
      'You can ask us to correct or delete the personal information we hold about you, or to stop non-essential communications, by emailing book@tassytrucks.com or calling (704) 941-8508. Trip records required for regulatory, insurance, or billing purposes are retained for the period the law requires.',
      <>
        You can also use our{' '}
        <Link href="/privacy/request" className={LINK}>data request form</Link>. Or contact {BUSINESS.bookingEmail} or {BUSINESS.phoneDisplay}.
      </>,
      `Whichever way you ask, we will check that you are the person the information is about before we act, which may mean asking you a question only you could answer. We aim to reply within ${PRIVACY_RESPONSE_DAYS} days. We do not delete anything we are required to keep, and we will tell you if that applies.`,
      'To stop non-essential messages: reply STOP to any text from us, and for email tell us at the address above. Messages we must send to run a trip you booked (for example, a confirmation or a receipt) are not optional marketing and will still be sent for that trip.',
    ],
  },
  {
    h: 'Changes to this policy',
    body: [
      'If we change this policy, we will change the date at the top. If a change is significant, we will say so on this page.',
    ],
  },
  {
    h: 'Contact',
    body: [
      `${businessContactLine()}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Legal</div>
        <h1 className="h-section mt-3">Privacy Policy</h1>
        <p className="mt-3 text-sm ink-mute">Last updated: {PRIVACY_POLICY_UPDATED}</p>
        <div className="mt-8 space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h2 className="serif text-2xl font-semibold">{s.h}</h2>
              {s.body.map((p, i) => (
                <div key={`${s.h}-${i}`} className="mt-3 ink-soft leading-relaxed">{p}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
