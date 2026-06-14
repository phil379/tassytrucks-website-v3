import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { book, subscribe, facilitySignup } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Tassy Recover — Charlotte oncology, chemo & recovery transport',
  description:
    'CNA/LPN driver model for oncology, chemo, radiation, and hospital discharge transport. Quiet cabin, recovery amenities, dignity-first care.',
};

export default function RecoverPage() {
  return (
    <ServicePage
      eyebrow="Oncology · Chemo + Radiation + Discharge"
      title="Recovery transport with the dignity it deserves."
      tagline="CNA/LPN drivers. Quiet cabin. Family-grade care."
      description="Tassy Recover is built for oncology patients, chemo/radiation recurrences, and hospital discharges where the standard ride-share or NEMT isn't enough. Drivers are CNA or LPN trained. Vehicles are quieted and equipped for nausea management. Every ride includes a recovery amenity kit. Anchor partners include major Charlotte cancer centers."
      bookHref={book.recover}
      bookLabel="Book recovery transport"
      highlights={[
        {
          title: 'CNA / LPN drivers',
          body: 'Drivers credentialed at the CNA or LPN level. They know how to help a patient who feels nauseous, weak, or in pain — without being intrusive.',
        },
        {
          title: 'Quiet, equipped cabin',
          body: 'Soft seats, climate-balanced, ginger candies, emesis bags discreetly available, blanket warmed. No phone calls, no questions — just care.',
        },
        {
          title: 'Hospital discharge protocol',
          body: 'Direct intake from oncology coordinators. We pick up at the chemo chair, get the patient home, and notify family on arrival.',
        },
      ]}
      tiers={[
        {
          name: 'Recover Essential',
          price: '$185',
          features: ['Single ride', 'Recovery kit', 'CNA driver', 'Door-through-door'],
          cta: { label: 'Book Essential', href: book.recover },
        },
        {
          name: 'Recover Signature',
          price: '$595',
          cadence: 'mo',
          features: ['4 rides/mo', 'LPN driver option', 'Premium amenities', 'Family notifications'],
          cta: { label: 'Subscribe Signature', href: subscribe.recoverSignature },
          highlight: true,
        },
        {
          name: 'Recover Elite',
          price: '$1,295',
          cadence: 'mo',
          features: ['Unlimited rides', 'Dedicated LPN driver', 'Caregiver companion', 'Full coordination'],
          cta: { label: 'Subscribe Elite', href: subscribe.recoverElite },
        },
      ]}
      partnerCta={{
        title: 'Are you a cancer center, oncology practice, or discharge team?',
        body: "We're SDVOSB, HIPAA-aware, and built to integrate with your discharge workflow. Let's talk about adding Tassy Recover to your patient transport program.",
        href: facilitySignup('clinic'),
        label: 'Get started · no credit card',
      }}
    />
  );
}
