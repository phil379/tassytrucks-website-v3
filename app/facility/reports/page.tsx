import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityMonthlyReport, facilityUnreadCount } from '@/lib/facility-console.server';
import { canBook } from '@/lib/facility';
import ConsoleShell from '@/components/facility/ConsoleShell';
import { money, Empty } from '@/components/facility/bits';

export const metadata: Metadata = {
  title: 'Reports — Tassy Transportation',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function FacilityReportsPage() {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');
  const facility = session.facility;
  if (facility.status === 'pending' && !canBook(facility)) redirect('/facility/welcome');

  const discount = Number(facility.discount_pct ?? 0);
  const [{ rows, totalTrips, totalBilledCents }, unread] = await Promise.all([
    facilityMonthlyReport(facility.id, discount),
    facilityUnreadCount(facility.id),
  ]);

  const used = rows.filter((r) => r.trips > 0);
  const peak = Math.max(1, ...rows.map((r) => r.trips));

  return (
    <ConsoleShell facilityName={facility.name} active="reports" counts={{ messages: unread }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="serif text-2xl font-semibold">Reports</h2>
          <p className="ink-soft mt-1 text-sm">
            Twelve months of volume and spend on your account.
          </p>
        </div>
        <Link href="/facility/reports/export" className="btn-ghost inline-flex min-h-[44px] items-center gap-2 text-sm" prefetch={false}>
          <Download size={15} aria-hidden="true" /> Download CSV
        </Link>
      </div>

      {used.length === 0 ? (
        <div className="mt-6">
          <Empty
            title="No trips to report yet"
            body="Once you have booked a few rides this fills in by month, with what each month cost and a CSV your finance team can work from."
          />
        </div>
      ) : (
        <>
          <dl className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
              <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Trips, 12 months</dt>
              <dd className="serif mt-1 text-2xl font-semibold">{totalTrips}</dd>
            </div>
            <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
              <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Billed to you</dt>
              <dd className="serif mt-1 text-2xl font-semibold">{money(totalBilledCents)}</dd>
              {discount > 0 ? (
                <p className="ink-mute mt-1 text-xs">After your {discount}% account discount</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-[color:var(--line)] px-5 py-4">
              <dt className="ink-mute text-[11px] uppercase tracking-[0.14em]">Busiest month</dt>
              <dd className="serif mt-1 text-2xl font-semibold">
                {rows.reduce((a, b) => (b.trips > a.trips ? b : a)).trips}
              </dd>
            </div>
          </dl>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left">
                <th scope="col" className="py-2 font-semibold">Month</th>
                <th scope="col" className="py-2 text-right font-semibold">Trips</th>
                <th scope="col" className="py-2 text-right font-semibold">Completed</th>
                <th scope="col" className="py-2 text-right font-semibold">Billed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-[color:var(--line)] last:border-0">
                  <td className="py-2.5">
                    {r.label}
                    {r.trips > 0 ? (
                      <span
                        className="ml-3 inline-block h-1.5 rounded-full align-middle"
                        style={{ width: `${Math.round((r.trips / peak) * 90)}px`, background: 'var(--gold)' }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{r.trips || '—'}</td>
                  <td className="py-2.5 text-right tabular-nums ink-soft">{r.completed || '—'}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {r.billedCents ? money(r.billedCents) : '—'}
                    {r.unpriced > 0 ? (
                      <span className="ink-mute block text-xs">{r.unpriced} not yet priced</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* THE WALKTHROUGH HAD AN ON-TIME COLUMN AND THIS DOES NOT. On-time needs
          a recorded arrival against a promised time; trip_events exists and is
          empty, so any percentage here would be invented. A column of made-up
          96%s on a page a facility forwards to its own finance team is worse
          than an honest gap. It returns when arrivals are recorded. */}
      <p className="ink-mute mt-6 text-xs leading-relaxed">
        On-time performance is not shown yet &mdash; we only report it once arrival times are
        recorded against every trip, and we would rather leave it out than estimate it.
      </p>
    </ConsoleShell>
  );
}
