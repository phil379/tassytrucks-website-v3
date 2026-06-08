import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { book, subscribe, apply } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'VIP Concierge — Charlotte plastic surgery & aesthetic recovery transport',
  description:
    "Charlotte's premium aesthetic-recovery transport: post-op plastic surgery, IV therapy, cosmetic dental, med-spa. Four tiers from $185 to $695. Branded amenities, total discretion.",
};

export default function VipPage() {
  return (
    <ServicePage
      eyebrow="Premium · Plastic Surgery + Aesthetic Recovery"
      title="Recovery in cashmere."
      tagline="A premium ride home from Charlotte's best surgeons & clinics."
      description="VIP Concierge is Tassy's signature service. Built for patients recovering from plastic surgery, cosmetic dental, IV therapy, and high-end aesthetic procedures. Four service tiers from Recovery Ride ($185) to Maximum Discretion ($695) — each with its own amenity kit, vehicle class, and driver training. Anchor partners include leading Charlotte clinics."
      bookHref={book.vip}
      bookLabel="Book a recovery ride"
      highlights={[
        {
          title: 'Four service tiers',
          body: 'Recovery $185 · Companion $285 · Premium $445 · Maximum $695. Pick the level of care the procedure requires — we handle everything from the curb up.',
        },
        {
          title: 'Branded amenity kits',
          body: 'Tassy-branded blankets, ginger candies, recovery snacks, hand cream, charging cables. Up to 27 items in the Maximum tier. Up to 50% perceived value uplift.',
        },
        {
          title: 'Discretion built in',
          body: 'Unmarked premium vehicles, privacy curtain option, NDA-trained drivers. Your patient walks out, gets home, and tells everyone about the ride — without anyone knowing what they had done.',
        },
      ]}
      tiers={[
        {
          name: 'Recovery Ride',
          price: '$185',
          features: ['Premium sedan', '7-item amenity kit', 'Door-to-curb', 'Same-day booking'],
          cta: { label: 'Book Recovery', href: book.vip },
        },
        {
          name: 'Companion Recovery',
          price: '$285',
          features: ['SUV or sedan', '13-item kit', 'Trained companion', 'Door-through-door'],
          cta: { label: 'Book Companion', href: book.vip },
        },
        {
          name: 'Premium Recovery',
          price: '$445',
          features: ['Luxury SUV', '21-item kit', 'Cashmere blanket', 'Aromatherapy + heated pack'],
          cta: { label: 'Book Premium', href: book.vip },
          highlight: true,
        },
        {
          name: 'Maximum Discretion',
          price: '$695',
          features: ['Black-car flagship', '27-item kit', 'Plush robe + slippers', 'Welcome candle + flowers'],
          cta: { label: 'Book Maximum', href: book.vip },
        },
      ]}
      partnerCta={{
        title: 'Subscribe & save — VIP Concierge passes',
        body: 'Companion Pass $95/mo · Concierge Pass $295/mo (most popular) · Recovery Pass $795/mo. Includes monthly credit, bonus amenities, and priority booking.',
        href: subscribe.vipConcierge,
        label: 'See subscription tiers',
      }}
    />
  );
}
