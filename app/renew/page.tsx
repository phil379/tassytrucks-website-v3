import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { book, subscribe, facilitySignup } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Tassy Renew — Charlotte wellness, IV therapy & med-spa transport',
  description:
    'Premium transport for IV therapy clinics, med-spas, and rejuvenation appointments. Hydration kit included. Wellness-tier subscriptions available.',
};

export default function RenewPage() {
  return (
    <ServicePage
      eyebrow="Wellness · IV Therapy + Med-Spa + Rejuvenation"
      title="The transport your wellness routine deserves."
      tagline="IV therapy. Med-spa. Cryotherapy. Cosmetic dental. We get you there and back, refreshed."
      description="Tassy Renew is the wellness-focused arm of our premium fleet. Built for the customer who's invested in their longevity — IV drips, hyperbaric, rejuvenation, and aesthetic maintenance. Every ride includes a hydration recovery kit and the same premium fleet as VIP Concierge."
      bookHref={book.renew}
      bookLabel="Book a wellness ride"
      highlights={[
        {
          title: 'Hydration recovery kit',
          body: 'Every Renew ride includes electrolytes, snack, hand cream, and a Tassy-branded water bottle. The post-IV ride home is part of the experience.',
        },
        {
          title: 'Med-spa partnerships',
          body: 'We have direct relationships with Charlotte\'s leading med-spas and IV therapy clinics. Bundle transport into their treatment package.',
        },
        {
          title: 'Recurring memberships',
          body: 'Most Renew customers book 2-4x per month. Subscription tiers turn that into predictable, discounted recurring rides.',
        },
      ]}
      tiers={[
        {
          name: 'Renew Essential',
          price: '$149',
          cadence: 'mo',
          features: ['2 rides included', 'Hydration kit', 'Premium sedan', 'Same-day booking'],
          cta: { label: 'Subscribe Essential', href: subscribe.renewEssential },
        },
        {
          name: 'Renew Signature',
          price: '$295',
          cadence: 'mo',
          features: ['4 rides included', 'Premium SUV option', 'Aromatherapy add-on', 'Priority scheduling'],
          cta: { label: 'Subscribe Signature', href: subscribe.renewSignature },
          highlight: true,
        },
        {
          name: 'Renew Elite',
          price: '$495',
          cadence: 'mo',
          features: ['Unlimited rides', 'Luxury fleet', 'Spa-day add-on', 'Dedicated coordinator'],
          cta: { label: 'Subscribe Elite', href: subscribe.renewElite },
        },
      ]}
      partnerCta={{
        title: 'Are you a med-spa, IV clinic, or wellness practice?',
        body: 'Bundle Tassy Renew with your treatment packages. Facility portal, white-label voucher codes, and patient-experience uplift built in.',
        href: facilitySignup('clinic'),
        label: 'Get started · no credit card',
      }}
    />
  );
}
