import Link from 'next/link';
import { ArrowRight, Check, Phone } from 'lucide-react';
import { book, contact, apply } from '@/lib/saas-links';

const verticals = [
  {
    slug: '/nemt', name: 'NEMT',
    blurb: 'Non-emergency medical transport for dialysis, recurring appointments, doctor visits, and Medicaid-covered care.',
    bullets: ['ADA compliant', 'Broker partners accepted'],
    cta: 'Book NEMT trip',
    bookHref: book.nemt,
  },
  {
    slug: '/vip', name: 'VIP Concierge',
    blurb: 'Discreet, professional post-procedure transport. Driver arrives early, waits on-site, brings you home safely.',
    bullets: ['Female drivers on request', 'HIPAA-aware, judgment-free'],
    cta: 'Book VIP trip',
    bookHref: book.vip,
  },
  {
    slug: '/winnie', name: 'Winnie Ride',
    blurb: 'Vet visits, grooming pickups, doggy daycare runs. Trained drivers, climate-controlled vehicles, GPS tracking.',
    bullets: ['Photo + chip verification', 'Owner gets real-time updates'],
    cta: 'Book a Winnie Ride',
    bookHref: book.winnie,
  },
  {
    slug: '/renew', name: 'Tassy Renew',
    blurb: 'Wellness transport — IV therapy, med-spa, cosmetic dental, rejuvenation. Hydration kit on every ride.',
    bullets: ['Premium fleet', 'Med-spa partnerships'],
    cta: 'Book a Renew trip',
    bookHref: book.renew,
  },
  {
    slug: '/recover', name: 'Tassy Recover',
    blurb: 'Oncology, chemo, radiation, hospital discharge. CNA / LPN trained drivers. Quiet, equipped cabin.',
    bullets: ['CNA / LPN drivers', 'Recovery amenity kit'],
    cta: 'Book Recovery transport',
    bookHref: book.recover,
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

            <h1 className="h-display">
              Reliable rides.<br />
              <span className="serif italic font-normal gold-text">White-glove</span> care.
            </h1>

            <p className="mt-7 text-lg lg:text-xl ink-soft leading-relaxed max-w-xl">
              From hospital discharges to post-procedure concierge transport, Tassy moves the people
              who matter to you with discretion, dignity, and Army-grade reliability.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a href={book.quick} className="btn-gold">
                Book a Ride <ArrowRight size={16} />
              </a>
              <a href={contact.phone} className="btn-call">
                <Phone size={16} /> Call {contact.phoneDisplay}
              </a>
            </div>

            <p className="mt-4 text-xs ink-mute flex items-center gap-2">
              <span className="dot" /> Dispatchers online now · Avg. response 8 min
            </p>

            {/* Trust strip */}
            <div className="mt-10 pt-8 hairline grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                ['15,000+', 'Rides since 2021'],
                ['4.9 ★',   'Google rating'],
                ['HIPAA',   'PHI-compliant'],
                ['SDVOSB',  'VA-eligible'],
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
                      <span className="text-xs font-semibold">NEMT Dialysis Pickup</span>
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
                  <Check size={20} className="text-[color:var(--gold-warm)]" />
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
                One platform.<br />Five lines of care.
              </h2>
            </div>
            <p className="ink-soft text-lg">
              Pick the service that fits the moment. Same drivers, same standards, same accountability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5">
            {verticals.map((v) => (
              <Link key={v.slug} href={v.slug} className="card-tile group">
                <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center mb-6">
                  <span className="serif text-[color:var(--gold-warm)] text-xl font-bold">
                    {v.name.charAt(0)}
                  </span>
                </div>
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
              { n: 1, t: 'Book', d: 'Tell us where, when, and who. See the price upfront — no surge, no hidden fees, no booking fees.' },
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
            <div className="eyebrow gold-warm-text mb-3">For hospitals &amp; facilities</div>
            <h2 className="h-section mb-6">
              Discharge transport shouldn&apos;t be a daily fire drill.
            </h2>
            <p className="text-lg leading-relaxed mb-6 opacity-75">
              Tassy partners with hospitals across the Carolinas to handle every NEMT, every
              discharge, every recurring patient transport — under one master contract, one
              billing portal, one accountable team.
            </p>
            <blockquote className="serif italic text-lg leading-relaxed mb-8 pl-4 border-l-2 opacity-90"
                        style={{ borderColor: 'var(--gold-warm)' }}>
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
            <div className="bg-surface rounded-2xl p-6 text-ink">
              <div className="serif text-3xl font-semibold">&lt; 30 min</div>
              <div className="text-xs ink-mute uppercase tracking-wider mt-1">Avg. discharge pickup</div>
            </div>
            <div className="bg-surface rounded-2xl p-6 text-ink">
              <div className="serif text-3xl font-semibold">98%</div>
              <div className="text-xs ink-mute uppercase tracking-wider mt-1">On-time arrival</div>
            </div>
            <div className="bg-surface rounded-2xl p-6 col-span-2 text-ink">
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
            <p className="text-sm ink-mute mt-4">
              4.9 ★ on Google · 15,000+ rides completed since 2021
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
          <div className="aspect-square rounded-tile bg-ink/5 border border-line flex items-center justify-center text-ink-mute">
            {/* Place /tassy-founder.png in public/ to render the portrait */}
            <span className="text-sm">Founder portrait — drop tassy-founder.png in /public</span>
          </div>
          <div>
            <div className="eyebrow mb-3">The founder</div>
            <h2 className="h-section">
              Built by a veteran.<br />Held to a higher standard.
            </h2>
            <p className="mt-6 ink-soft text-lg leading-relaxed">
              Phil Tassy founded Tassy Trucks after years serving in the U.S. Army, where reliability
              wasn&apos;t a feature — it was the standard. Today, Tassy is an SDVOSB-certified
              transportation company headquartered in Charlotte, North Carolina, moving the people
              who need to get somewhere — safely, on time, every time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="btn-primary">See pricing</Link>
              <a href={contact.bookingEmail} className="btn-call">Contact us</a>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── FINAL CTA ───────────── */}
      <section className="bg-cream">
        <div className="container-x py-24 text-center">
          <h2 className="h-section">Ready when you are.</h2>
          <p className="mt-4 ink-soft max-w-xl mx-auto">
            Book a one-time ride, set up a subscription, or partner with us as a facility.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <a href={book.quick} className="btn-gold">Book a Ride <ArrowRight size={16} /></a>
            <Link href="/pricing" className="btn-primary">See subscriptions</Link>
            <Link href="/#services" className="btn-ghost">Explore services</Link>
          </div>
        </div>
      </section>
    </>
  );
}
