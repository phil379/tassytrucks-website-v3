import type { Metadata } from 'next';
import { Check, Minus } from 'lucide-react';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Tassy vs Uber Health vs Lyft Healthcare — Compared',
  description:
    'Honest comparison of Tassy Trucks, Uber Health, and Lyft Healthcare for Charlotte medical transport: wheelchair access, driver training, booking, support.',
  alternates: { canonical: '/compare/tassy-vs-uber-health-vs-lyft-healthcare' },
  openGraph: { images: ['/og-image/tassy-vs-uber-health-vs-lyft-healthcare'] },
};

const CTA_HREF = seoBook('nemt', { source: 'seo-compare' });

const yes = <Check size={18} className="inline text-[color:var(--gold)]" aria-label="Yes" />;
const no = <Minus size={18} className="inline opacity-40" aria-label="No" />;

type Row = { label: string; tassy: React.ReactNode; uber: React.ReactNode; lyft: React.ReactNode };

const rows: Row[] = [
  {
    label: 'Service type',
    tassy: 'Dedicated NEMT + concierge medical transport',
    uber: 'Rideshare platform for healthcare organizations',
    lyft: 'Rideshare platform for healthcare organizations',
  },
  {
    label: 'Wheelchair-accessible vehicles',
    tassy: <>{yes} Wheelchair vans with securement</>,
    uber: 'Select markets; availability varies',
    lyft: 'Select markets; availability varies',
  },
  {
    label: 'Driver training',
    tassy: <>{yes} Patient handling, door-through-door</>,
    uber: 'Standard rideshare drivers',
    lyft: 'Standard rideshare drivers',
  },
  {
    label: 'Insurance',
    tassy: 'Commercial liability; certificates on request',
    uber: 'Platform coverage per Uber policies',
    lyft: 'Platform coverage per Lyft policies',
  },
  { label: 'SDVOSB certification', tassy: yes, uber: no, lyft: no },
  {
    label: 'Local Charlotte presence',
    tassy: <>{yes} Charlotte-based dispatch</>,
    uber: 'National platform',
    lyft: 'National platform',
  },
  {
    label: 'NEMT broker / facility contracts',
    tassy: <>{yes} Direct facility partnerships</>,
    uber: <>{yes} Via brokers and health plans</>,
    lyft: <>{yes} Via brokers and health plans</>,
  },
  {
    label: '24/7 phone support (a person answers)',
    tassy: <>{yes} (704) 941-8508</>,
    uber: 'Dashboard support for organizations',
    lyft: 'Dashboard support for organizations',
  },
  {
    label: 'Booking method',
    tassy: 'Phone or web wizard — no app required',
    uber: 'Organization dashboard / API',
    lyft: 'Organization dashboard / API',
  },
  {
    label: 'Direct rider relationship',
    tassy: <>{yes} You book with us directly</>,
    uber: 'Usually booked by your provider or plan',
    lyft: 'Usually booked by your provider or plan',
  },
];

function ComparisonTable() {
  return (
    <section className="bg-surface border-y border-line">
      <div className="container-x py-14">
        <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2">
          Side by side
        </h2>
        <p className="mt-3 ink-mute max-w-2xl text-sm">
          Based on publicly available information about each service as of June 2026.
          Uber Health and Lyft Healthcare offerings vary by market — verify current
          capabilities with each platform.
        </p>
        <div className="mt-8 overflow-x-auto" data-testid="comparison-table">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr className="text-left border-b-2 border-[color:var(--ink)]">
                <th className="py-3 pr-4 font-semibold"> </th>
                <th className="py-3 pr-4 font-semibold">Tassy Trucks</th>
                <th className="py-3 pr-4 font-semibold">Uber Health</th>
                <th className="py-3 font-semibold">Lyft Healthcare</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-line align-top">
                  <td className="py-3.5 pr-4 font-medium">{r.label}</td>
                  <td className="py-3.5 pr-4 ink-soft">{r.tassy}</td>
                  <td className="py-3.5 pr-4 ink-soft">{r.uber}</td>
                  <td className="py-3.5 ink-soft">{r.lyft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function ComparePage() {
  return (
    <LandingPageShell
      primaryKeyword="tassy vs uber health vs lyft healthcare"
      eyebrow="Comparison · Charlotte Medical Transport"
      h1="Tassy Trucks vs Uber Health vs Lyft Healthcare — Charlotte Medical Transport Compared"
      heroSubtitle="An honest look at when a national rideshare platform is the right call — and when a dedicated local NEMT provider is."
      quickAnswer="Uber Health and Lyft Healthcare are strong options for low-acuity, fully ambulatory rides booked at scale by healthcare organizations. Tassy Trucks is a Charlotte-based NEMT and concierge provider built for everything those platforms aren't designed for: wheelchair securement, post-anesthesia pickups, recurring dialysis schedules, and a dispatch line a person actually answers."
      ctaText="See if Tassy is right for you"
      ctaHref={CTA_HREF}
      schemaServiceType="Non-Emergency Medical Transportation"
      publishedDate="June 11, 2026"
      beforeFaq={<ComparisonTable />}
      sections={[
        {
          h2: 'What each service actually is',
          body: (
            <>
              <p>
                Uber Health and Lyft Healthcare are healthcare arms of the two big
                rideshare platforms. Hospitals, clinics, and health plans use their
                dashboards to book rides for patients, and the rides themselves are
                fulfilled by regular rideshare drivers. Patients usually
                don&rsquo;t need the app — the organization books on their behalf.
              </p>
              <p>
                Tassy Trucks is a dedicated medical transport company based in
                Charlotte. We own our vehicles, train our drivers on patient
                handling, and take bookings directly from patients and families as
                well as from facilities. We are a Service-Disabled Veteran-Owned
                Small Business operating under USDOT #3104152 and MC #79222, serving
                Mecklenburg County plus Matthews, Concord, and Gastonia. See our{' '}
                <a href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Charlotte NEMT page
                </a>{' '}
                for the full service rundown.
              </p>
            </>
          ),
        },
        {
          h2: 'Where Uber Health and Lyft Healthcare win',
          body: (
            <>
              <p>
                Honestly: if the rider is fully ambulatory, comfortable getting in
                and out of a sedan unassisted, and the trip is a simple A-to-B, the
                big platforms are hard to beat on price and instant availability.
                Their scale means a car is usually minutes away, and for health
                systems moving thousands of low-acuity rides a month, the dashboard
                and API tooling is genuinely good.
              </p>
              <p>
                If that describes your situation, they are a reasonable choice, and
                it would be dishonest of us to claim otherwise.
              </p>
            </>
          ),
        },
        {
          h2: 'Where Tassy wins',
          body: (
            <>
              <p>
                The gaps show up the moment a ride involves anything beyond walking
                to a sedan. A rideshare driver is not required to come to the door,
                wait through a discharge, secure a wheelchair, or sign a patient out
                after anesthesia — and most surgery centers will not release a
                sedated patient to one. Our drivers do all of that as the standard
                service, not an exception. That is the core of our{' '}
                <a href="/charlotte/post-surgery-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  post-surgery transport
                </a>{' '}
                and{' '}
                <a href="/charlotte/wheelchair-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  wheelchair transport
                </a>{' '}
                services.
              </p>
              <p>
                Recurring schedules are the other gap. Dialysis three times a week
                for years is a relationship, not a transaction — same pickup window,
                a driver who knows the routine, and a local dispatcher who answers
                the phone at 5 a.m. when plans change. For facilities, our SDVOSB
                certification also counts toward supplier-diversity goals, which the
                platforms can&rsquo;t offer — details on our{' '}
                <a href="/partners" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  partnerships page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'When to choose which',
          body: (
            <>
              <p>
                Choose Uber Health or Lyft Healthcare when the rider is fully
                ambulatory, low-acuity, and the priority is cost and on-demand
                speed — especially if your organization already books through a
                broker that integrates with them.
              </p>
              <p>
                Choose Tassy when the ride involves a mobility device, anesthesia or
                sedation, recurring treatment schedules, VA Community Care, a rider
                who needs door-through-door help, or a facility contract where
                accountability and a named local dispatcher matter.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Is Tassy more expensive than Uber Health or Lyft Healthcare?',
          a: 'For a simple ambulatory ride, rideshare is usually cheaper. For wheelchair, post-anesthesia, or recurring medical transport, you are comparing different services — ours includes trained drivers, door-through-door assistance, and scheduled reliability, and we quote the price up front.',
        },
        {
          q: 'Can Uber or Lyft transport a wheelchair user in Charlotte?',
          a: 'Both platforms offer wheelchair-accessible options only in select markets and availability varies. Tassy operates wheelchair-accessible vehicles with securement as a core service across Charlotte and Mecklenburg County.',
        },
        {
          q: 'Will a rideshare driver sign me out after surgery?',
          a: 'Generally no — rideshare drivers are not required to walk you in, wait, or act as your responsible escort, and many surgery centers will not discharge a sedated patient to one. Tassy recovery rides are built around exactly that requirement.',
        },
        {
          q: 'Does Tassy work with NEMT brokers like the big platforms do?',
          a: 'We serve riders through facility partnerships and broker arrangements as well as direct private-pay bookings. Call (704) 941-8508 and we will tell you how your specific ride can be covered.',
        },
        {
          q: 'Is this comparison up to date?',
          a: 'It reflects publicly available information as of the published date shown on this page (June 11, 2026). Platform capabilities change by market — verify current offerings with each provider.',
        },
      ]}
      relatedLinks={[
        { label: 'Charlotte NEMT rides', href: '/charlotte/nemt-rides' },
        { label: 'How to choose a NEMT provider', href: '/charlotte/best-nemt-providers' },
        { label: 'Wheelchair transport', href: '/charlotte/wheelchair-transport' },
        { label: 'Facility partnerships', href: '/partners' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
