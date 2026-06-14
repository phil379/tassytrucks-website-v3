import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { book, facilitySignup } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'NEMT — Charlotte medical transport',
  description:
    'Non-emergency medical transport in Charlotte NC. Dialysis, oncology, post-discharge. Medicaid + managed care contracts. SDVOSB-certified.',
};

export default function NemtPage() {
  return (
    <ServicePage
      eyebrow="Medical Transport · Contracted"
      title="NEMT, done right."
      tagline="Dialysis. Oncology. Post-discharge. We show up — every time."
      description="Non-Emergency Medical Transportation is Tassy's backbone. We hold contracts with Medicaid managed-care organizations, hospital discharge teams, and dialysis networks across the Charlotte metro. Drivers trained in patient handling. Vehicles equipped for ambulatory, wheelchair, and stretcher service."
      bookHref={book.nemt}
      bookLabel="Book a medical ride"
      highlights={[
        {
          title: 'Medicaid-contracted',
          body: 'Direct broker relationships with the major NC managed-care organizations. Eligible Medicaid members ride at no out-of-pocket cost.',
        },
        {
          title: 'Wheelchair + stretcher',
          body: 'Tie-down certified vehicles. Trained drivers. Door-through-door service for patients who need it.',
        },
        {
          title: 'On-time, every time',
          body: 'Real-time dispatch. SMS confirmations. Hospital discharge teams get a single point of contact, not a call center.',
        },
      ]}
      partnerCta={{
        title: "Are you a hospital, dialysis center, or managed-care plan?",
        body: 'Get your facility on Tassy in 60 seconds — no credit card. Create a provisional account, add your roster, and a coordinator calls within 24 hours to activate dispatch.',
        href: facilitySignup('hospital'),
        label: 'Get started · no credit card',
      }}
    />
  );
}
