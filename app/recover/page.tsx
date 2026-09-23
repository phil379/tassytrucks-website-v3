import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { subscribe, facilitySignup } from '@/lib/saas-links';
import { request } from '@/lib/request-links';

export const metadata: Metadata = {
  title: 'Tassy Guardian — oncology & recovery transport',
  description:
    'CNA-trained drivers for oncology, chemo, radiation, and hospital-discharge transport in Charlotte NC. Quiet cabin, recovery amenities, dignity-first care.',
  alternates: { canonical: '/recover' },
  openGraph: { url: '/recover', images: ['/og-image/recover'] },
};

export default function RecoverPage() {
  return (
    <ServicePage
      eyebrow="Oncology · Chemo + Radiation + Discharge"
      title="Recovery transport with the dignity it deserves."
      tagline="CNA-trained drivers. Quiet cabin. Family-grade care."
      description="Tassy Guardian is built for oncology patients, chemo/radiation recurrences, and hospital discharges where the standard ride-share or NEMT isn't enough. Drivers are CNA-trained. Vehicles are quieted and equipped for nausea management. Every ride includes a recovery amenity kit. Anchor partners include major Charlotte cancer centers."
      bookHref={request.recover}
      bookLabel="Request recovery transport"
      serviceName="Tassy Guardian — Oncology & Recovery Transport"
      path="/recover"
      highlightsHeading="Oncology & recovery transport in Charlotte NC"
      highlights={[
        {
          title: 'CNA-trained drivers',
          body: 'Drivers credentialed at the CNA level. They know how to help a patient who feels nauseous, weak, or in pain — without being intrusive.',
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
          name: 'Guardian Essential',
          price: '$185',
          features: ['Single ride', 'Recovery kit', 'CNA driver', 'Door-through-door'],
          cta: { label: 'Request Essential', href: request.recover },
        },
        {
          name: 'Guardian Signature',
          price: '$595',
          cadence: 'mo',
          features: ['4 rides/mo', 'CNA driver option', 'Premium amenities', 'Family notifications'],
          cta: { label: 'Subscribe Signature', href: subscribe.recoverSignature },
          highlight: true,
        },
        {
          name: 'Guardian Elite',
          price: '$1,295',
          cadence: 'mo',
          features: ['Unlimited rides', 'Dedicated CNA driver', 'Caregiver companion', 'Full coordination'],
          cta: { label: 'Subscribe Elite', href: subscribe.recoverElite },
        },
      ]}
      partnerCta={{
        title: 'Are you a cancer center, oncology practice, or discharge team?',
        body: "We're SDVOSB, HIPAA-aware, and built to integrate with your discharge workflow. Let's talk about adding Tassy Guardian to your patient transport program.",
        href: facilitySignup('clinic'),
        label: 'Get started · no credit card',
      }}
    />
  );
}
