import type { Metadata } from 'next';
import { Check, Minus } from 'lucide-react';
import LandingPageShell from '@/components/seo/LandingPageShell';
import PawIcon from '@/components/seo/PawIcon';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Winnie Ride vs Uber Pet vs Lyft Pet — Compared',
  description:
    'Honest Charlotte pet transport comparison: vaccine checks, liability waivers, sedated pets, unaccompanied rides. Where rideshare works and where it does not.',
  alternates: { canonical: '/compare/winnie-vs-uber-pet-vs-lyft-pet' },
  openGraph: { images: ['/og-image/winnie-vs-uber-pet-vs-lyft-pet'] },
};

const CTA_HREF = seoBook('winnie', { source: 'seo-compare-pet' });

const yes = <Check size={18} className="inline" style={{ color: '#7C9A5C' }} aria-label="Yes" />;
const no = <Minus size={18} className="inline opacity-40" aria-label="No" />;

type Row = { label: string; winnie: React.ReactNode; uber: React.ReactNode; lyft: React.ReactNode };

const rows: Row[] = [
  { label: 'Vaccine verification before the ride', winnie: <>{yes} Rabies + core vaccines</>, uber: no, lyft: no },
  { label: 'Signed liability waiver', winnie: <>{yes} Every trip</>, uber: no, lyft: no },
  { label: 'Photo at pickup', winnie: <>{yes} Every trip</>, uber: no, lyft: no },
  {
    label: 'Driver pet-handling training',
    winnie: <>{yes} Carrier handling + sedation-aware</>,
    uber: 'Standard rideshare drivers',
    lyft: 'Standard rideshare drivers',
  },
  {
    label: 'Sedated / post-op pets accepted',
    winnie: <>{yes} With carrier + vet instructions</>,
    uber: 'Not designed for this',
    lyft: 'Not designed for this',
  },
  {
    label: 'Carrier guidance',
    winnie: 'Required for cats and small dogs; guidance at booking',
    uber: 'Rider’s responsibility',
    lyft: 'Rider’s responsibility',
  },
  { label: 'Pet rides without the owner in the car', winnie: <>{yes} Our core service</>, uber: 'No — you ride along', lyft: 'No — you ride along' },
  { label: 'Recurring scheduling', winnie: <>{yes} Weekly grooming, chronic care</>, uber: no, lyft: no },
  {
    label: 'Same-day booking',
    winnie: 'When vehicles are available (2-hr lead on routine rides)',
    uber: 'On-demand',
    lyft: 'On-demand, select cities',
  },
  {
    label: 'Service area',
    winnie: 'Charlotte + Mecklenburg + surrounding towns',
    uber: 'Most major markets',
    lyft: 'Select cities',
  },
  {
    label: 'Cost transparency',
    winnie: 'Quoted up front; subscriptions from $39/mo',
    uber: 'Metered fare + pet fee',
    lyft: 'Metered fare + pet fee',
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
          Uber Pet and Lyft Pets policies vary by city — verify current rules in the
          respective apps.
        </p>
        <div className="mt-8 overflow-x-auto" data-testid="comparison-table">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr className="text-left border-b-2 border-[color:var(--ink)]">
                <th className="py-3 pr-4 font-semibold"> </th>
                <th className="py-3 pr-4 font-semibold">Winnie Ride</th>
                <th className="py-3 pr-4 font-semibold">Uber Pet</th>
                <th className="py-3 font-semibold">Lyft Pets</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-line align-top">
                  <td className="py-3.5 pr-4 font-medium">{r.label}</td>
                  <td className="py-3.5 pr-4 ink-soft">{r.winnie}</td>
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

export default function WinnieComparePage() {
  return (
    <LandingPageShell
      primaryKeyword="winnie ride vs uber pet vs lyft pet"
      eyebrow="Comparison · Charlotte Pet Transport"
      heroIcon={<PawIcon />}
      accent="sage"
      trustExtras={['Vaccine-verified trips', 'Liability-covered', 'Charlotte-based']}
      h1="Winnie Ride vs Uber Pet vs Lyft Pet — Charlotte Pet Transport Compared"
      heroSubtitle="The honest version: when a rideshare pet option is fine, and when your pet needs a service built for pets."
      quickAnswer="Uber Pet and Lyft Pets let you bring your pet along on your own ride for an added fee — good for quick trips with a calm, well-socialized dog when you're in the car too. Winnie Ride is a dedicated Charlotte pet transport service that moves your pet when you can't be there, with vaccine verification, a signed liability waiver, a photo at pickup, and drivers trained on carrier handling."
      ctaText="Book a pet ride"
      ctaHref={CTA_HREF}
      schemaServiceType="Pet Transportation"
      publishedDate="June 11, 2026"
      beforeFaq={<ComparisonTable />}
      sections={[
        {
          h2: 'The fundamental difference: who is in the car',
          body: (
            <>
              <p>
                Uber Pet and Lyft Pets are options on your own ride — you book a
                trip for yourself and pay an extra fee to bring your pet along.
                Neither platform transports unaccompanied pets. If you can&rsquo;t
                leave work to get your dog to the groomer, a rideshare pet option
                doesn&rsquo;t solve your problem at all.
              </p>
              <p>
                Winnie Ride, the pet transport vertical of Charlotte-based Tassy
                Trucks, is built for exactly that gap: we pick your pet up, drive
                them where they need to go, and send you a photo at pickup so you
                know they&rsquo;re safe. See{' '}
                <a href="/charlotte/pet-transport" className="underline underline-offset-2" style={{ textDecorationColor: '#7C9A5C' }}>
                  how our pet transport works
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'Where Uber Pet and Lyft Pets win',
          body: (
            <>
              <p>
                If you are riding anyway, the trip is short, and your dog is calm,
                crate-trained or seatbelt-comfortable, the rideshare pet options are
                cheap and instant. A car is minutes away in most of Charlotte, and
                for a quick run to the park with a well-socialized dog, that
                convenience is real.
              </p>
              <p>
                They are also the only sensible option outside our service area —
                we cover Charlotte, Mecklenburg County, and the surrounding towns
                like Matthews, Huntersville, and Concord, while the platforms cover
                most major markets.
              </p>
            </>
          ),
        },
        {
          h2: 'Where Winnie Ride wins',
          body: (
            <>
              <p>
                Everything that makes pet transport genuinely safe is on our side
                of the table. We verify rabies and core vaccines before every ride —
                rideshare drivers don&rsquo;t check anything. Every owner signs a
                liability waiver that protects both sides — the platforms have no
                pet-specific equivalent. Our drivers are trained on carrier handling
                and sedation-aware protocols, which matters enormously for{' '}
                <a href="/charlotte/post-surgery-pet-transport" className="underline underline-offset-2" style={{ textDecorationColor: '#7C9A5C' }}>
                  post-surgery pickups
                </a>{' '}
                and{' '}
                <a href="/charlotte/calm-pet-transport" className="underline underline-offset-2" style={{ textDecorationColor: '#7C9A5C' }}>
                  anxious or reactive pets
                </a>{' '}
                a rideshare driver can simply cancel on.
              </p>
              <p>
                And because we&rsquo;re a direct service rather than a marketplace,
                you get recurring scheduling — the same Tuesday grooming run every
                week — and a Charlotte dispatch line at (704) 941-8508 where a
                person answers.
              </p>
            </>
          ),
        },
        {
          h2: 'When to choose which',
          body: (
            <>
              <p>
                Choose Uber Pet or Lyft Pets when you are riding along, the trip is
                short and low-stakes, and your dog handles car rides easily.
              </p>
              <p>
                Choose Winnie Ride when your pet travels without you, has a vet or
                grooming appointment you can&rsquo;t make, is recovering from a
                procedure, is anxious, reactive, or senior, or needs a standing
                weekly ride. For veterinary clinics and boarding facilities, our{' '}
                <a href="/partners/veterinary" className="underline underline-offset-2" style={{ textDecorationColor: '#7C9A5C' }}>
                  partnership program
                </a>{' '}
                adds referral codes and net-30 billing.
              </p>
            </>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Can Uber or Lyft transport my dog without me in the car?',
          a: 'No. Uber Pet and Lyft Pets are add-ons to your own ride — both platforms require you to accompany your pet. Winnie Ride transports pets unaccompanied as its core service.',
        },
        {
          q: 'Is Winnie Ride more expensive than Uber Pet?',
          a: 'For a short ride where you are in the car anyway, yes — rideshare is cheaper. You are paying for a different service: vaccine verification, a trained driver, a signed waiver, a pickup photo, and a pet that travels safely without you. Subscriptions from $39/mo bring per-ride costs down for regulars.',
        },
        {
          q: 'Why does vaccine verification matter for a car ride?',
          a: 'It protects your pet and every pet that rides after them, and it is why veterinary clinics and boarding facilities are comfortable referring us. We verify rabies for all pets and core vaccines (DAPP for dogs, FVRCP for cats) before every trip.',
        },
        {
          q: 'Can Winnie Ride take a sedated pet home after surgery?',
          a: 'Yes — with a carrier and your vet’s discharge instructions. Drivers follow sedation-aware protocols. This is one of the clearest gaps between a dedicated pet service and a rideshare option.',
        },
        {
          q: 'Is this comparison up to date?',
          a: 'It reflects publicly available information as of the published date on this page (June 11, 2026). Uber Pet and Lyft Pets policies and availability vary by city and change over time — check the apps for current rules.',
        },
      ]}
      relatedLinks={[
        { label: 'Pet transport Charlotte', href: '/charlotte/pet-transport' },
        { label: 'Post-surgery pet transport', href: '/charlotte/post-surgery-pet-transport' },
        { label: 'Calm pet transport', href: '/charlotte/calm-pet-transport' },
        { label: 'Veterinary partnerships', href: '/partners/veterinary' },
        { label: 'Winnie Ride overview', href: '/winnie' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
