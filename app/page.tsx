import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, Check,
  HeartPulse, Sparkles, PawPrint, Droplets, Shield, GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { contact, apply } from '@/lib/saas-links';
import { request } from '@/lib/request-links';
import CharlotteDayMap from '@/components/CharlotteDayMap';

// MEGA_TASSY_PUBLISH_READY — self-canonical + explicit OG for the home page.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630 }],
  },
};

type Vertical = {
  slug: string;
  name: string;
  blurb: string;
  bullets: string[];
  cta: string;
  /** Booking deep-link. Omitted for capability-only lines (School has no booking flow). */
  bookHref?: string;
  /** FIX_PROD_132 — semantic Lucide icon (replaces the placeholder letter chip). */
  Icon: LucideIcon;
  /** FIX_PROD_132 — per-service one-shot hover animation class (see globals.css). */
  anim: string;
};

const verticals: Vertical[] = [
  {
    slug: '/nemt', name: 'Tassy Care', Icon: HeartPulse, anim: 'svc-anim--heart',
    blurb: 'Dialysis, infusion, physical therapy, the specialist across town. Booked ahead, door to door, and you know the price before you book.',
    bullets: ['Flat rates from $49, one way', 'Wheelchair quoted on the call'],
    cta: 'Request a Tassy Care trip',
    bookHref: request.nemt,
  },
  {
    slug: '/recover', name: 'Tassy Recovery', Icon: Shield, anim: 'svc-anim--shield',
    blurb: 'Most surgery centers will not discharge you without a responsible adult. We meet you at the desk, wait, and take you home — with one pharmacy stop on the way.',
    bullets: ['From $129 — there, the wait, and home', 'One pharmacy stop included'],
    cta: 'Book your ride home',
    bookHref: request.recover,
  },
  {
    slug: '/vip', name: 'Tassy Concierge', Icon: Sparkles, anim: 'svc-anim--spark',
    blurb: 'Airport at 5am, a round of golf, dinner, the client you are collecting. A reserved car and a professional driver, booked for a time you chose.',
    bullets: ['Flat rates from $69 — no surge, ever', 'Full-size SUV, room for luggage'],
    cta: 'Reserve a car',
    bookHref: request.vip,
  },
  {
    slug: '/winnie', name: 'Winnie Ride', Icon: PawPrint, anim: 'svc-anim--paw',
    blurb: 'Your pet gets there. You don’t have to leave work. Vet, groomer, daycare or boarding — we take them on their own and hand them over by name.',
    bullets: ['From $49 one way, $89 there and back', 'Carrier or harness included'],
    cta: 'Request a Winnie Ride',
    bookHref: request.winnie,
  },
  {
    slug: '/renew', name: 'Wellness & med-spa', Icon: Droplets, anim: 'svc-anim--drip',
    blurb: 'IV therapy, med-spa and aesthetic appointments. Concierge if you are fine to travel alone, Recovery if the procedure means you should not be driving.',
    bullets: ['Concierge from $69 one way', 'Recovery from $129 both ways'],
    cta: 'See which one you need',
    bookHref: request.renew,
  },
  {
    slug: '/school', name: 'Tassy Scholar', Icon: GraduationCap, anim: 'svc-anim--cap',
    blurb: 'Alternative student transportation since 2022 — originally with Alternative School Transportation, continuing today with EverDriven Technologies after their 2023 rebrand. Special needs, McKinney-Vento, foster youth, and at-risk student routes.',
    bullets: [
      'Subcontractor since 2022 · EverDriven Technologies (formerly Alternative School Transportation)',
      '5 metros: Charlotte NC · High Point NC · Spartanburg SC · Rock Hill SC · Cincinnati OH',
    ],
    cta: 'Get a route quote',
    bookHref: request.school,
  },
];

export default function HomePage() {
  return (
    <>
      {/* ───────────── HERO ───────────── */}
      <section className="relative">
        <div className="container-x pt-20 pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <div>
            <div className="pill pill-vet mb-6">
              <span>★</span>
              <span>Veteran-Owned · SDVOSB Certified · Charlotte, NC</span>
            </div>

            {/* FIX_PROD_131 — motto elevated to the hero (Issue 2/6); one primary +
                one calm secondary CTA (Issue 3); phone lives in the nav. */}
            <h1 className="h-display">
              We Transport<br />
              <span className="serif italic font-normal gold-text">With Care.</span>
            </h1>

            <p className="mt-7 text-lg lg:text-xl ink-soft leading-relaxed max-w-xl">
              Medical, post-procedure, pet and school transport across Charlotte and
              Mecklenburg County. Flat rates by distance — you know the price before you
              book, and it does not move afterwards.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-5">
              <a href={request.ride} className="btn-gold">
                Request a Ride <ArrowRight size={16} />
              </a>
              <Link href="/#services" className="nav-link inline-flex items-center gap-1.5 text-base">
                Explore our services <ArrowRight size={15} />
              </Link>
            </div>

            <p className="mt-4 text-xs ink-mute flex items-center gap-2">
              <span className="dot" /> Request any time · a dispatcher usually confirms your driver and your price within 2 hours
            </p>

            {/* Trust strip — FIX_PROD_131: unverified "15,000+ rides" / "4.9★ Google"
                removed from the hero (those specific claims are pending Phil's
                verification, task #222); credentials shown here are all documentable. */}
            <div className="mt-10 pt-8 hairline grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                ['SDVOSB',  'VA-verified'],
                ['MBE · DBE', 'SBE certified'],
                ['USDOT',   '#3104152'],
                ['Veteran', 'Owned & operated'],
              ].map(([num, label]) => (
                <div key={label}>
                  <div className="serif text-3xl font-semibold">{num}</div>
                  <div className="text-xs ink-mute uppercase tracking-wider mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative">
            {/* The hero panel. Replaced a static gold gradient carrying a
                "LIVE TRIP BOARD · En route" card for trips that were not
                happening; see components/CharlotteDayMap.tsx. */}
            <CharlotteDayMap />

            {/* Floating stat card */}
            <div className="absolute -top-6 -left-6 bg-surface border border-line rounded-2xl p-4 shadow-xl animate-float-slow hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center">
                  <Check size={20} className="text-[color:var(--gold)]" />
                </div>
                <div>
                  <div className="text-xs ink-mute uppercase tracking-wider">Average pickup</div>
                  <div className="serif text-xl font-semibold">2 min early</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── SERVICES ───────────── */}
      <section id="services" className="bg-surface border-y border-line">
        <div className="container-x py-20">
          <div className="grid lg:grid-cols-3 gap-10 items-end mb-14">
            <div className="lg:col-span-2">
              <div className="eyebrow mb-3">What we move</div>
              <h2 className="h-section">
                One platform.<br />Six lines of care.
              </h2>
            </div>
            <p className="ink-soft text-lg">
              Pick the service that fits the moment. Same drivers, same standards, same accountability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {verticals.map((v) => (
              <Link key={v.slug} href={v.slug} className="card-tile group">
                {/* FIX_PROD_132 — bare semantic icon + hairline gold accent (was a
                    placeholder letter chip). Per-service one-shot hover animation. */}
                <v.Icon
                  size={32}
                  strokeWidth={1.75}
                  className={`text-[color:var(--gold)] svc-icon ${v.anim}`}
                  aria-hidden="true"
                />
                <div className={`svc-underline mt-6 mb-6 ${v.anim}-line`} />
                <div className="eyebrow">Service line</div>
                <h3 className="serif text-xl font-semibold mt-1 mb-3">{v.name}</h3>
                <p className="ink-soft text-sm leading-relaxed mb-5 flex-grow">{v.blurb}</p>
                <ul className="text-xs ink-soft space-y-1 mb-5">
                  {v.bullets.map((b) => (
                    <li key={b}>· {b}</li>
                  ))}
                </ul>
                <div className="text-sm font-medium flex items-center gap-2 group-hover:text-[color:var(--gold)]">
                  {v.cta} <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── HOW IT WORKS ───────────── */}
      <section id="how" className="bg-cream">
        <div className="container-x py-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="eyebrow mb-3">How it works</div>
            <h2 className="h-section">Three steps. Zero surprises.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { n: 1, t: 'Request', d: 'Tell us where, when, and who. See the price upfront — no surge, no hidden fees, no booking fees.' },
              { n: 2, t: 'Match', d: "A licensed, insured driver is assigned within minutes. You'll get their name, photo, vehicle, and ETA by text." },
              { n: 3, t: 'Travel', d: 'Track in real time. Family gets pickup & dropoff alerts. Pay only when the trip completes. Receipt by email.' },
            ].map((s) => (
              <div key={s.n}>
                <span className="number-bullet">{s.n}</span>
                <h3 className="serif text-2xl font-semibold mt-5 mb-3">{s.t}</h3>
                <p className="ink-soft leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── FACILITIES CTA (DARK) ───────────── */}
      <section id="facilities" className="bg-ink-section">
        <div className="container-x py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="eyebrow gold-text mb-3">For hospitals &amp; facilities</div>
            <h2 className="h-section mb-6">
              Discharge transport shouldn&apos;t be a daily fire drill.
            </h2>
            <p className="text-lg leading-relaxed mb-6 opacity-75">
              Your patient cannot be released until someone responsible is standing there.
              Tassy Recovery is that person — a named adult at the discharge desk, on a
              booking your coordinator made in advance, at a price they could quote the
              family before they made it.
            </p>
            <p className="text-lg leading-relaxed mb-8 opacity-75">
              Book on account, one invoice a month instead of chasing receipts. Preferred
              rates from 10 trips a month, contract rates from 25.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={apply.facility} className="btn-gold">Request a partnership call</a>
              <a href={contact.salesEmail} className="btn-ghost" style={{ color: 'var(--cream-text)' }}>
                Email partnerships →
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl p-6 text-cream-text">
              <div className="serif text-3xl font-semibold">20 min</div>
              <div className="text-xs ink-mute uppercase tracking-wider mt-1">Of discharge wait, in the price</div>
            </div>
            <div className="bg-surface rounded-2xl p-6 text-cream-text">
              <div className="serif text-3xl font-semibold">2 hrs</div>
              <div className="text-xs ink-mute uppercase tracking-wider mt-1">To confirm any booking</div>
            </div>
            <div className="bg-surface rounded-2xl p-6 col-span-2 text-cream-text">
              <div className="text-xs ink-mute uppercase tracking-wider mb-3">Certified for institutional procurement</div>
              <div className="flex flex-wrap gap-3 items-center">
                <span className="pill">SDVOSB</span>
                <span className="pill">MBE</span>
                <span className="pill">DBE</span>
                <span className="pill">SBE</span>
                <span className="pill">USDOT #3104152</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── TESTIMONIALS ───────────── */}
      <section className="bg-cream">
        <div className="container-x py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="eyebrow mb-3">How it works</div>
            <h2 className="h-section">
              Three steps, and the price<br />is settled before step three.
            </h2>
            <p className="text-sm ink-mute mt-4">
              Veteran-owned · SDVOSB, MBE, DBE &amp; SBE certified · Charlotte &amp; Mecklenburg County
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                h: 'Tell us the trip',
                b: 'Two addresses, a date and a time. The form shows your estimated price as you type — no call needed to find out roughly what it costs.',
              },
              {
                n: '02',
                h: 'We usually confirm within 2 hours',
                b: 'A dispatcher calls or texts with your exact price and your driver. Nothing is charged, and nothing is booked, until you say yes.',
              },
              {
                n: '03',
                h: 'The price does not move',
                b: 'What you agreed is what you pay. Tolls and extra wait are quoted to you before they are charged — never added afterwards.',
              },
            ].map((t) => (
              <div key={t.n} className="card-tile">
                <div className="serif text-4xl font-semibold gold-text">{t.n}</div>
                <h3 className="serif text-xl font-semibold mt-3">{t.h}</h3>
                <p className="ink-soft leading-relaxed mt-2 flex-grow">{t.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── FOUNDER ───────────── */}
      <section id="founder" className="bg-surface border-y border-line">
        <div className="container-x py-24 grid lg:grid-cols-2 gap-14 items-center">
          <div className="aspect-square rounded-tile border border-line overflow-hidden">
            {/* MEGA_TASSY_PUBLISH_READY — real founder portrait (public/tassy-founder.png) */}
            <img
              src="/tassy-founder.png"
              alt="Phil Tassy · Founder · Tassy Transportation"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div>
            <div className="eyebrow mb-3">The founder</div>
            <h2 className="h-section">
              Built by a veteran.<br />Held to a higher standard.
            </h2>
            {/* FIX_PROD_138 — authoritative founder bio (Phil-provided, verbatim). */}
            <p className="mt-6 ink-soft text-lg leading-relaxed max-w-2xl">
              Philippe &ldquo;Phil&rdquo; Tassy didn&rsquo;t take the easy road to get here &mdash; and that&rsquo;s
              exactly what makes Tassy Transportation different.
            </p>
            <p className="mt-4 ink-soft text-lg leading-relaxed max-w-2xl">
              Born and raised in Cameroon, Phil came to the U.S. to pursue his education,
              earning his Master&rsquo;s before enlisting in the U.S. Army. There, he spent over
              six years mastering logistics, strategic planning, and supply chain
              management. His story embodies what America is built on.
            </p>
            <p className="mt-4 ink-soft text-lg leading-relaxed max-w-2xl">
              Today, Phil leads Tassy Transportation in Charlotte, NC &mdash; a mission-driven
              company providing veterans, families, and those in need with dignified,
              reliable medical transport through NEMT, luxury private rides, and
              specialized services. Every ride reflects our Army values: on time,
              compliant, and caring. We partner with hospitals, VA centers, and insurance
              brokers to serve hundreds of clients monthly.
            </p>
            <p className="mt-5 serif italic text-lg max-w-2xl" style={{ color: 'var(--gold)' }}>
              Community-focused and here to serve those who need us most.
            </p>

            {/* 2023 HIRE Vets Medallion Award, Gold -- U.S. Department of Labor.
                Sits in the founder section rather than the hero trust strip:
                the strip is deliberately typographic, and a full-colour federal
                seal dropped into it reads as bolted on. The award year stays
                visible on the medal and in the caption -- it is a 2023 award and
                must not be presented as a current-year one. */}
            <div className="mt-8 flex items-center gap-5 rounded-tile border border-line p-5 max-w-xl" style={{ background: 'var(--surface)' }}>
              {/* White chip: the site runs a dark theme (--surface #161b22) and the
                  medal's outer ring is navy. Without a light backing the ring
                  disappears into the card. The badge itself is not recoloured. */}
              <div className="rounded-full bg-white p-2 shrink-0">
                <img
                  src="/brand/hirevets-2023-gold.png"
                  alt="2023 HIRE Vets Medallion Award, Gold -- U.S. Department of Labor"
                  width={96}
                  height={96}
                  loading="lazy"
                  className="h-16 w-16 block"
                />
              </div>
              <div>
                <div className="serif text-lg font-semibold leading-snug">
                  2023 HIRE Vets Medallion Award &mdash; Gold
                </div>
                <div className="text-sm ink-mute mt-1 leading-relaxed">
                  Awarded by the U.S. Department of Labor to employers who recruit,
                  hire and retain veterans.
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="btn-primary">See pricing</Link>
              <a href={contact.bookingEmail} className="btn-call">Talk to our team</a>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── FINAL CTA ───────────── */}
      <section className="bg-cream">
        <div className="container-x py-24 text-center">
          <h2 className="h-section">Ready when you are.</h2>
          <p className="mt-4 ink-soft max-w-xl mx-auto">
            Request a one-time ride or set up a recurring subscription — upfront pricing, no surge, no booking fees.
          </p>
          {/* FIX_PROD_131 — one primary + one calm secondary (was 3 equal buttons) */}
          <div className="mt-8 flex justify-center items-center gap-5 flex-wrap">
            <a href={request.ride} className="btn-gold">Request a Ride <ArrowRight size={16} /></a>
            <Link href="/pricing" className="nav-link inline-flex items-center gap-1.5 text-base">
              See subscription pricing <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
