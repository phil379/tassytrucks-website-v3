import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { applyFacilityDiscount } from '@/lib/facility';
import { tripCents, type FacilityTrip } from '@/lib/facility-dashboard.server';

/**
 * Read-only billing view for the facility console.
 *
 * EVERY QUERY FILTERS ON facility_id FROM THE SESSION (the caller passes session.facility.id).
 * Nothing here writes, sends, creates a payment link or marks anything paid.
 */

export type FacilityInvoiceRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  tripCount: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  poReference: string | null;
  dueAt: string | null;
  paidAt: string | null;
};

/** A draft is Tassy's working copy and a void is a mistake we took back. Neither is shown to a clinic. */
export const FACILITY_VISIBLE_INVOICE_STATUSES = ['sent', 'overdue', 'paid'] as const;

function ok<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/**
 * Invoices Tassy has issued to this facility, plus what is waiting to be invoiced.
 *
 * "Waiting" uses the same test as the Tassy-side invoice run (completed, facility pays, on account,
 * not already on an invoice), so the number a coordinator sees is the number Tassy will bill.
 * Unpriced trips are counted separately and never shown as $0.
 */
export async function facilityInvoicesAndPending(facilityId: string, discountPct: number): Promise<{
  invoices: FacilityInvoiceRow[];
  pending: { trips: number; cents: number; unpriced: number };
  netTermsDays: number | null;
}> {
  const db = supabaseAdmin();

  const inv = ok(
    await db.from('facility_invoices')
      .select('id, period_start, period_end, status, trip_count, subtotal_cents, discount_cents, total_cents, po_reference, due_at, paid_at')
      .eq('facility_id', facilityId)
      .in('status', [...FACILITY_VISIBLE_INVOICE_STATUSES])
      .order('period_end', { ascending: false })
      .limit(60),
    'facility invoices',
  ) as unknown as Array<Record<string, any>>;

  const invoices: FacilityInvoiceRow[] = inv.map((r) => ({
    id: r.id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    status: r.status,
    tripCount: r.trip_count ?? 0,
    subtotalCents: r.subtotal_cents ?? 0,
    discountCents: r.discount_cents ?? 0,
    totalCents: r.total_cents ?? 0,
    poReference: r.po_reference ?? null,
    dueAt: r.due_at ?? null,
    paidAt: r.paid_at ?? null,
  }));

  const trips = ok(
    await db.from(TRIP_REQUESTS_TABLE)
      .select('id, status, payer, payment_status, agreed_cents, quoted_cents')
      .eq('facility_id', facilityId)
      .eq('payer', 'facility')
      .eq('payment_status', 'on_account')
      .eq('status', 'completed')
      .is('facility_invoice_id', null)
      .limit(5000),
    'facility uninvoiced trips',
  ) as unknown as FacilityTrip[];

  let retail = 0;
  let unpriced = 0;
  for (const t of trips) {
    const c = tripCents(t);
    if (c === null) unpriced += 1;
    else retail += c;
  }
  const { totalCents } = applyFacilityDiscount(retail, discountPct);

  const fac = ok(
    await db.from('facilities').select('net_terms_days').eq('id', facilityId).maybeSingle(),
    'facility terms',
  ) as { net_terms_days: number | null } | null;

  return {
    invoices,
    pending: { trips: trips.length - unpriced, cents: totalCents, unpriced },
    netTermsDays: fac?.net_terms_days ?? null,
  };
}
