import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  bandLabel,
  overBandLabel,
  roundTripCents,
  dollars,
  type Card,
} from '@/lib/quote';

/**
 * The rate table, and the two functions that build its rows.
 *
 * Lifted out of app/pricing/page.tsx on 2026-10-02 so a landing page can show
 * a real price without a second copy of the numbers.
 *
 * THE RULE THIS EXISTS TO PROTECT. Until 2026-09-30 the pricing page held
 * hand-written copies of the rate cards. Winnie was repriced in lib/quote.ts
 * and the page kept advertising the old fare: the engine said $69, the page
 * said $49, and the page is the one the customer reads. Two sources of truth
 * for a price is not a style problem, it is a promise the business cannot
 * keep.
 *
 * So nothing here takes a number. Everything takes a CARD from lib/quote.ts
 * and derives. Reprice there and every surface follows on the next build.
 */

export type Row = { band: string; a: string; b: string };

/** Two different cards side by side — e.g. Care one-way beside Recovery. */
export function pairRows(a: Card, b: Card): Row[] {
  const rows: Row[] = a.bands.map((band, i) => ({
    band: bandLabel(a.bands, i),
    a: dollars(band.cents),
    b: b.bands[i] ? dollars(b.bands[i].cents) : 'Call us',
  }));
  rows.push({ band: overBandLabel(a.bands), a: 'Call us', b: 'Call us' });
  return rows;
}

/** One card, one way beside its own return price. */
export function returnRows(card: Card): Row[] {
  const rows: Row[] = card.bands.map((band, i) => ({
    band: bandLabel(card.bands, i),
    a: dollars(band.cents),
    b: dollars(roundTripCents(card, band.cents)),
  }));
  rows.push({ band: overBandLabel(card.bands), a: 'Call us', b: 'Call us' });
  return rows;
}

export default function RateTable({
  id,
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
  /** Anchor, so a price can be linked to directly rather than scrolled for. */
  id?: string;
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
    <div id={id} className="card-tile !p-0 overflow-hidden scroll-mt-24">
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
