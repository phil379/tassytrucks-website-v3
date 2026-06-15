import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Phone, Check } from 'lucide-react';
import { book, contact } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Tassy School — Daily Student Transport, Committed & Trusted',
  description:
    'Parent-direct school transport across Charlotte: pick one of three plans (Full Year, Weekly Pattern, After-School) and ride with the same trusted driver every school day. District + EverDriven partnerships continue.',
  alternates: { canonical: '/school' },
  openGraph: { images: ['/og-image/school'] },
};

const serviceLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Tassy School — Student Transportation',
  serviceType: 'School Transportation',
  description:
    'Parent-direct daily school transport with a committed schedule and the same trusted driver. Also operates alternative student routes as an EverDriven Technologies subcontractor.',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Tassy Transportation',
    telephone: '+1-704-941-8508',
    email: 'booking@tassytrucks.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Charlotte', addressRegion: 'NC', addressCountry: 'US' },
  },
  areaServed: ['Charlotte NC', 'High Point NC', 'Spartanburg SC', 'Rock Hill SC', 'Cincinnati OH'],
};

// Mirrors the SaaS /book/school plans (FIX_PROD_008/010). Each "Get started" deep-links
// to the plan-specific 6-step setup wizard (slugs verified live).
const PLANS = [
  {
    name: 'Full School Year',
    badge: 'Best value',
    cadence: 'Daily AM + PM · Mon–Fri · Aug–May',
    features: ['AM + PM every school day', 'Same trusted driver', 'Schedule locked for the year', 'Priority on weather days'],
    href: book.schoolFullYear,
    highlight: true,
  },
  {
    name: 'Weekly Pattern',
    badge: null,
    cadence: 'Pick your days · e.g. Tue / Wed / Thu',
    features: ['Choose the days that fit', 'AM and/or PM per day', 'Same trusted driver', 'Locked monthly schedule'],
    href: book.schoolWeekly,
    highlight: false,
  },
  {
    name: 'After-School Activities',
    badge: null,
    cadence: 'Sports · clubs · programs',
    features: ['Per-program scheduling', 'Sports, clubs & enrichment', 'Pay upfront for the season', 'Locked, predictable schedule'],
    href: book.schoolAfterSchool,
    highlight: false,
  },
];

const STANDARDS = [
  ['Curb-to-curb', 'Picked up and dropped at the door — never left to find their own way.'],
  ['5-minute no-show', 'Driver waits, then calls you — your child is never abandoned at a curb.'],
  ['Hygiene', 'Clean, climate-controlled vehicles maintained on our medical-fleet schedule.'],
  ['Trusted handoff', 'Released only to an approved adult or school staff on your list.'],
  ['Professional conduct', 'Vetted, fingerprinted drivers held to a written code of conduct.'],
  ['Recorded for safety', 'In-vehicle recording on every ride, retained for your protection.'],
  ['Known driver', 'The same friendly face every day — continuity that matters most for kids.'],
];

const METROS = [
  { name: 'Charlotte, NC', note: 'Our home base — school routes run alongside the rest of the Tassy fleet, dispatched from the same Charlotte operation.' },
  { name: 'High Point, NC', note: 'Daily student routes in the Piedmont Triad, operated under EverDriven route assignments.' },
  { name: 'Spartanburg, SC', note: 'Upstate South Carolina routes serving students who need transportation the yellow bus can’t provide.' },
  { name: 'Rock Hill, SC', note: 'Just across the state line from Charlotte, covered by the same drivers and standards.' },
  { name: 'Cincinnati, OH', note: 'Our first metro outside the Carolinas — proof the model travels.' },
];

export default function SchoolPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />

      {/* HERO — parent-direct, the product that actually ships now */}
      <section className="border-b border-line">
        <div className="container-x py-16 lg:py-24">
          <div className="eyebrow gold-text">Service line · Now booking for 2026–2027</div>
          <h1 className="h-display mt-4 max-w-3xl">
            Daily school transport. <span className="serif italic gold-text">Committed.</span> Trusted.
          </h1>
          <p className="mt-5 text-xl lg:text-2xl ink-soft serif max-w-2xl">
            The same trusted driver, every school day. Parents commit to one of three plans —
            predictable rides, the same friendly face, all year.
          </p>
          <div className="mt-9 flex gap-3 flex-wrap">
            <a href={book.school} className="btn-gold">Choose your plan <ArrowRight size={16} /></a>
            <a href={contact.phone} className="btn-call"><Phone size={15} /> Call {contact.phoneDisplay}</a>
          </div>
        </div>
      </section>

      {/* PLAN CARDS — mirror the SaaS /book/school product */}
      <section className="bg-cream">
        <div className="container-x py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((p) => (
              <div key={p.name} className={`tier-card ${p.highlight ? 'is-popular' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="eyebrow" style={p.highlight ? { color: 'rgba(27,26,23,0.7)' } : undefined}>School plan</div>
                  {p.badge && (
                    <span className="status-badge" style={{ background: 'rgba(27,26,23,0.12)', color: '#1B1A17' }}>{p.badge}</span>
                  )}
                </div>
                <h3 className="serif text-2xl font-semibold mt-3">{p.name}</h3>
                <p className={`mt-1 text-sm ${p.highlight ? '' : 'ink-mute'}`} style={p.highlight ? { color: 'rgba(27,26,23,0.7)' } : undefined}>{p.cadence}</p>
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check size={16} className="mt-0.5 shrink-0" style={{ color: p.highlight ? '#1B1A17' : 'var(--gold)' }} />
                      <span style={p.highlight ? { color: 'rgba(27,26,23,0.9)' } : undefined}>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className={`mt-5 pt-4 ${p.highlight ? '' : 'border-t border-line'}`} style={p.highlight ? { borderTop: '1px solid rgba(27,26,23,0.15)' } : undefined}>
                  <div className="text-xs uppercase tracking-eyebrow" style={p.highlight ? { color: 'rgba(27,26,23,0.6)' } : { color: 'var(--ink-mute)' }}>Pricing</div>
                  <div className="text-sm mt-0.5" style={p.highlight ? { color: '#1B1A17' } : undefined}>Varies by school</div>
                </div>
                <a
                  href={p.href}
                  className="mt-5 inline-flex items-center justify-center w-full rounded-md py-2.5 font-semibold transition-colors"
                  style={p.highlight
                    ? { background: '#1B1A17', color: '#F4EFE0' }
                    : { background: 'var(--gold)', color: '#1B1A17' }}
                >
                  Get started <ArrowRight size={16} className="ml-1.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 SAFETY STANDARDS — mirror the SaaS /book/school policies */}
      <section className="bg-ink-section">
        <div className="container-x py-16 lg:py-20">
          <div className="eyebrow opacity-70 text-current">How every ride works</div>
          <h2 className="h-section mt-3 max-w-2xl">Seven standards on every school ride.</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-7">
            {STANDARDS.map(([title, body], i) => (
              <div key={title} className="flex gap-3">
                <span className="number-bullet shrink-0">{i + 1}</span>
                <div>
                  <h3 className="serif text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm opacity-75 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEARN MORE — the district / EverDriven story, demoted below the product */}
      <article>
        <section className="bg-cream">
          <div className="container-x py-14 lg:py-16">
            <div className="h-1 w-12 bg-gold mb-5" />
            <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">
              Learn more about Tassy School
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed ink-soft">
              <p>
                Alongside parent-direct plans, Tassy also runs alternative student
                transportation — the small-vehicle, high-accountability service for students an
                IEP, McKinney-Vento status, foster placement, or out-of-zone address keeps off the
                yellow bus. We&rsquo;ve operated these routes since 2022, today as a subcontractor
                to EverDriven Technologies, who hold the district relationships and dispatch the work.
              </p>
              <p>
                The division of labor is clean: EverDriven manages district compliance and routing;
                Tassy is the local vehicle and driver provider that executes every pickup and
                drop-off safely, on time, and on protocol — four-plus years of mornings where the
                vehicle showed up and the school day started the way it was supposed to.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface border-y border-line">
          <div className="container-x py-14 lg:py-16">
            <div className="h-1 w-12 bg-gold mb-5" />
            <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">Where we operate</h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed ink-soft">
              Five metros across the Carolinas plus one outpost in Ohio. Every metro runs the same
              playbook: vetted drivers, dependable vehicles, and routes that complete on time.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
              {METROS.map((m) => (
                <div key={m.name} className="card-tile !p-6">
                  <h3 className="serif text-xl font-semibold">{m.name}</h3>
                  <p className="mt-2 text-sm ink-mute leading-relaxed">{m.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </article>

      {/* AUDIENCE SPLIT — the footer correction */}
      <section className="bg-ink-section border-t border-line">
        <div className="container-x py-16 text-center">
          <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2">Two ways to ride with Tassy School</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto text-left">
            <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(244,239,224,0.04)' }}>
              <div className="eyebrow opacity-70 text-current">For parents</div>
              <p className="mt-2 text-sm opacity-85 leading-relaxed">Pick a plan above and complete setup in minutes — schedule, kid profile, and safety acknowledgments.</p>
              <a href={book.school} className="btn-gold mt-4 text-sm">Choose your plan <ArrowRight size={16} /></a>
            </div>
            <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(244,239,224,0.04)' }}>
              <div className="eyebrow opacity-70 text-current">For districts & EverDriven partners</div>
              <p className="mt-2 text-sm opacity-85 leading-relaxed">Coordinating routes or alternative student transport? Reach our team directly.</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <a href={contact.bookingEmail} className="underline underline-offset-2 hover:text-[color:var(--gold-warm)]">booking@tassytrucks.com</a>
                <a href={contact.phone} className="underline underline-offset-2 hover:text-[color:var(--gold-warm)]">{contact.phoneDisplay}</a>
              </div>
            </div>
          </div>
          <p className="mt-10 text-sm">
            <Link href="/" className="underline underline-offset-2 opacity-75 hover:opacity-100 hover:text-[color:var(--gold-warm)]">
              Back to all six lines of care
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
