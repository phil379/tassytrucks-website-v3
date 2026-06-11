import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ServicePage from '@/components/ServicePage';
import PawIcon from '@/components/seo/PawIcon';
import { book, subscribe, apply } from '@/lib/saas-links';

const charlotteServices = [
  { href: '/charlotte/pet-transport', label: 'Pet transport in Charlotte', blurb: 'The full picture — vaccine checks, waivers, photos, trained drivers.' },
  { href: '/charlotte/vet-appointment-rides', label: 'Vet appointment rides', blurb: 'Your pet makes the appointment even when you can’t leave work.' },
  { href: '/charlotte/post-surgery-pet-transport', label: 'Post-surgery pet pickup', blurb: 'Sedation-aware rides home after spay, neuter, or dental procedures.' },
  { href: '/charlotte/calm-pet-transport', label: 'Calm pet transport', blurb: 'Built for anxious, reactive, and senior pets.' },
  { href: '/charlotte/dog-grooming-pickup', label: 'Dog grooming pickup', blurb: 'Same-day and standing weekly grooming runs.' },
  { href: '/charlotte/pet-boarding-transport', label: 'Pet boarding transport', blurb: 'Home to kennel and back, scheduled around your travel.' },
  { href: '/partners/veterinary', label: 'For veterinary clinics', blurb: 'Referral partnerships, vaccine-verified trips, net-30 billing.' },
];

export const metadata: Metadata = {
  title: 'Winnie Ride — Charlotte pet transport for vet, grooming, & travel',
  description:
    'Climate-controlled pet transport for vet visits, grooming, daycare, and airport. Carriers, harnesses, calming spray included. Three subscription tiers from $39/mo.',
};

export default function WinniePage() {
  return (
    <>
    <ServicePage
      eyebrow="Pet Transport · Vet, Travel, Daycare"
      title="Premium pet transport — they ride like family."
      tagline="Climate-controlled. Carrier-equipped. Calming and clean."
      description="Winnie Ride is Tassy's purpose-built pet transport service. Climate-controlled vehicles, sanitized carriers, safety harnesses, vet-safe calming spray, and treats — every ride. B2C for pet parents, B2B for veterinary clinics, groomers, and daycare facilities. Subscription tiers from $39/mo."
      bookHref={book.winnie}
      bookLabel="Book a pet ride"
      highlights={[
        {
          title: 'Vet-clinic certified',
          body: 'Drivers trained in pet handling. Carrier types matched to species & size. Sedation-aware protocols when needed.',
        },
        {
          title: 'Climate-controlled',
          body: 'Brachycephalic-safe temperatures. HEPA-filtered cabins. No more leaving Bella in a hot car after grooming.',
        },
        {
          title: 'B2B partnerships',
          body: 'Vet clinics, groomers, and daycares get a dedicated facility portal with multi-pet scheduling, recurring rides, and net-30 billing.',
        },
      ]}
      tiers={[
        {
          name: 'Starter (B2C)',
          price: '$39',
          cadence: 'mo',
          features: ['1 ride/mo included', 'Carrier + harness', 'Standard amenities', 'SMS booking'],
          cta: { label: 'Subscribe Starter', href: subscribe.winnieStarter },
        },
        {
          name: 'Standard (B2C)',
          price: '$89',
          cadence: 'mo',
          features: ['3 rides/mo', 'Quarterly framed pet photo', 'Priority scheduling', 'Multi-pet OK'],
          cta: { label: 'Subscribe Standard', href: subscribe.winnieStandard },
          highlight: true,
        },
        {
          name: 'Premium (B2C)',
          price: '$179',
          cadence: 'mo',
          features: ['6 rides/mo', 'Branded pet bed on signup', 'Monthly treat box', 'Airport-ready'],
          cta: { label: 'Subscribe Premium', href: subscribe.winniePremium },
        },
        {
          name: 'Facility (B2B)',
          price: '$395+',
          cadence: 'mo',
          features: ['Dedicated facility portal', 'Net-30 invoicing', 'Recurring multi-pet rides', 'Custom amenity kit'],
          cta: { label: 'See B2B tiers', href: subscribe.winnieB2BStandard },
        },
      ]}
      partnerCta={{
        title: 'Are you a vet, groomer, or daycare?',
        body: 'Add Winnie Ride to your client experience. Facility portal, contract rates, recurring scheduling, and Tassy-branded pet amenities for every client of yours.',
        href: apply.facility,
        label: 'Request partner portal',
      }}
    />

    {/* Charlotte Winnie cluster hub — sage accent, additive (MEGA_SEO_002 Phase 3) */}
    <section className="bg-surface border-t border-line">
      <div className="container-x py-16">
        <div className="flex items-center gap-2.5">
          <PawIcon size={22} />
          <div className="eyebrow">Charlotte Services</div>
        </div>
        <h2 className="h-section mt-3 max-w-2xl">
          Winnie Ride across Charlotte, by the trip you need.
        </h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {charlotteServices.map((s) => (
            <Link key={s.href} href={s.href} className="card-tile !p-6 group">
              <div className="h-1 w-10 bg-winnie-sage mb-4" />
              <h3 className="font-serif serif text-xl font-semibold group-hover:text-[#7C9A5C] transition-colors">
                {s.label}
              </h3>
              <p className="mt-2 text-sm ink-mute leading-relaxed">{s.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#7C9A5C]">
                Learn more <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
