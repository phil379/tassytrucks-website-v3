import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { subscribe, book } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Pricing — Tassy subscriptions & per-service tiers',
  description:
    'VIP, Winnie Ride, Tassy Wellness, and Tassy Guardian subscription tiers + per-service pricing. Charlotte premium transport from $39/mo.',
};

type Tier = {
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

const sections: { eyebrow: string; title: string; body: string; tiers: Tier[] }[] = [
  {
    eyebrow: 'VIP Concierge subscriptions',
    title: 'For aesthetic & plastic-surgery patients',
    body: 'Built for repeat patients of Charlotte\'s premium clinics. Monthly credit + bonus amenities + priority booking.',
    tiers: [
      {
        name: 'Companion Pass', price: '$95', cadence: 'mo',
        blurb: 'For routine procedures & follow-ups.',
        features: ['1 Companion Recovery ride/mo', 'Quarterly Tassy gift box', '10% off à la carte', 'Priority booking'],
        cta: { label: 'Subscribe', href: subscribe.vipCompanion },
      },
      {
        name: 'Concierge Pass', price: '$295', cadence: 'mo',
        blurb: 'Most popular — surgeon-recommended.',
        features: ['2 Premium Recovery rides/mo', 'Cashmere blanket every ride', 'Annual Tassy spa day', '15% off à la carte'],
        cta: { label: 'Subscribe', href: subscribe.vipConcierge },
        highlight: true,
      },
      {
        name: 'Recovery Pass', price: '$795', cadence: 'mo',
        blurb: 'For multi-procedure recovery programs.',
        features: ['Unlimited Premium rides', 'Maximum tier 4x/mo', 'Custom-monogrammed robe', 'Dedicated coordinator'],
        cta: { label: 'Subscribe', href: subscribe.vipRecovery },
      },
    ],
  },
  {
    eyebrow: 'Winnie Ride — B2C subscriptions',
    title: 'For pet parents',
    body: 'Vet visits, grooming, daycare, airport. Carrier, harness, calming spray included on every ride.',
    tiers: [
      {
        name: 'Winnie Starter', price: '$39', cadence: 'mo',
        blurb: 'Casual pet-parent plan.',
        features: ['1 ride/mo', 'Carrier + harness', 'Standard amenities', 'SMS booking'],
        cta: { label: 'Subscribe Starter', href: subscribe.winnieStarter },
      },
      {
        name: 'Winnie Standard', price: '$89', cadence: 'mo',
        blurb: 'For multi-pet households.',
        features: ['3 rides/mo', 'Multi-pet friendly', 'Quarterly framed photo', 'Priority scheduling'],
        cta: { label: 'Subscribe Standard', href: subscribe.winnieStandard },
        highlight: true,
      },
      {
        name: 'Winnie Premium', price: '$179', cadence: 'mo',
        blurb: 'For frequent vet + travel users.',
        features: ['6 rides/mo', 'Branded pet bed on signup', 'Monthly treat box', 'Airport-ready'],
        cta: { label: 'Subscribe Premium', href: subscribe.winniePremium },
      },
    ],
  },
  {
    eyebrow: 'Winnie Ride — B2B subscriptions',
    title: 'For vet clinics, groomers, daycares',
    body: 'White-label pet transport, multi-pet recurring rides, dedicated facility portal, net-30 invoicing.',
    tiers: [
      {
        name: 'B2B Starter', price: '$150', cadence: 'mo',
        blurb: 'Solo practices.',
        features: ['10 rides/mo pool', 'Facility portal access', 'Net-30 invoicing', 'Single contact'],
        cta: { label: 'Subscribe', href: subscribe.winnieB2BStarter },
      },
      {
        name: 'B2B Standard', price: '$395', cadence: 'mo',
        blurb: 'Multi-vet clinic / busy groomer.',
        features: ['35 rides/mo pool', 'Multi-user portal', 'Custom amenity kit', 'Recurring schedules'],
        cta: { label: 'Subscribe', href: subscribe.winnieB2BStandard },
        highlight: true,
      },
      {
        name: 'B2B Premium', price: '$995', cadence: 'mo',
        blurb: 'High-volume / multi-location.',
        features: ['100 rides/mo pool', 'Dedicated account mgr', 'Branded co-marketing', 'API webhooks'],
        cta: { label: 'Subscribe', href: subscribe.winnieB2BPremium },
      },
    ],
  },
  {
    eyebrow: 'Tassy Wellness — Wellness',
    title: 'For IV therapy + med-spa regulars',
    body: 'Hydration kit + premium fleet every ride.',
    tiers: [
      {
        name: 'Wellness Essential', price: '$149', cadence: 'mo',
        blurb: 'Casual wellness routine.',
        features: ['2 rides included', 'Hydration kit', 'Premium sedan', 'Same-day booking'],
        cta: { label: 'Subscribe', href: subscribe.renewEssential },
      },
      {
        name: 'Wellness Signature', price: '$295', cadence: 'mo',
        blurb: 'Weekly med-spa habit.',
        features: ['4 rides included', 'Premium SUV option', 'Aromatherapy add-on', 'Priority booking'],
        cta: { label: 'Subscribe', href: subscribe.renewSignature },
        highlight: true,
      },
      {
        name: 'Wellness Elite', price: '$495', cadence: 'mo',
        blurb: 'High-frequency / longevity-focused.',
        features: ['Unlimited rides', 'Luxury fleet', 'Spa-day add-on', 'Dedicated coordinator'],
        cta: { label: 'Subscribe', href: subscribe.renewElite },
      },
    ],
  },
  {
    eyebrow: 'Tassy Guardian — Oncology',
    title: 'For chemo, radiation, recovery programs',
    body: 'CNA-trained drivers. Quiet cabin. Family-grade care.',
    tiers: [
      {
        name: 'Guardian Essential', price: '$185', cadence: 'ride',
        blurb: 'Single recovery ride.',
        features: ['CNA driver', 'Recovery kit', 'Door-through-door', 'Family notification'],
        cta: { label: 'Book ride', href: book.recover },
      },
      {
        name: 'Guardian Signature', price: '$595', cadence: 'mo',
        blurb: 'Active treatment program.',
        features: ['4 rides/mo', 'CNA driver option', 'Premium amenities', 'Coordinator support'],
        cta: { label: 'Subscribe', href: subscribe.recoverSignature },
        highlight: true,
      },
      {
        name: 'Guardian Elite', price: '$1,295', cadence: 'mo',
        blurb: 'Intensive treatment / family caregiver.',
        features: ['Unlimited rides', 'Dedicated CNA driver', 'Caregiver companion', 'Full coordination'],
        cta: { label: 'Subscribe', href: subscribe.recoverElite },
      },
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-charcoal/8">
        <div className="container-x py-20">
          <div className="eyebrow">Pricing</div>
          <h1 className="h-display mt-4">
            Subscribe and save — or pay per ride.
          </h1>
          <p className="mt-5 text-lg text-ink-muted max-w-2xl">
            Five service lines. Subscriptions for the verticals you ride often. Per-service flat tiers for VIP.
            Switch or cancel anytime. All Tassy-branded amenities included.
          </p>
        </div>
      </section>

      {sections.map((sec, idx) => (
        <section
          key={sec.eyebrow}
          className={idx % 2 === 0 ? 'bg-cream' : 'bg-charcoal text-cream-text'}
        >
          <div className="container-x py-20">
            <div className="max-w-2xl">
              <div className={`eyebrow ${idx % 2 === 0 ? '' : 'text-cream-text/50'}`}>{sec.eyebrow}</div>
              <h2 className="h-section mt-3">{sec.title}</h2>
              <p className={`mt-3 ${idx % 2 === 0 ? 'text-ink-muted' : 'text-cream-text/70'}`}>{sec.body}</p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
              {sec.tiers.map((t) => {
                const dark = idx % 2 === 1;
                return (
                  <div
                    key={t.name}
                    className={`rounded-2xl p-7 border ${
                      t.highlight
                        ? 'bg-gold text-charcoal border-gold'
                        : dark
                          ? 'bg-cream/5 border-cream/10 text-cream-text'
                          // FIX_PROD_034 — on the dark "cream"-token canvas the old
                          // bg-white siblings inherited the light default text → near-invisible.
                          // Option A: cream surface + explicit dark text + gold border.
                          : 'bg-[#F4EFE0] text-[#1B1A17] border-gold/40'
                    }`}
                  >
                    {t.highlight && (
                      <div className="eyebrow text-charcoal/70">Most popular</div>
                    )}
                    <h3 className="font-serif text-2xl">{t.name}</h3>
                    <p className={`mt-1 text-sm ${
                      t.highlight ? 'text-charcoal/70' : dark ? 'text-cream-text/60' : 'text-[#444239]'
                    }`}>
                      {t.blurb}
                    </p>
                    <div className="mt-4">
                      <span className={`font-serif text-4xl ${t.highlight ? '' : 'text-gold'}`}>{t.price}</span>
                      {t.cadence && <span className="ml-1 text-sm opacity-70">/{t.cadence}</span>}
                    </div>
                    <ul className="mt-6 space-y-2 text-sm">
                      {t.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <Check
                            size={16}
                            className={`mt-0.5 shrink-0 ${
                              t.highlight ? 'text-charcoal' : 'text-gold'
                            }`}
                          />
                          <span className={
                            t.highlight ? 'text-charcoal/90'
                              : dark ? 'text-cream-text/80' : 'text-[#444239]'
                          }>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={t.cta.href}
                      className={`mt-6 inline-flex items-center justify-center w-full rounded-md py-2.5 font-semibold transition-colors ${
                        t.highlight
                          ? 'bg-charcoal text-cream-text hover:bg-charcoal/85'
                          : dark
                            ? 'border border-cream/30 text-cream-text hover:bg-cream hover:text-charcoal'
                            : 'bg-charcoal text-cream-text hover:bg-gold-600 hover:text-charcoal'
                      }`}
                    >
                      {t.cta.label}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {/* Per-service tier note */}
      <section className="bg-cream">
        <div className="container-x py-20 text-center">
          <div className="eyebrow">Don&apos;t want to subscribe?</div>
          <h2 className="h-section mt-3">Pay per ride — no commitment.</h2>
          <p className="mt-4 text-ink-muted max-w-2xl mx-auto">
            All five service lines work à la carte. VIP Concierge has four flat tiers from $185–$695. Tassy Care
            is Medicaid-covered for eligible patients or flat-rate private. Winnie/Wellness/Guardian priced per ride.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link href="/vip" className="btn-gold">VIP tiers <ArrowRight size={16} /></Link>
            <Link href="/nemt" className="btn-ghost">Tassy Care details</Link>
            <Link href="/winnie" className="btn-ghost">Winnie pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
