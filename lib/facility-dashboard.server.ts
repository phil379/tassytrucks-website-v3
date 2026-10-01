import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { FACILITY_INVOICES_TABLE, STANDING_ORDERS_TABLE } from '@/lib/facility.server';
import { applyFacilityDiscount } from '@/lib/facility';

/**
 * Everything the facility dashboard shows, in one round trip.
 *
 * WHY THIS IS SERVER-SIDE AND SCOPED BY facility_id EVERY TIME
 * A facility coordinator is not an employee of Tassy. The one unrecoverable
 * mistake this screen could make is showing one clinic another clinic's
 * passengers, so every query below filters on facility_id taken from the
 * SESSION, never from a URL, a form field or anything the browser can set.
 *
 * MONEY SHOWN HERE IS WHAT THE FACILITY OWES, not what the ride was worth.
 * Trips carry the retail fare; the facility's negotiated discount is applied
 * at display and again at invoicing, from the same helper, so the running
 * total a coordinator sees this week matches the invoice that arrives on
 * Monday. A dashboard that quotes retail and an invoice that applies a
 * discount is a support call every single week.
 */

export type FacilityTrip = {
  id: string;
  service_line: string;
  status: string;
  contact_name: string;
  pickup_address: string;
  dropoff_address: string;
  requested_at: string;
  return_trip: boolean;
  payer: string | null;
  payment_status: string | null;
  agreed_cents: number | null;
  quoted_cents: number | null;
  facility_ref: string | null;
  facility_invoice_id: string | null;
};

export type FacilityInvoice = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  trip_count: number | null;
  total_cents: number | null;
  due_at: string | null;
  paid_at: string | null;
  payment_link_url: string | null;
};

const TRIP_COLS =
  'id, service_line, status, contact_name, pickup_address, dropoff_address, requested_at, ' +
  'return_trip, payer, payment_status, agreed_cents, quoted_cents, facility_ref, facility_invoice_id';

/** The fare a trip has settled on. Agreed beats quoted; neither means unpriced. */
export function tripCents(t: FacilityTrip): number | null {
  if (typeof t.agreed_cents === 'number') return t.agreed_cents;
  if (typeof t.quoted_cents === 'number') return t.quoted_cents;
  return null;
}

/** Charlotte's day boundaries, not the server's. A trip at 11pm on the 31st
 *  belongs to that month for the coordinator reading this, whatever UTC says. */
function charlotteNow(): Date {
  return new Date();
}
function monthStartISO(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function facilityDashboard(facilityId: string, discountPct: number) {
  const db = supabaseAdmin();
  const now = charlotteNow();
  const in7 = new Date(now.getTime() + 7 * 86400000).toISOString();
  const monthStart = monthStartISO(now);

  const [upcomingRes, monthRes, invoiceRes, standingRes] = await Promise.all([
    // Next 7 days, anything not already finished.
    db
      .from(TRIP_REQUESTS_TABLE)
      .select(TRIP_COLS)
      .eq('facility_id', facilityId)
      .gte('requested_at', now.toISOString())
      .lte('requested_at', in7)
      .not('status', 'in', '("completed","cancelled")')
      .order('requested_at', { ascending: true })
      .limit(50),
    // This calendar month, for the count and the running total.
    db
      .from(TRIP_REQUESTS_TABLE)
      .select(TRIP_COLS)
      .eq('facility_id', facilityId)
      .gte('requested_at', monthStart)
      .order('requested_at', { ascending: false })
      .limit(500),
    db
      .from(FACILITY_INVOICES_TABLE)
      .select('id, period_start, period_end, status, trip_count, total_cents, due_at, paid_at, payment_link_url')
      .eq('facility_id', facilityId)
      .order('period_start', { ascending: false })
      .limit(12),
    db
      .from(STANDING_ORDERS_TABLE)
      .select('id, label, days_of_week, pickup_time, return_trip, starts_on, ends_on, active')
      .eq('facility_id', facilityId)
      .eq('active', true)
      .limit(50),
  ]);

  const upcoming = (upcomingRes.data ?? []) as unknown as FacilityTrip[];
  const month = (monthRes.data ?? []) as unknown as FacilityTrip[];
  const invoices = (invoiceRes.data ?? []) as unknown as FacilityInvoice[];
  const standing = standingRes.data ?? [];

  // Only trips the FACILITY is paying for count toward what it owes. A
  // patient-card ride on the same account is the facility's to see and not
  // theirs to pay, and mixing the two overstates the bill.
  const onAccount = month.filter((t) => t.payer === 'facility' && t.status !== 'cancelled');
  const retailCents = onAccount.reduce((sum, t) => sum + (tripCents(t) ?? 0), 0);
  // applyFacilityDiscount returns { discountCents, totalCents } -- the same
  // helper the Monday invoice run uses, so this running total and that invoice
  // cannot drift.
  const { discountCents, totalCents } = applyFacilityDiscount(retailCents, discountPct);

  // Unpriced trips are called out rather than silently counted as zero --
  // "$0 so far this month" on an account with eleven rides is a number a
  // coordinator will believe and then be surprised by.
  const unpriced = onAccount.filter((t) => tripCents(t) === null).length;

  const outstanding = invoices
    .filter((i) => !i.paid_at && i.status !== 'void')
    .reduce((sum, i) => sum + (i.total_cents ?? 0), 0);
  const nextDue = invoices.find((i) => !i.paid_at && i.status !== 'void' && i.due_at) ?? null;

  return {
    upcoming,
    month,
    invoices,
    standing,
    stats: {
      tripsThisMonth: month.filter((t) => t.status !== 'cancelled').length,
      onAccountThisMonth: onAccount.length,
      retailCents,
      chargeableCents: totalCents,
      savedCents: discountCents,
      unpriced,
      outstandingCents: outstanding,
      nextDueAt: nextDue?.due_at ?? null,
    },
  };
}
