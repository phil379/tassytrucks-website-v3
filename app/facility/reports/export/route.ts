import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityMonthlyReport } from '@/lib/facility-console.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** RFC 4180: quote everything, double any embedded quote. A facility name with
 *  a comma in it must not shift every column in their finance team's sheet. */
const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export async function GET() {
  const session = await currentFacilitySession();
  if (!session) {
    return new Response('Your sign-in has expired. Open your account again and retry.', {
      status: 401,
    });
  }

  const facility = session.facility;
  const { rows } = await facilityMonthlyReport(facility.id, Number(facility.discount_pct ?? 0));

  const header = ['Month', 'Trips', 'Completed', 'Cancelled', 'Billed (USD)', 'Not yet priced'];
  const body = rows.map((r) => [
    r.label,
    r.trips,
    r.completed,
    r.cancelled,
    (r.billedCents / 100).toFixed(2),
    r.unpriced,
  ]);

  const csv = [header, ...body].map((line) => line.map(cell).join(',')).join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = facility.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tassy-${safeName}-${stamp}.csv"`,
      // Specific to one facility and behind a session — never cached anywhere.
      'Cache-Control': 'no-store, private',
    },
  });
}
