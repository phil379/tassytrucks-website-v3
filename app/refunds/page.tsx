import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { CANCELLATION, REFUND_POLICY_UPDATED } from '@/lib/refund-policy';
import { BUSINESS, businessIdentityLine } from '@/lib/business';

export const metadata: Metadata = {
  title: 'Cancellations & Refunds',
  description:
    'When you can cancel a Tassy Transportation trip for free, what a late cancellation or no-show costs, and how refunds work.',
  alternates: { canonical: '/refunds' },
  robots: { index: true, follow: true },
};

const T = CANCELLATION;

const cell = 'border border-line px-3 py-2 align-top text-sm';

export default function RefundsPage() {
  return (
    <LegalPage
      title="Cancellations & Refunds"
      updated={REFUND_POLICY_UPDATED}
      intro={
        <>
          <p>
            Plans change, especially around medical appointments. This page says what it costs to
            cancel, what a no-show is, and when you get your money back. It sits alongside our{' '}
            <Link href="/terms" className="underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </>
      }
      sections={[
        {
          id: 'how-payment-works',
          heading: 'How payment works',
          children: (
            <>
              <p>
                You see an estimated price when you ask for a ride. Nothing is charged then. A
                dispatcher reviews your request and confirms the price and your driver. After that
                we send you one payment link for the confirmed amount. If anything about the trip
                changes, you hear the new price from us before you pay.
              </p>
            </>
          ),
        },
        {
          id: 'cancelling',
          heading: 'Cancelling a trip',
          children: (
            <>
              <p>
                Call us on {BUSINESS.phoneDisplay} or email {BUSINESS.bookingEmail}. Say your name and
                the pickup time, and we will take it from there.
              </p>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Cancellation and refund rules by service">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${cell} text-left`} scope="col">Service</th>
                      <th className={`${cell} text-left`} scope="col">Free to cancel</th>
                      <th className={`${cell} text-left`} scope="col">Late cancellation</th>
                      <th className={`${cell} text-left`} scope="col">No-show</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th className={`${cell} text-left font-medium`} scope="row">
                        Tassy Care, Tassy Concierge, Tassy Recovery, Winnie Ride
                      </th>
                      <td className={cell}>Up to {T.trip.freeUntilHoursBefore} hours before pickup</td>
                      <td className={cell}>{T.trip.lateCancelFeePercent}% of the trip price</td>
                      <td className={cell}>{T.trip.noShowFeePercent}% of the trip price</td>
                    </tr>
                    <tr>
                      <th className={`${cell} text-left font-medium`} scope="row">
                        Tassy Care Treatment Day (round trip, one flat price)
                      </th>
                      <td className={cell}>Up to {T.treatmentDay.freeUntilHoursBefore} hours before pickup</td>
                      <td className={cell}>{T.treatmentDay.lateCancelFeePercent}% of the flat fare</td>
                      <td className={cell}>{T.treatmentDay.noShowFeePercent}% of the flat fare</td>
                    </tr>
                    <tr>
                      <th className={`${cell} text-left font-medium`} scope="row">
                        Tassy Scholar, billed per ride (Weekly Pattern, After-School)
                      </th>
                      <td className={cell}>Up to {T.scholarPerRide.freeUntilHoursBefore} hours before pickup</td>
                      <td className={cell}>Charged as {T.scholarPerRide.lateCancelOrNoShowRides} ride</td>
                      <td className={cell}>Charged as {T.scholarPerRide.lateCancelOrNoShowRides} ride</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                A <strong>late cancellation</strong> is a cancellation after the free window above
                but before your driver is on the way. A <strong>no-show</strong> is when your driver
                arrives for the pickup and cannot find you or reach you by phone or text, or you
                cancel after the driver has arrived.
              </p>
              <p>
                If you have already paid and you cancel inside the free window, you get all of it
                back. If you have already paid and you cancel late, we keep the fee above and refund
                the rest. The fee is a share of the price you were quoted, which includes any
                after-hours, weekend or holiday charge that was shown to you before you confirmed.
              </p>
              <p>
                We may waive a fee case by case, for example for a sudden hospital admission. Just
                tell us.
              </p>
            </>
          ),
        },
        {
          id: 'scholar-monthly',
          heading: 'Tassy Scholar, monthly plan',
          children: (
            <>
              <p>
                The Full School Year plan is billed monthly. If you cancel it, the plan stops at the
                end of the month you have already paid for. We do not refund part of a month. If a
                ride in that month is one we cannot cover, we will tell you and fix it with you.
                Sick children stay home with no penalty, because the seat is held for the month.
              </p>
              <p>
                Refunds for school plans are reviewed one at a time. Email {BUSINESS.bookingEmail}{' '}
                and tell us what happened.
              </p>
            </>
          ),
        },
        {
          id: 'we-cancel',
          heading: 'If we cancel, or we cannot send a driver',
          children: (
            <p>
              If Tassy cancels a trip, or no driver is available for your pickup, you get a full
              refund. You do not have to ask, and you are never charged a fee. We will call or text
              you as early as we can so you can make other plans.
            </p>
          ),
        },
        {
          id: 'refund-timing',
          heading: 'How refunds are paid',
          children: (
            <p>
              Refunds go back to the card you paid with. We start a refund within{' '}
              {CANCELLATION.refundStartBusinessDays} business days of agreeing it. After that, how
              long it takes to show on your statement depends on your bank, and is usually a few
              more business days.
            </p>
          ),
        },
        {
          id: 'other-charges',
          heading: 'Waiting time, tolls and other charges',
          children: (
            <p>
              Waiting time beyond what is included, and tolls, are quoted to you before they are
              charged. See <Link href="/pricing" className="underline">Pricing</Link> for what is
              included and what can change a price.
            </p>
          ),
        },
        {
          id: 'questions',
          heading: 'Questions or a disagreement',
          children: (
            <p>
              If you think a charge is wrong, contact us first at {BUSINESS.bookingEmail} or{' '}
              {BUSINESS.phoneDisplay}. We read every message and will answer within a few business
              days. {businessIdentityLine()}.
            </p>
          ),
        },
      ]}
    />
  );
}
