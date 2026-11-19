import { buildPriceTable, type PriceLineData } from '@/lib/price-table';

/**
 * The shared price table — the facility-facing sibling of RateTable.
 *
 * RateTable serves /pricing, one card pair at a time. This component serves
 * the places a FACILITY decides whether to sign up: the partners page, the
 * signup page and the setup wizard's "How you pay" step. A facility
 * coordinator has to be able to answer their own customer's "how much does
 * it cost?" before they commit — that is why this exists (Marianne's
 * feedback, 2026-11-18).
 *
 * Every number comes from lib/price-table.ts, which derives from
 * lib/quote.ts. Nothing here takes a number, for the same reason RateTable
 * doesn't: two sources of truth for a price is a promise the business
 * cannot keep. scripts/test-price-table.ts pins the derivation.
 *
 * Full variant: every line's bands, one way and there-and-back, plus the
 * modifiers list. Compact variant: one-way bands only, behind a "See
 * rates" disclosure (CompactRates), for pages where the table is a
 * reassurance rather than the subject.
 */

function LineTable({ line }: { line: PriceLineData }) {
  return (
    <div className="card-tile !p-0 overflow-hidden">
      <div className="p-5 pb-3">
        <h4 className="serif text-xl font-semibold">{line.label}</h4>
        <p className="ink-soft mt-1 text-sm">{line.note}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-charcoal text-white">
            <th scope="col" className="text-left px-5 py-2.5 font-semibold">
              Distance
            </th>
            <th scope="col" className="text-right px-4 py-2.5 font-semibold">
              One way
            </th>
            <th scope="col" className="text-right px-5 py-2.5 font-semibold">
              There and back
            </th>
          </tr>
        </thead>
        <tbody>
          {line.rows.map((r) => (
            <tr key={r.band} className="border-b border-line last:border-0">
              <td className="px-5 py-2">{r.band}</td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">{r.oneWay}</td>
              <td className="px-5 py-2 text-right font-semibold tabular-nums">{r.roundTrip}</td>
            </tr>
          ))}
          <tr>
            <td className="px-5 py-2">{line.overBand}</td>
            <td className="px-4 py-2 text-right ink-soft" colSpan={2}>
              Call us — a dispatcher quotes it
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LineMini({ line }: { line: PriceLineData }) {
  return (
    <div>
      <h4 className="font-semibold">
        {line.label} <span className="ink-soft font-normal">— from {line.from}</span>
      </h4>
      <table className="mt-1.5 w-full text-sm">
        <tbody>
          {line.rows.map((r) => (
            <tr key={r.band} className="border-b border-line last:border-0">
              <td className="py-1.5 pr-3">{r.band}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{r.oneWay}</td>
            </tr>
          ))}
          <tr>
            <td className="py-1.5 pr-3">{line.overBand}</td>
            <td className="py-1.5 text-right ink-soft">Call us</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function PriceTable({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const data = buildPriceTable();
  if (variant === 'compact') {
    return (
      <div className="text-left">
        <p className="font-semibold">Priced per trip, not per mile.</p>
        <div className="mt-4 space-y-5">
          {data.lines.map((line) => (
            <LineMini key={line.key} line={line} />
          ))}
          <LineMini line={data.wav} />
        </div>
        <p className="ink-soft mt-4 text-sm">
          {data.modifiers.map((m) => `${m.label} ${m.amount}`).join(' · ')}
        </p>
      </div>
    );
  }
  return (
    <div className="text-left">
      <p className="serif text-xl font-semibold">Priced per trip, not per mile.</p>
      <div className="mt-4 space-y-5">
        {data.lines.map((line) => (
          <LineTable key={line.key} line={line} />
        ))}
        <LineTable line={data.wav} />
      </div>
      <div className="mt-6">
        <h4 className="serif text-lg font-semibold">What can change the price</h4>
        <ul className="mt-2 space-y-1.5 text-sm">
          {data.modifiers.map((m) => (
            <li key={m.label}>
              <span className="font-medium">
                {m.label} {m.amount}.
              </span>{' '}
              <span className="ink-soft">{m.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The compact table behind a "See rates" disclosure — no JavaScript needed. */
export function CompactRates() {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer font-medium underline decoration-[color:var(--gold)] underline-offset-2">
        See rates
      </summary>
      <div className="mt-4 rounded-lg border border-line p-4 sm:p-5">
        <PriceTable variant="compact" />
      </div>
    </details>
  );
}

/**
 * The one-liner for the partners page and the top of signup:
 * "Flat per-trip pricing, not per mile. From $49." with the rates attached.
 * The floor is the engine's cheapest entry band, computed — never typed.
 */
export function PricingTeaser() {
  const { floor } = buildPriceTable();
  return (
    <div>
      <p>Flat per-trip pricing, not per mile. From {floor}.</p>
      <CompactRates />
    </div>
  );
}
