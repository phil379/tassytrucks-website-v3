import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { CARE } from '@/lib/quote';
import { applyDiscount } from '@/lib/discounts';
import { request } from '@/lib/request-links';

/**
 * PREVIEW ONLY. Not linked from anywhere, not in the sitemap, and noindex.
 * Phil reads this to approve the wording; nothing here can be redeemed today.
 *
 * The program rules live in the TassyOps/Supabase discount_programs table (both rows are switched OFF) and in
 * lib/discounts.ts. The percentage and the weekday are repeated here as words, so if either ever changes, change
 * COMMUNITY_RATE below and the table together.
 *
 * Release gates before this goes public (Phil, Oct 15-16): counsel, CPA, commercial insurance and dispatchable
 * drivers, a working verification vendor, margin approval, final copy. Until the vendor is live this page must
 * never say a rider is "verified by" any named company.
 */
const COMMUNITY_RATE = {
  pct: 5,
  seniorAge: 70,
  seniorDay: 'Tuesday',
} as const;

export const metadata: Metadata = {
  title: 'Veteran Rate and Senior Day (preview) | Tassy Transportation',
  description: 'Preview of the Tassy Community Rate: 5% off for veterans every day and for riders 70 and over every Tuesday.',
  robots: { index: false, follow: false },
};

/** Exact cents, because the discount is not a whole number of dollars ($4.45, not $4). */
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// A real fare from the published Care card, so the example can never drift from the price list.
const EXAMPLE_LIST = CARE.bands[3].cents;
const EXAMPLE = applyDiscount(EXAMPLE_LIST, COMMUNITY_RATE.pct);

export default function CommunityRatePage() {
  return (
    <>
      <div className="bg-gold/15 border-b border-gold/40">
        <p className="container-x py-3 text-sm font-medium text-cream-text">
          PREVIEW for approval. This page is not public, and the discounts cannot be used yet.
        </p>
      </div>
      <ServicePage
        eyebrow="Community Rate"
        title="Veteran Rate and Senior Day."
        tagline={`${COMMUNITY_RATE.pct}% off the fare. Same flat price, same driver standard.`}
        description={`Two ways to take ${COMMUNITY_RATE.pct}% off a Tassy ride. Veterans get it every day. Riders ${COMMUNITY_RATE.seniorAge} and over get it every ${COMMUNITY_RATE.seniorDay}. It is one discount at a time, so a veteran who is ${COMMUNITY_RATE.seniorAge}+ gets ${COMMUNITY_RATE.pct}% on a ${COMMUNITY_RATE.seniorDay}, not ${COMMUNITY_RATE.pct * 2}%. On a ${usd(EXAMPLE_LIST)} Care ride that is ${usd(EXAMPLE.discountCents)} off, ${usd(EXAMPLE.agreedCents)} to pay.`}
        bookHref={request.nemt}
        bookLabel="Book a ride"
        altCta={{ href: 'tel:+17049418508', label: 'Call (704) 941-8508' }}
        highlightsHeading="How the Community Rate works"
        highlights={[
          {
            title: `Veteran Rate: ${COMMUNITY_RATE.pct}% off, every day`,
            body: `For veterans on Tassy Care, Tassy Recovery and Winnie Ride, any day of the week. Tassy is a service-disabled veteran-owned company, so this one is personal.`,
          },
          {
            title: `Senior Day: ${COMMUNITY_RATE.pct}% off every ${COMMUNITY_RATE.seniorDay}`,
            body: `For riders ${COMMUNITY_RATE.seniorAge} and over on Tassy Care and Tassy Recovery. The day is set by your pickup date, so a ${COMMUNITY_RATE.seniorDay} appointment is a ${COMMUNITY_RATE.seniorDay} discount.`,
          },
          {
            title: 'One quick check, once',
            body: 'We confirm you qualify with a one-time check online, never at the curb and never by asking your driver. We keep only that you were verified, the date, and a reference number. We do not keep your ID, your photo, your Social Security number or your discharge papers.',
          },
          {
            title: 'Not verified yet? You still ride.',
            body: 'Book at the regular price any time. After you book we text you a link to verify, so you can save 5% on rides after that.',
          },
          {
            title: 'What it does not cover',
            body: 'Concierge, Tassy Scholar and wheelchair-van rides are priced separately, and so are rides billed to a facility or a program. The discount never stacks with another one.',
          },
          {
            title: 'Riding often?',
            body: 'A standing weekly ride is on the Standing Ride Plan, 15% off. The best single discount applies, so you are never charged more by asking.',
          },
        ]}
      />
    </>
  );
}
