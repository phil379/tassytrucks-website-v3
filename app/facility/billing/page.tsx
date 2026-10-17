import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityUnreadCount } from '@/lib/facility-console.server';
import { facilityInvoicesAndPending } from '@/lib/facility-billing.server';
import { canBook, tripNounPlural } from '@/lib/facility';
import ConsoleShell from '@/components/facility/ConsoleShell';
import { money, Empty } from '@/components/facility/bits';

export const metadata: Metadata = {
  title: 'Billing — Tassy Transportation',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/** "2026-10-05" as "Oct 5, 2026". A plain date is read at noon UTC so the day cannot slide. */
function day(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' });
}

function statusLabel(status: string, paidAt: string | null): string {
  if (paidAt || status === 'paid') return 'Paid';
  if (status === 'overdue') return 'Overdue';
  return 'Open';
}

export default async function FacilityBillingPage() {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');
  const facility = session.facility;
  if (facility.status === 'pending' && !canBook(facility)) redirect('/facility/welcome');

  const discount = Number(facility.discount_pct ?? 0);
  const [{ invoices, pending, netTermsDays }, unread] = await Promise.all([
    facilityInvoicesAndPending(facility.id, discount),
    facilityUnreadCount(facility.id),
  ]);

  const trips = tripNounPlural(facility.kind);
  const tripOne = trips.replace(/s$/, '');
  const Trips = trips.charAt(0).toUpperCase() + trips.slice(1);
  const open = invoices.filter((i) => !i.paidAt && i.status !== 'paid');
  const openCents = open.reduce((s, i) => s + i.totalCents, 0);

  return (
    <ConsoleShell facilityName={facility.name} signedInAs={session.email} active="billing" counts={{ messages: unread }}>
      <div>
        <h2 className="serif text-2xl font-semibold">Billing</h2>
        <p className="ink-soft mt-1 text-sm">
          Invoices Tassy has issued to your account, and what is waiting to be invoiced.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
          <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Open invoices</dt>
          <dd className="serif mt-1 text-2xl font-semibold">{money(openCents)}</dd>
          <p className="ink-mute mt-1 text-xs">{open.length === 1 ? '1 invoice' : `${open.length} invoices`}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
          <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Not yet invoiced</dt>
          <dd className="serif mt-1 text-2xl font-semibold">{money(pending.cents)}</dd>
          <p className="ink-mute mt-1 text-xs">
            {pending.trips} completed {pending.trips === 1 ? tripOne : trips}
            {discount > 0 ? `, after your ${discount}% account discount` : ''}
          </p>
          {pending.unpriced > 0 ? (
            <p className="ink-mute mt-1 text-xs">{pending.unpriced} more not yet priced, so not counted</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
          <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Payment terms</dt>
          <dd className="serif mt-1 text-2xl font-semibold">{netTermsDays ? `Net ${netTermsDays}` : '—'}</dd>
          <p className="ink-mute mt-1 text-xs">Questions about an invoice? Send us a message.</p>
        </div>
      </dl>

      {invoices.length === 0 ? (
        <div className="mt-8">
          <Empty
            title="No invoices yet"
            body={`Once Tassy issues your first invoice it appears here with the period it covers, the ${trips} on it and its due date. Completed ${trips} wait under "Not yet invoiced" until then.`}
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left">
                <th scope="col" className="py-2 font-semibold">Period</th>
                <th scope="col" className="py-2 text-right font-semibold">{Trips}</th>
                <th scope="col" className="py-2 text-right font-semibold">Discount</th>
                <th scope="col" className="py-2 text-right font-semibold">Total</th>
                <th scope="col" className="py-2 pl-6 font-semibold">Due</th>
                <th scope="col" className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-[color:var(--line)] last:border-0">
                  <td className="py-2.5">
                    {day(i.periodStart)} to {day(i.periodEnd)}
                    {i.poReference ? <span className="ink-mute block text-xs">PO {i.poReference}</span> : null}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{i.tripCount}</td>
                  <td className="ink-soft py-2.5 text-right tabular-nums">{i.discountCents ? `−${money(i.discountCents)}` : '—'}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{money(i.totalCents)}</td>
                  <td className="py-2.5 pl-6">{i.paidAt ? '—' : day(i.dueAt)}</td>
                  <td className="py-2.5">
                    {statusLabel(i.status, i.paidAt)}
                    {i.paidAt ? <span className="ink-mute block text-xs">{day(i.paidAt)}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ConsoleShell>
  );
}
