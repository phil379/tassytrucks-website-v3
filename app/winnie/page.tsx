import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { book, subscribe, apply } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Winnie Ride — Charlotte pet transport for vet, grooming, & travel',
  description:
    'Climate-controlled pet transport for vet visits, grooming, daycare, and airport. Carriers, harnesses, calming spray included. Three subscription tiers from $39/mo.',
};

export default function WinniePage() {
  return (
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
  );
}
