import type { Metadata } from 'next';

// MEGA_TASSY_PUBLISH_READY (2026-07-02) — footer linked /terms but no route existed (404).
// Baseline terms; TODO(phil): have counsel review before any paid-acquisition push.
export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of service for Tassy Transportation (Tassy Trucks LLC): booking, cancellations, rider responsibilities & standards for our Charlotte transport.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

const SECTIONS: Array<{ h: string; body: string[] }> = [
  {
    h: 'Who we are',
    body: [
      'Transportation services are provided by Tassy Trucks LLC, d/b/a Tassy Transportation — a Charlotte, North Carolina motor carrier operating under USDOT #3104152 and MC #79222, and a Service-Disabled Veteran-Owned Small Business (SDVOSB). Non-emergency transportation only: if you are experiencing a medical emergency, call 911.',
    ],
  },
  {
    h: 'Requests & pricing',
    body: [
      'Prices are shown before you confirm a booking — no surge pricing and no hidden fees. Fares are set by distance band and confirmed by a dispatcher before the trip is booked; tolls and wait beyond what is included are quoted to you in advance, never charged afterwards. Recurring plans (Standing Ride, Winnie Monthly, facility accounts) are billed monthly and can be changed or cancelled with 30 days’ notice; changes take effect at the next billing cycle.',
    ],
  },
  {
    h: 'Cancellations & no-shows',
    body: [
      'You may cancel or reschedule a trip by phone or through your booking link. Trips cancelled with reasonable notice are not charged; late cancellations or no-shows may incur a fee, which is disclosed at booking. On school routes, drivers follow the posted no-show protocol: wait, call the parent, and never leave a child unattended at a curb.',
    ],
  },
  {
    h: 'Rider responsibilities',
    body: [
      'Riders (or their booking party) are responsible for accurate pickup information, securing personal belongings, using provided restraints and securement equipment, and treating drivers with respect. Pets ride in provided carriers or harnesses. We may decline or end a trip that presents a safety risk.',
    ],
  },
  {
    h: 'Liability',
    body: [
      'We carry commercial auto and general liability insurance as required for our operating authority. To the extent permitted by law, our liability for any claim arising from a trip is limited to the amount paid for that trip, except where the law provides otherwise.',
    ],
  },
  {
    h: 'Contact',
    body: [
      'Questions about these terms: book@tassytrucks.com · (704) 941-8508 · Tassy Trucks LLC, Charlotte, NC.',
    ],
  },
];

export default function TermsPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Legal</div>
        <h1 className="h-section mt-3">Terms of Service</h1>
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
