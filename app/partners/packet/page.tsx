import type { Metadata } from 'next';
import ServicePage from '@/components/ServicePage';
import { CARE, RECOVERY } from '@/lib/quote';
import { partnerSignup } from '@/lib/partner-links';

/**
 * PARTNER PACKET (draft for Phil's approval). Not linked from anywhere, not in the sitemap, noindex.
 *
 * It is the page a sales rep sends instead of a PDF: prices that cannot drift from the price list
 * (they are read from lib/quote.ts), how a request works, and what a facility gets each month.
 *
 * Deliberately NOT on this page until the matching gate clears: any insurance or coverage claim
 * (commercial auto is not bound), any discount or free-ride offer (counsel gate G10), any named
 * verification vendor, and any rep pay. The sign-up link keeps the rep's credit via ?rep= and ?src=.
 */
export const metadata: Metadata = {
  title: 'Partner Packet (draft) | Tassy Transportation',
  description: 'Draft partner packet for Charlotte facilities: flat prices, how to request a ride, and the monthly report.',
  robots: { index: false, follow: false },
};

const usd = (cents: number) => `$${(cents / 100).toFixed(0)}`;
const careFrom = CARE.bands[0].cents;
const careTo = CARE.bands[CARE.bands.length - 1].cents;
const recFrom = RECOVERY.bands[0].cents;
const recTo = RECOVERY.bands[RECOVERY.bands.length - 1].cents;

export default function PartnerPacketPage() {
  return (
    <>
      <div className="bg-gold/15 border-b border-gold/40">
        <p className="container-x py-3 text-sm font-medium text-cream-text">
          DRAFT for approval. This page is not public yet.
        </p>
      </div>
      <ServicePage
        eyebrow="Partner packet"
        title="One number to call. One page to book. One statement."
        tagline="Reliable rides for your patients and residents, priced flat before they go."
        description={`Tassy Transportation is a Charlotte, NC service-disabled veteran-owned company. Tassy Care rides are flat by distance, from ${usd(careFrom)} to ${usd(careTo)}. Tassy Recovery, the ride home after a procedure, is flat from ${usd(recFrom)} to ${usd(recTo)} and already includes the return. You see the price before the ride is booked.`}
        bookHref={partnerSignup({ source: 'partner-packet' })}
        bookLabel="Set up your facility account"
        altCta={{ href: 'tel:+17049418508', label: 'Call (704) 941-8508' }}
        highlightsHeading="What working with Tassy looks like"
        highlights={[
          {
            title: 'Flat prices, quoted up front',
            body: `Tassy Care is ${usd(careFrom)} to ${usd(careTo)} by distance. Tassy Recovery is ${usd(recFrom)} to ${usd(recTo)} by distance and covers the trip home. Late-night, weekend and holiday rides carry a published surcharge, and you see it in the quote.`,
          },
          {
            title: 'Request a ride in under a minute',
            body: 'Your staff send a request from your facility page, or call dispatch. We confirm the time and price, and you get a confirmation number to give the patient or family.',
          },
          {
            title: 'A monthly report you can file',
            body: 'Every ride, every date, every price, on one statement. Billing to your facility is set up on your account, so patients are not handed a payment link at the curb.',
          },
          {
            title: 'Messages in one place',
            body: 'Change a pickup time or ask where a driver is from your facility page. Dispatch answers there and by email.',
          },
          {
            title: 'Privacy by design',
            body: 'Keep requests to logistics: names, times, addresses and mobility needs. Please leave out diagnoses, procedures and record numbers.',
          },
          {
            title: 'Start with one ride',
            body: 'Create the account, send one request, and see how it goes.',
          },
        ]}
      />
    </>
  );
}
