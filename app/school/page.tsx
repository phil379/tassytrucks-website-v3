import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { contact } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Tassy School — Alternative Student Transportation',
  description:
    'School routes across 5 metros since 2022 in partnership with EverDriven Technologies. Special needs, McKinney-Vento, foster youth, and at-risk student transport.',
  alternates: { canonical: '/school' },
  openGraph: { images: ['/og-image/school'] },
};

const serviceLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Tassy School — Alternative Student Transportation',
  serviceType: 'School Transportation',
  description:
    'Alternative student transportation operated as an EverDriven Technologies subcontractor since 2022 — special needs, McKinney-Vento, foster youth, and at-risk student routes.',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Tassy Trucks',
    telephone: '+1-704-941-8508',
    email: 'booking@tassytrucks.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Charlotte', addressRegion: 'NC', addressCountry: 'US' },
  },
  areaServed: ['Charlotte NC', 'High Point NC', 'Spartanburg SC', 'Rock Hill SC', 'Cincinnati OH'],
};

const TRUST = [
  'Veteran-Owned',
  'SDVOSB',
  'USDOT #3104152',
  'MC #79222',
  '24/7 dispatch (704) 941-8508',
];

const METROS = [
  {
    name: 'Charlotte, NC',
    note: 'Our home base — school routes run alongside the rest of the Tassy fleet, dispatched from the same Charlotte operation.',
  },
  {
    name: 'High Point, NC',
    note: 'Daily student routes in the Piedmont Triad, operated under EverDriven route assignments.',
  },
  {
    name: 'Spartanburg, SC',
    note: 'Upstate South Carolina routes serving students who need transportation the yellow bus can’t provide.',
  },
  {
    name: 'Rock Hill, SC',
    note: 'Just across the state line from Charlotte, covered by the same drivers and standards.',
  },
  {
    name: 'Cincinnati, OH',
    note: 'Our first metro outside the Carolinas — proof the model travels.',
  },
];

export default function SchoolPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />

      {/* HERO — capability showcase, no booking CTA */}
      <section className="border-b border-line">
        <div className="container-x py-16 lg:py-24">
          <div className="eyebrow">Service line · Since 2022</div>
          <h1 className="serif text-4xl lg:text-6xl font-semibold leading-[1.05] tracking-tight2 mt-4 max-w-3xl">
            Tassy School · Alternative Student Transportation
          </h1>
          <p className="mt-5 text-xl lg:text-2xl ink-soft serif max-w-2xl">
            Operating school routes across 5 metros since 2022 — in partnership
            with EverDriven Technologies.
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm ink-soft">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="dot" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHAT WE DO */}
      <article>
        <section className="bg-cream">
          <div className="container-x py-14 lg:py-16">
            <div className="h-1 w-12 bg-gold mb-5" />
            <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">
              Alternative school transportation
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed ink-soft">
              <p>
                Not every student can ride the yellow bus. Some have
                Individualized Education Programs that call for a smaller
                vehicle and a consistent driver. Some are covered by
                McKinney-Vento — students experiencing homelessness who have a
                federal right to stay in their school of origin even when their
                housing changes. Some are in foster care, some are considered
                at-risk, and some simply live outside their school&rsquo;s
                transportation zone. Alternative student transportation is the
                small-vehicle, high-accountability service that gets these
                students to school anyway.
              </p>
              <p>
                That specialty is exactly what our partner does. Tassy has been
                running these routes since 2022 — beginning with Alternative
                School Transportation, and continuing today with EverDriven
                Technologies after their 2023 rebrand. EverDriven specializes
                in alternative student transportation nationwide; Tassy is one
                of the local operators that puts those routes on the road.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface border-y border-line">
          <div className="container-x py-14 lg:py-16">
            <div className="h-1 w-12 bg-gold mb-5" />
            <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">
              Where we operate
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed ink-soft">
              Five metros, two states&rsquo; worth of the Carolinas, and one
              outpost in Ohio. Every metro runs on the same playbook: vetted
              drivers, dependable vehicles, and routes that complete on time.
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

        <section className="bg-cream">
          <div className="container-x py-14 lg:py-16">
            <div className="h-1 w-12 bg-gold mb-5" />
            <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">
              How we partner with EverDriven
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed ink-soft">
              <p>
                The division of labor is clean. EverDriven holds the
                relationships with school districts, manages compliance with
                each state&rsquo;s student transportation requirements, and
                dispatches the routes. Tassy is the local vehicle and driver
                provider: we staff the routes, maintain the fleet, and execute
                every pickup and drop-off safely, on time, and on protocol.
              </p>
              <p>
                It is the kind of subcontract that only survives on
                performance. There is no marketing that keeps a school route —
                just four consecutive years of mornings where the vehicle
                showed up, the driver knew the student, and the school day
                started the way it was supposed to.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface border-y border-line">
          <div className="container-x py-14 lg:py-16">
            <div className="h-1 w-12 bg-gold mb-5" />
            <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">
              What makes Tassy different
            </h2>
            <ul className="mt-6 max-w-3xl space-y-3 text-base ink-soft">
              {[
                'Vetted, fingerprinted drivers, screened to EverDriven and state standards',
                'Climate-controlled vehicles maintained on the same schedule as our medical fleet',
                'Same-driver continuity wherever possible — it matters most for special-needs students',
                'Veteran-Owned (SDVOSB) reliability culture: the route runs, every school day',
                '4+ years operating EverDriven routes',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="dot mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </article>

      {/* CONTACT — deliberately NOT a booking flow */}
      <section className="bg-ink-section">
        <div className="container-x py-16 text-center">
          <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2">
            School districts and student transportation partners
          </h2>
          <p className="mt-4 max-w-xl mx-auto opacity-80">
            Interested in working with Tassy? Reach us at{' '}
            <a href={contact.bookingEmail} className="underline underline-offset-2 hover:text-[color:var(--gold-warm)]">
              booking@tassytrucks.com
            </a>{' '}
            or{' '}
            <a href={contact.phone} className="underline underline-offset-2 hover:text-[color:var(--gold-warm)]">
              (704) 941-8508
            </a>
            .
          </p>
          <p className="mt-6 text-sm opacity-60 max-w-xl mx-auto">
            We do not currently take direct parent bookings for school routes —
            all routes are coordinated through our broker partners.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm opacity-75">
            <Phone size={14} /> 24/7 dispatch · {contact.phoneDisplay}
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
