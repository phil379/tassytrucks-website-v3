import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, Check,
  HeartPulse, Sparkles, PawPrint, Droplets, Shield, GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { contact, apply } from '@/lib/saas-links';
import { request } from '@/lib/request-links';

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
    blurb: 'Non-emergency medical transport for dialysis, recurring appointments, doctor visits, and Medicaid-covered care.',
    bullets: ['ADA compliant', 'Broker partners accepted'],
    cta: 'Request a Tassy Care trip',
    bookHref: request.nemt,
  },
  {
    slug: '/vip', name: 'VIP Concierge', Icon: Sparkles, anim: 'svc-anim--spark',
    blurb: 'Discreet, professional post-procedure transport. Driver arrives early, waits on-site, brings you home safely.',
    bullets: ['Female drivers on request', 'HIPAA-aware, judgment-free'],
    cta: 'Request a VIP trip',
    bookHref: request.vip,
  },
  {
    slug: '/winnie', name: 'Winnie Ride', Icon: PawPrint, anim: 'svc-anim--paw',
    blurb: 'Vet visits, grooming pickups, doggy daycare runs. Trained drivers, climate-controlled vehicles, GPS tracking.',
    bullets: ['Photo + chip verification', 'Owner gets real-time updates'],
    cta: 'Request a Winnie Ride',
    bookHref: request.winnie,
  },
  {
    slug: '/renew', name: 'Tassy Wellness', Icon: Droplets, anim: 'svc-anim--drip',
    blurb: 'Wellness transport — IV therapy, med-spa, cosmetic dental, rejuvenation. Hydration kit on every ride.',
    bullets: ['Premium fleet', 'Med-spa partnerships'],
    cta: 'Request a Wellness trip',
    bookHref: request.renew,
  },
  {
    slug: '/recover', name: 'Tassy Guardian', Icon: Shield, anim: 'svc-anim--shield',
    blurb: 'Oncology, chemo, radiation, hospital discharge. CNA-trained drivers. Quiet, equipped cabin.',
    bullets: ['CNA-trained drivers', 'Recovery amenity kit'],
    cta: 'Ask about availability',
    bookHref: contact.phone,
  },
  {
    slug: '/school', name: 'Tassy Scholar', Icon: GraduationCap, anim: 'svc-anim--cap',
    blurb: 'Alternative student transportation since 2022 — originally with Alternative School Transportation, continuing today with EverDriven Technologies after their 2023 rebrand. Special needs, McKinney-Vento, foster youth, and at-risk student routes.',
    bullets: [
      'Subcontractor since 2022 · EverDriven Technologies (formerly Alternative School Transportation)',
      '5 metros: Charlotte NC · High Point NC · Spartanburg SC · Rock Hill SC · Cincinnati OH',
    ],
    cta: 'Our school transport story',
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
              Premium medical, wellness, pet, and school transport across Charlotte —
              veteran-owned, SDVOSB certified, HIPAA-compliant.
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
              <span className="dot" /> Dispatchers online now · Avg. response 8 min
            </p>

            {/* Trust strip — FIX_PROD_131: unverified "15,000+ rides" / "4.9★ Google"
                removed from the hero (those specific claims are pending Phil's
                verification, task #222); credentials shown here are all documentable. */}
            <div className="mt-10 pt-8 hairline grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                ['SDVOSB',  'VA-eligible'],
                ['HIPAA',   'PHI-compliant'],
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
            <div className="hero-image rounded-3xl aspect-[4/5] shadow-2xl relative overflow-hidden">
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-[10px] uppercase tracking-eyebrow text-white/85 mb-2 font-semibold">
                  Live Trip Board
                </div>
                <div className="trip-rotator">
                  <div className="trip-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">Airport Transfer — CLT</span>
                      <span className="status-badge status-en-route">● En route</span>
                    </div>
                    <div className="text-xs ink-mute">Premium Luxury SUV · 12 min to pickup</div>
                  </div>
                  <div className="trip-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">Post-Procedure Concierge</span>
                      <span className="status-badge status-confirmed">● Confirmed</span>
                    </div>
                    <div className="text-xs ink-mute">Cosmetic surgery recovery · Driver waiting on-site</div>
                  </div>
                  <div className="trip-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">Tassy Care Dialysis Pickup</span>
                      <span className="status-badge status-completed">● Completed</span>
                    </div>
                    <div className="text-xs ink-mute">Atrium Health · &quot;Outstanding service!&quot; ★★★★★</div>
                  </div>
                </div>
              </div>
            </div>

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
              Tassy partners with hospitals across the Carolinas to handle every Tassy Care trip, every
              discharge, every recurring patient transport — under one master contract, one
              billing portal, one accountable team.
            </p>
            <blockquote className="serif italic text-lg leading-relaxed mb-8 pl-4 border-l-2 opacity-90"
                        style={{ borderColor: 'var(--gold)' }}>
              &quot;Phil&apos;s team is HIPAA-aware, professional, and I&apos;ve never had a complaint. Top-tier service.&quot;
              <footer className="text-sm not-italic mt-2 opacity-60">
                — Dr. Kim, RN · Discharge Planner, Atrium Health
              </footer>
            </blockquote>
            <div className="flex flex-wrap gap-3">
              <a href={apply.facility} className="btn-gold">Request a partnership call</a>
              <a href={contact.salesEmail} className="btn-ghost" style={{ color: 'var(--cream-text)' }}>
                Email partnerships →
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl p-6 text-cream-text">
              <div className="serif text-3xl font-semibold">&lt; 30 min</div>
              <div className="text-xs ink-mute uppercase tracking-wider mt-1">Avg. discharge pickup</div>
            </div>
            <div className="bg-surface rounded-2xl p-6 text-cream-text">
              <div className="serif text-3xl font-semibold">98%</div>
              <div className="text-xs ink-mute uppercase tracking-wider mt-1">On-time arrival</div>
            </div>
            <div className="bg-surface rounded-2xl p-6 col-span-2 text-cream-text">
              <div className="text-xs ink-mute uppercase tracking-wider mb-3">Current facility partners</div>
              <div className="flex flex-wrap gap-3 items-center">
                <span className="pill">Atrium Health Charlotte</span>
                <span className="pill">Aesthetic Carolina</span>
                <span className="pill">Bataclan Pets</span>
                <span className="pill" style={{ opacity: 0.5 }}>+ your facility</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── TESTIMONIALS ───────────── */}
      <section className="bg-cream">
        <div className="container-x py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="eyebrow mb-3">What clients say</div>
            <h2 className="h-section">
              Trusted by Charlotte families<br />&amp; healthcare teams.
            </h2>
            {/* FIX_PROD_131 — unverified "4.9★ / 15,000+ rides" line removed pending
                Phil's verification (task #222); replaced with a documentable line. */}
            <p className="text-sm ink-mute mt-4">
              Veteran-owned · SDVOSB certified · Serving Charlotte &amp; the Carolinas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { q: "After my mom's surgery, Tassy picked her up like family. Driver brought a blanket and a water. Worth every penny.", a: 'Janelle R. · Charlotte' },
              { q: "We use Tassy for every weekly dialysis run. On-time, every time. The kind of service that makes my job easier.", a: 'Marcus T. · Discharge planner' },
              { q: "Phil's team has moved 4 of our patients post-op. Zero complaints. The amenity kit is a brilliant touch.", a: 'Aesthetic Carolina · Anchor partner' },
            ].map((t) => (
              <div key={t.a} className="card-tile">
                <div className="quote-mark">"</div>
                <p className="serif text-lg leading-relaxed -mt-6 flex-grow">{t.q}</p>
                <div className="mt-6 pt-6 border-t border-line text-xs ink-mute uppercase tracking-wider">
                  {t.a}
                </div>
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
