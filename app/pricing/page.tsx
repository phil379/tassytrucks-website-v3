import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { request } from '@/lib/request-links';

export const metadata: Metadata = {
  title: 'Pricing — flat rates by distance | Tassy Transportation Charlotte',
  description:
    'Charlotte medical, pet and premium transport priced by distance, not by meter. Tassy Care from $49, Recovery from $129, Concierge from $69, Winnie Ride from $49. No surge.',
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

const MEDICAL: Row[] = [
  { band: 'Up to 3 miles', a: '$49', b: '$129' },
  { band: '4 – 7 miles', a: '$59', b: '$149' },
  { band: '8 – 12 miles', a: '$74', b: '$169' },
  { band: '13 – 17 miles', a: '$89', b: '$195' },
  { band: '18 – 22 miles', a: '$109', b: '$225' },
  { band: '23 – 30 miles', a: '$129', b: '$259' },
  { band: 'Over 30 miles', a: 'Call us', b: 'Call us' },
];

const CONCIERGE: Row[] = [
  { band: 'Up to 3 miles', a: '$69', b: '$138' },
  { band: '4 – 7 miles', a: '$89', b: '$178' },
  { band: '8 – 12 miles', a: '$109', b: '$218' },
  { band: '13 – 17 miles', a: '$129', b: '$258' },
  { band: '18 – 22 miles', a: '$155', b: '$310' },
  { band: '23 – 30 miles', a: '$185', b: '$370' },
  { band: 'Over 30 miles', a: 'Call us', b: 'Call us' },
];

const WINNIE: Row[] = [
  { band: 'Up to 5 miles', a: '$49', b: '$89' },
  { band: '6 – 10 miles', a: '$59', b: '$106' },
  { band: '11 – 15 miles', a: '$69', b: '$124' },
  { band: '16 – 20 miles', a: '$79', b: '$142' },
  { band: '21 – 25 miles', a: '$89', b: '$160' },
  { band: 'Over 25 miles', a: 'Call us', b: 'Call us' },
];

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
              <div className="card-tile">
                <h3 className="serif text-xl font-semibold">Travelling in a wheelchair</h3>
                <p className="ink-soft mt-2 text-sm leading-relaxed">
                  <strong className="text-ink">Tassy Care WAV</strong> uses a ramp-equipped
                  vehicle and an operator trained in securement. You stay in your chair for
                  the whole trip. Those vehicles come from our partner network, so we quote
                  your route on the call rather than print a rate we cannot hold to. Call
                  with your two addresses and you will have a price in minutes.
                </p>
                <a href="tel:+17049418508" className="btn-gold mt-5 inline-flex items-center gap-2">
                  Call (704) 941-8508
                </a>
              </div>
              <div className="card-tile">
                <h3 className="serif text-xl font-semibold">Tassy Scholar</h3>
                <p className="ink-soft mt-2 text-sm leading-relaxed">
                  School and after-school runs are sold <strong className="text-ink">by the
                  route and billed monthly</strong>, never per ride — the cost of a school
                  leg turns on how many stops it has, not how many miles. First child $45 a
                  leg, each brother or sister at the same address $20, third child at that
                  address free, with a $55 route minimum.
                </p>
                <p className="ink-soft mt-3 text-sm leading-relaxed">
                  The after-school run, three days a week, starts at{' '}
                  <strong className="text-ink">$660 a month</strong>. Schools, districts and
                  case managers: daily routes quoted on account.
                </p>
                <Link href={request.school} className="btn-gold mt-5 inline-flex items-center gap-2">
                  Get a route quote <ArrowRight size={16} aria-hidden="true" />
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
                <li>Before 6am or after 8pm: <strong className="text-ink">+$25</strong></li>
                <li>Weekends: <strong className="text-ink">+$20</strong></li>
                <li>
                  Extra passenger: <strong className="text-ink">+$10</strong> on Tassy Care,{' '}
                  <strong className="text-ink">+$15</strong> on Recovery and Concierge
                </li>
                <li>
                  Wait beyond what is included: quoted to you{' '}
                  <strong className="text-ink">before</strong> it is charged, never after
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
