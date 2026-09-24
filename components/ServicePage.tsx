import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

type Tier = {
  name: string;
  price: string;
  cadence?: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

type Props = {
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  bookHref: string;
  bookLabel?: string;
  highlights: { title: string; body: string }[];
  tiers?: Tier[];
  partnerCta?: { title: string; body: string; href: string; label: string };
  /** Agents B + E — keyworded <h2> above the highlights grid (fixes the h1→h3
   *  skip and gives each service page a location/service-keyworded section head). */
  highlightsHeading?: string;
  /** Agent D — when both are set, emit Service JSON-LD (schema.org/Service). */
  serviceName?: string;
  path?: string;
};

// MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN (Agent A) — objection-preemption row on
// every service hero. Credentials only — all documentable/true (no invented
// prices; the price objection is handled by the "See pricing" CTA).
const TRUST_CHIPS = ['SDVOSB certified', 'USDOT #3104152', 'Licensed & insured', 'Trained drivers'];

export default function ServicePage({
  eyebrow, title, tagline, description, bookHref, bookLabel = 'Request now',
  highlights, tiers, partnerCta,
  highlightsHeading = 'Why Charlotte families choose Tassy',
  serviceName, path,
}: Props) {
  const serviceLd =
    serviceName && path
      ? {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: serviceName,
          serviceType: serviceName,
          description,
          provider: {
            '@type': 'LocalBusiness',
            name: 'Tassy Transportation',
            telephone: '+1-704-941-8508',
          },
          areaServed: [
            { '@type': 'City', name: 'Charlotte', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
            { '@type': 'AdministrativeArea', name: 'Mecklenburg County', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
          ],
          url: `https://www.tassytrucks.com${path}`,
        }
      : null;

  return (
    <>
      {serviceLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
        />
      )}
      {/* HERO */}
      <section className="border-b border-charcoal/8">
        <div className="container-x py-20 lg:py-28">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="h-display mt-4 max-w-3xl">{title}</h1>
          <p className="mt-5 text-2xl ink-soft font-serif max-w-2xl">
            {tagline}
          </p>
          <p className="mt-6 text-base ink-soft max-w-2xl leading-relaxed">
            {description}
          </p>
          <div className="mt-10 flex gap-3 flex-wrap">
            <a href={bookHref} className="btn-gold">
              {bookLabel} <ArrowRight size={16} />
            </a>
            <Link href="/pricing" className="btn-ghost">See pricing</Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Credentials">
            {TRUST_CHIPS.map((c) => (
              <li
                key={c}
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full border border-line bg-surface px-3 py-1.5 text-cream-text/85"
              >
                <Check size={13} className="text-gold shrink-0" aria-hidden="true" /> {c}
              </li>
            ))}
          </ul>
          {/* MEGA_TASSY_PUBLISH_READY — brand motto on every service-line hero */}
          <p className="mt-8 serif italic text-lg ink-soft">
            We Transport With Care<span className="gold-text">.</span>
          </p>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="bg-cream">
        <div className="container-x py-20">
          <h2 className="h-section mb-12 max-w-2xl">{highlightsHeading}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {highlights.map((h) => (
              <div key={h.title}>
                <div className="h-1 w-12 bg-gold mb-4" />
                <h3 className="font-serif text-2xl">{h.title}</h3>
                <p className="mt-3 text-ink-muted leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIERS (optional) */}
      {tiers && tiers.length > 0 && (
        <section className="border-t border-charcoal/8 bg-charcoal text-cream-text">
          <div className="container-x py-20">
            <div className="max-w-xl">
              <div className="eyebrow text-cream-text/50">Service tiers</div>
              <h2 className="h-section mt-3">Pick your level of care.</h2>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiers.map((t) => (
                <div
                  key={t.name}
                  className={`rounded-2xl p-6 border ${
                    t.highlight ? 'bg-gold text-charcoal border-gold' : 'bg-cream/5 border-cream/10'
                  }`}
                >
                  {t.highlight && (
                    <div className="eyebrow text-charcoal/70">Most popular</div>
                  )}
                  <h3 className={`font-serif text-2xl ${t.highlight ? '' : 'text-cream-text'}`}>
                    {t.name}
                  </h3>
                  <div className="mt-3">
                    <span className="font-serif text-4xl">{t.price}</span>
                    {t.cadence && (
                      <span className={`ml-1 text-sm ${t.highlight ? 'text-charcoal/70' : 'text-cream-text/60'}`}>
                        /{t.cadence}
                      </span>
                    )}
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check size={16} className={`mt-0.5 shrink-0 ${t.highlight ? 'text-charcoal' : 'text-gold'}`} />
                        <span className={t.highlight ? 'text-charcoal/90' : 'text-cream-text/80'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={t.cta.href}
                    className={`mt-6 inline-flex items-center justify-center w-full rounded-md py-2.5 font-semibold transition-colors ${
                      t.highlight
                        ? 'bg-charcoal text-cream-text hover:bg-charcoal/85'
                        : 'border border-cream/30 text-cream-text hover:bg-cream hover:text-charcoal'
                    }`}
                  >
                    {t.cta.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PARTNER CTA (optional) */}
      {partnerCta && (
        <section className="bg-cream">
          <div className="container-x py-20 text-center">
            <div className="eyebrow">For facilities & partners</div>
            <h2 className="h-section mt-3">{partnerCta.title}</h2>
            <p className="mt-4 text-ink-muted max-w-xl mx-auto">{partnerCta.body}</p>
            <div className="mt-8">
              <a href={partnerCta.href} className="btn-primary">{partnerCta.label}</a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
