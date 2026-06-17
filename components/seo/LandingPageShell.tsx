import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { contact } from '@/lib/saas-links';

type SubSection = { h3: string; body: React.ReactNode };
type Section = { h2: string; body: React.ReactNode; subSections?: SubSection[] };
type Faq = { q: string; a: string };
type RelatedLink = { label: string; href: string };

export type LandingPageShellProps = {
  primaryKeyword: string;
  h1: string;
  quickAnswer: string;
  sections: Section[];
  faqs: Faq[];
  ctaText: string;
  ctaHref: string;
  relatedLinks: RelatedLink[];
  schemaServiceType: string;
  /** One-sentence hero subtitle: what + who + why now. */
  heroSubtitle?: string;
  eyebrow?: string;
  /** Optional icon rendered beside the eyebrow (e.g. Winnie paw). */
  heroIcon?: React.ReactNode;
  /** 'sage' switches CTA + accents to the Winnie palette. Gold stays default. */
  accent?: 'gold' | 'sage';
  /** Extra trust-strip items appended after the standard certs. */
  trustExtras?: string[];
  /** Rendered between the last section and the FAQ (e.g. comparison table). */
  beforeFaq?: React.ReactNode;
  /** Visible published date for pages that must age honestly (compare pages). */
  publishedDate?: string;
  secondaryCta?: { label: string; href: string };
};

const TRUST_BASE = ['SDVOSB Certified', 'USDOT #3104152', 'MC #79222'];

export default function LandingPageShell({
  h1, quickAnswer, sections, faqs, ctaText, ctaHref, relatedLinks,
  schemaServiceType, heroSubtitle, eyebrow, heroIcon, accent = 'gold',
  trustExtras, beforeFaq, publishedDate, secondaryCta,
}: LandingPageShellProps) {
  const sage = accent === 'sage';
  const trustItems = [
    ...TRUST_BASE,
    ...(trustExtras ?? ['Charlotte-based', '24/7 dispatch']),
  ];

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: h1,
    serviceType: schemaServiceType,
    description: quickAnswer,
    provider: {
      '@type': 'LocalBusiness',
      name: 'Tassy Transportation',
      telephone: '+1-704-941-8508',
      email: 'book@tassytrucks.com',
      address: { '@type': 'PostalAddress', addressLocality: 'Charlotte', addressRegion: 'NC', addressCountry: 'US' },
    },
    areaServed: [
      { '@type': 'City', name: 'Charlotte' },
      { '@type': 'AdministrativeArea', name: 'Mecklenburg County' },
    ],
    ...(publishedDate ? { datePublished: publishedDate } : {}),
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* HERO */}
      <section className="border-b border-line">
        <div className="container-x py-16 lg:py-24">
          {(eyebrow || heroIcon) && (
            <div className="flex items-center gap-2.5">
              {heroIcon}
              {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            </div>
          )}
          <h1 className="serif text-4xl lg:text-6xl font-semibold leading-[1.05] tracking-tight2 mt-4 max-w-3xl">
            {h1}
          </h1>
          {heroSubtitle && (
            <p className="mt-5 text-xl lg:text-2xl ink-soft font-serif serif max-w-2xl">
              {heroSubtitle}
            </p>
          )}

          {/* Quick Answer — featured-snippet target */}
          <div
            className={`mt-8 max-w-2xl rounded-card border bg-surface p-6 ${
              sage ? 'border-winnie-sage/40' : 'border-line'
            }`}
          >
            <div className={`eyebrow ${sage ? 'text-winnie-sage' : ''}`} style={sage ? { color: '#7C9A5C' } : undefined}>
              Quick answer
            </div>
            <p className="mt-2 text-base leading-relaxed ink-soft">{quickAnswer}</p>
          </div>

          <div className="mt-8 flex gap-3 flex-wrap items-center">
            <a
              href={ctaHref}
              className="btn-gold"
              style={sage ? { background: '#7C9A5C', color: '#FFFFFF' } : undefined}
            >
              {ctaText} <ArrowRight size={16} />
            </a>
            <a href={contact.phone} className="btn-call">
              <Phone size={15} /> Call {contact.phoneDisplay}
            </a>
            {secondaryCta && (
              <a href={secondaryCta.href} className="btn-ghost">
                {secondaryCta.label}
              </a>
            )}
          </div>
          {publishedDate && (
            <p className="mt-6 text-xs ink-mute">Published {publishedDate} · Reviewed by the Tassy Transportation team</p>
          )}
        </div>
      </section>

      {/* CONTENT SECTIONS */}
      <article>
        {sections.map((s, i) => (
          <section key={s.h2} className={i % 2 === 0 ? 'bg-cream' : 'bg-surface border-y border-line'}>
            <div className="container-x py-14 lg:py-16">
              <div className={`h-1 w-12 mb-5 ${sage ? '' : 'bg-gold'}`} style={sage ? { background: '#7C9A5C' } : undefined} />
              <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">
                {s.h2}
              </h2>
              <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed ink-soft [&_strong]:text-[color:var(--ink)]">
                {s.body}
              </div>
              {s.subSections?.map((sub) => (
                <div key={sub.h3} className="mt-8 max-w-3xl">
                  <h3 className="serif text-2xl font-semibold">{sub.h3}</h3>
                  <div className="mt-3 space-y-4 text-base leading-relaxed ink-soft">
                    {sub.body}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </article>

      {beforeFaq}

      {/* TRUST STRIP */}
      <section className="bg-ink-section">
        <div className="container-x py-10">
          <ul className="flex flex-wrap gap-x-8 gap-y-3 items-center justify-center text-sm">
            {trustItems.map((t) => (
              <li key={t} className="flex items-center gap-2 opacity-85">
                <span className="dot" /> {t}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Phone size={14} className="opacity-85" />
              <a href={contact.phone} className="hover:text-[color:var(--gold-warm)]">
                {contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={contact.bookingEmail} className="hover:text-[color:var(--gold-warm)] opacity-85">
                book@tassytrucks.com
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream">
        <div className="container-x py-14 lg:py-16">
          <div className="eyebrow">Frequently asked questions</div>
          <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 mt-3">
            Questions families ask us
          </h2>
          <div className="mt-8 max-w-3xl space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="card-tile !p-6">
                <h3 className="font-semibold text-lg">{f.q}</h3>
                <p className="mt-2 ink-mute leading-relaxed text-[0.95rem]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED */}
      <section className="bg-surface border-y border-line">
        <div className="container-x py-12">
          <div className="eyebrow">Related Tassy services</div>
          <ul className="mt-4 flex flex-wrap gap-3">
            {relatedLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="pill hover:border-[color:var(--gold)] transition-colors">
                  {l.label} <ArrowRight size={12} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA BLOCK */}
      <section className="bg-cream">
        <div className="container-x py-16 text-center">
          <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2">
            Ready when you are.
          </h2>
          <p className="mt-3 ink-mute max-w-xl mx-auto">
            Book online in about two minutes, or call our Charlotte dispatch line —
            a person answers, 24/7.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap justify-center">
            <a
              href={ctaHref}
              className="btn-gold"
              data-testid="primary-cta"
              style={sage ? { background: '#7C9A5C', color: '#FFFFFF' } : undefined}
            >
              {ctaText} <ArrowRight size={16} />
            </a>
            <a href={contact.phone} className="btn-call">
              <Phone size={15} /> {contact.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
