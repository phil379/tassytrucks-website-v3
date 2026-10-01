import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { request } from '@/lib/request-links';
import {
  CARE, CARE_WAV, CONCIERGE as CONCIERGE_CARD, RECOVERY, WINNIE as WINNIE_CARD,
  bandLabel, overBandLabel, roundTripCents, dollars,
} from '@/lib/quote';
import { SCHOOL_PLANS, SIBLING_NOTE } from '@/lib/school-plans';

export const metadata: Metadata = {
  title: 'Pricing — flat rates by distance | Tassy Transportation Charlotte',
  description:
    'Charlotte medical, pet and premium transport priced by distance, not by meter. Tassy Care from $49, Recovery from $129, Concierge from $89, Winnie Ride from $59. No surge.',
  alternates: { canonical: '/pricing' },
  openGraph: { url: '/pricing', images: ['/og-image/pricing'] },
};

type Row = { band: string; a: string; b: string };

function RateTable({
  heading,
  note,
  colA,
  colASub,
  colB,
  colBSub,
  rows,
  href,
  cta,
}: {
  heading: string;
  note: string;
  colA: string;
  colASub: string;
  colB: string;
  colBSub: string;
  rows: Row[];
  href: string;
  cta: string;
}) {
  return (
    <div className="card-tile !p-0 overflow-hidden">
      <div className="p-6 pb-4">
        <h3 className="serif text-2xl font-semibold">{heading}</h3>
        <p className="ink-soft mt-2 text-sm leading-relaxed">{note}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-charcoal text-white">
            <th scope="col" className="text-left px-6 py-3 font-semibold">
              Distance
            </th>
            <th scope="col" className="text-right px-4 py-3 font-semibold">
              {colA}
              <span className="block font-normal text-[color:var(--gold)] text-[11px]">
                {colASub}
              </span>
            </th>
            <th scope="col" className="text-right px-6 py-3 font-semibold">
              {colB}
              <span className="block font-normal text-[color:var(--gold)] text-[11px]">
                {colBSub}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.band} className="border-b border-line last:border-0">
              <td className="px-6 py-2.5">{r.band}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r.a}</td>
              <td className="px-6 py-2.5 text-right font-semibold tabular-nums">{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-6 pt-4">
        <Link href={href} className="btn-gold inline-flex items-center gap-2">
          {cta} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/**
 * DERIVED, not typed. These tables were hand-written copies of the rate cards
 * until 2026-09-30, when Winnie was repriced in lib/quote.ts and this page kept
 * advertising the old fare — the engine said $69, the pricing page said $49,
 * and the pricing page is the one the customer reads. Two sources of truth for
 * a price is not a style problem; it is a promise the business cannot keep.
 *
 * Everything below now comes from the cards. Reprice in lib/quote.ts and this
 * page follows on the next build.
 */

/** Two cards side by side, sharing a band structure (Care one-way vs Recovery). */
function pairRows(a: typeof CARE, b: typeof RECOVERY): Row[] {
  const rows: Row[] = a.bands.map((band, i) => ({
    band: bandLabel(a.bands, i),
    a: dollars(band.cents),
    b: b.bands[i] ? dollars(b.bands[i].cents) : 'Call us',
  }));
  rows.push({ band: overBandLabel(a.bands), a: 'Call us', b: 'Call us' });
  return rows;
}

/** One card, one way beside its own return price. */
function returnRows(card: typeof CONCIERGE_CARD): Row[] {
  const rows: Row[] = card.bands.map((band, i) => ({
    band: bandLabel(card.bands, i),
    a: dollars(band.cents),
    b: dollars(roundTripCents(card, band.cents)),
  }));
  rows.push({ band: overBandLabel(card.bands), a: 'Call us', b: 'Call us' });
  return rows;
}

const MEDICAL: Row[] = pairRows(CARE, RECOVERY);
const CONCIERGE: Row[] = returnRows(CONCIERGE_CARD);
const WINNIE: Row[] = returnRows(WINNIE_CARD);
const WAV: Row[] = returnRows(CARE_WAV);

const PLANS = [
  {
    name: 'Standing Ride Plan',
    save: '15% off',
    body: 'Your standing appointment, the same driver at the same time every week. Minimum eight legs a month, billed monthly, priority over one-off bookings.',
  },
  {
    name: 'Care Pack 10',
    save: '10% off',
    body: 'Ten rides paid up front, good for a year. For treatment cycles and follow-ups that do not fall on a fixed day.',
  },
  {
    name: 'Winnie Monthly',
    save: '10–15% off',
    body: 'Four trips a month is 10% off, eight trips is 15% off. Built for daycare runs and a standing groomer.',
  },
  {
    name: 'Facility Account',
    save: '5–10% off',
    body: 'Clinics and surgery centers book on account and get one invoice a month. 5% from 10 trips a month, 10% from 25.',
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container-x py-16">
          <div className="eyebrow">Pricing</div>
          <h1 className="serif mt-3 text-4xl md:text-5xl font-semibold max-w-3xl leading-[1.08]">
            Know your price before you book.
          </h1>
          <p className="ink-soft mt-5 max-w-2xl text-lg leading-relaxed">
            Flat rates by distance across Charlotte and Mecklenburg County. No meter
            running, no surge, no surprise at the end. A dispatcher confirms your exact
            price before the trip is booked, and it does not move afterwards.
          </p>
          <Link href={request.ride} className="btn-gold mt-7 inline-flex items-center gap-2">
            Get your price <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="bg-surface border-b border-line">
        <div className="container-x py-14">
          <h2 className="h-section max-w-2xl">Medical transport</h2>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RateTable
              heading="Tassy Care &amp; Tassy Recovery"
              note="Tassy Care is one way, for appointments you get yourself to and from. Tassy Recovery is the ride home after a procedure — it covers the trip there, the wait, and the trip home, and it is the service a surgery center is asking for when they say you need a responsible adult."
              colA="Tassy Care"
              colASub="one way"
              colB="Tassy Recovery"
              colBSub="there and back · 20 min wait"
              rows={MEDICAL}
              href={request.nemt}
              cta="Request a medical ride"
            />
            <div className="flex flex-col gap-6">
              {/* Published from 2026-09-30. This card used to say "we quote your route on
                  the call rather than print a rate we cannot hold to" — which made the one
                  passenger least able to chase a phone call the only one who had to. The
                  vehicles come from the partner network either way; the number is now a
                  commitment Tassy holds by subcontract instead of a callback. */}
              <RateTable
                heading="Travelling in a wheelchair"
                note="Tassy Care WAV uses a ramp-equipped vehicle and an operator trained in securement — you stay in your chair for the whole trip. Priced by distance like every other line, so you know the number before you book. 20 minutes of on-site wait included."
                colA="One way"
                colASub="ramp-equipped, securement trained"
                colB="There and back"
                colBSub="20 min wait included"
                rows={WAV}
                href={request.nemt}
                cta="Request a wheelchair ride"
              />
              <div className="card-tile">
                <h3 className="serif text-xl font-semibold">Tassy Scholar</h3>
                {/* This card carried a THIRD set of Scholar prices — $45 a leg, $20 a
                    sibling, a $55 route minimum, $660 a month — none of which matched the
                    plans a parent is actually charged in the booking wizard. Those per-leg
                    numbers are the institutional route model (and $45 a leg is what
                    EverDriven paid Phil as a subcontractor, i.e. district money). They are
                    a different product with a different payer, so they no longer masquerade
                    as the family price. Family plans are now read from SCHOOL_PLANS, the
                    same source the wizard charges from. */}
                <p className="ink-soft mt-2 text-sm leading-relaxed">
                  Sold <strong className="text-cream-text">by the plan and billed monthly</strong>,
                  never per ride — one child, one car, the same driver every morning and the
                  schedule locked for the year.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {SCHOOL_PLANS.map((plan) => (
                    <li key={plan.key} className="flex items-baseline justify-between gap-3">
                      <span className="ink-soft">{plan.name}</span>
                      <strong className="text-cream-text whitespace-nowrap">{plan.price}</strong>
                    </li>
                  ))}
                </ul>
                <p className="ink-soft mt-2 text-xs">{SIBLING_NOTE}.</p>
                <p className="ink-soft mt-3 text-sm leading-relaxed">
                  Schools, districts and case managers: daily routes are a different product,
                  priced per leg by how many stops the route has rather than by the mile, and
                  quoted on account.
                </p>
                <Link href={request.school} className="btn-gold mt-5 inline-flex items-center gap-2">
                  See plans and pricing <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="container-x py-14">
          <h2 className="h-section max-w-2xl">Premium and pet transport</h2>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RateTable
              heading="Tassy Concierge"
              note="Airport, golf, dinner, events, collecting a client from their hotel. A reserved vehicle and a professional driver, booked for a time you chose. Nothing medical — a round trip is two reserved legs, and the driver is released in between. If you need the car to wait for you, book Tassy Recovery instead."
              colA="One way"
              colASub="reserved for your time"
              colB="Round trip"
              colBSub="two reserved legs"
              rows={CONCIERGE}
              href={request.vip}
              cta="Reserve a car"
            />
            <RateTable
              heading="Winnie Ride"
              note="Dedicated pet transport to the vet, groomer, daycare or boarding — and you do not travel with them. We collect your animal, hand them over by name, and bring them back. There-and-back includes 20 minutes of wait. Second pet $15."
              colA="One way"
              colASub="you stay at work"
              colB="There and back"
              colBSub="20 min wait included"
              rows={WINNIE}
              href={request.winnie}
              cta="Request a pet ride"
            />
          </div>
        </div>
      </section>

      <section className="bg-surface border-b border-line">
        <div className="container-x py-14">
          <h2 className="h-section max-w-2xl">
            If you ride with us often, stop paying per ride.
          </h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((p) => (
              <div key={p.name} className="card-tile">
                <h3 className="serif text-lg font-semibold">{p.name}</h3>
                <div className="mt-1 text-lg font-bold text-[color:var(--gold)]">{p.save}</div>
                <p className="ink-soft mt-2 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container-x py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="serif text-2xl font-semibold">What can change the price</h2>
              <ul className="ink-soft mt-4 space-y-2 text-sm leading-relaxed">
                <li>Before 6am or after 8pm: <strong className="text-cream-text">+$25</strong></li>
                <li>Weekends: <strong className="text-cream-text">+$20</strong></li>
                <li>
                  Extra passenger: <strong className="text-cream-text">+$10</strong> on Tassy Care,{' '}
                  <strong className="text-cream-text">+$15</strong> on Recovery and Concierge
                </li>
                <li>
                  Tassy Escort on Recovery: <strong className="text-cream-text">+$45</strong> — your
                  driver comes in 15 minutes early and walks them out to the car
                </li>
                <li>
                  Wait beyond what is included: quoted to you{' '}
                  <strong className="text-cream-text">before</strong> it is charged, never after
                </li>
              </ul>
              <p className="ink-soft mt-4 text-sm leading-relaxed">
                Surcharges are charged once per dispatch, not once per leg. A round trip is
                one driver on one day.
              </p>
            </div>
            <div>
              <h2 className="serif text-2xl font-semibold">The small print, in plain words</h2>
              <p className="ink-soft mt-4 text-sm leading-relaxed">
                Prices are for Charlotte and Mecklenburg County and are confirmed by a
                dispatcher before your trip is booked. Tolls and extra wait are quoted in
                advance. Tassy Transportation provides transportation and passenger
                assistance — it is not an ambulance service and does not provide emergency
                care, home health, medication administration, diagnosis or treatment. In an
                emergency, call 911.
              </p>
              <Link
                href={request.ride}
                className="btn-gold mt-6 inline-flex items-center gap-2"
              >
                Get your price <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
