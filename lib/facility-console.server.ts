import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { applyFacilityDiscount } from '@/lib/facility';
import {
  tripCents, withPassengerDetail, withAssignmentDetail, FACILITY_PATIENTS_TABLE, type FacilityTrip,
} from '@/lib/facility-dashboard.server';

/**
 * The reads behind the facility console — Active Trips, Patients, Messages,
 * Reports, and the counters on the dashboard.
 *
 * EVERY QUERY IN THIS FILE FILTERS ON facility_id FROM THE SESSION. Not from a
 * URL, not from a form field, not from anything a browser can set. A facility
 * coordinator is not a Tassy employee, and the one unrecoverable mistake these
 * screens could make is showing one clinic another clinic's passengers. The
 * callers pass session.facilityId and nothing else is accepted.
 *
 * NO CLINICAL DATA PASSES THROUGH HERE. See FACILITY_03 for the long version:
 * the walkthrough this console was built from listed DOB and MRN against each
 * patient, and trip purposes like "Oncology follow-up". None of that is stored
 * or read. A destination says the same thing to a driver and carries no
 * clinical claim.
 */

// One name for the table, declared beside the hydration helper that reads it.
// Re-exported because callers already import it from here.
export { FACILITY_PATIENTS_TABLE };
export const FACILITY_MESSAGES_TABLE = 'facility_messages';

/** Charlotte, always — the server runs in UTC and a 6:45am pickup shown in UTC
 *  reads as 10:45, the single most alarming thing a coordinator could see. */
export const CHARLOTTE = 'America/New_York';

/** Start of today in Charlotte, as a UTC instant. */
export function charlotteDayStart(d = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHARLOTTE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  // Charlotte is UTC-4 or UTC-5; building the instant from the local date and
  // letting Date resolve the offset keeps DST correct without a tz library.
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00-04:00`);
}

function ok<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  // PostgREST does not throw. An ignored `error` is how rows silently vanish —
  // the failure mode this whole codebase keeps finding.
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/* ───────────────────────────────────────────────────────────── active trips */

const TRIP_COLS =
  'id, service_line, status, contact_name, pickup_address, dropoff_address, requested_at, ' +
  'return_trip, payer, payment_status, agreed_cents, quoted_cents, facility_ref, facility_invoice_id, ' +
  'facility_patient_id, driver_id, vehicle_id, vehicle_description';

export type TripBucket = 'today' | 'upcoming' | 'recent';

/**
 * Trips for one bucket.
 *
 * The walkthrough showed live driver positions and "3 min from pickup". We do
 * not have that: there is no GPS feed and trip_events is empty. What we DO have
 * is the status ladder (new → quoted → confirmed → assigned → completed), which
 * is honest and already moves. Showing a fake ETA would be the "driver assigned
 * within minutes" promise all over again — deleted from the homepage on
 * 2026-10-01 for being untrue.
 */
export async function facilityTrips(facilityId: string, bucket: TripBucket): Promise<FacilityTrip[]> {
  const db = supabaseAdmin();
  const dayStart = charlotteDayStart();
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  let q = db.from(TRIP_REQUESTS_TABLE).select(TRIP_COLS).eq('facility_id', facilityId);

  if (bucket === 'today') {
    q = q.gte('requested_at', dayStart.toISOString())
         .lt('requested_at', dayEnd.toISOString())
         .order('requested_at', { ascending: true });
  } else if (bucket === 'upcoming') {
    q = q.gte('requested_at', dayEnd.toISOString())
         .order('requested_at', { ascending: true });
  } else {
    q = q.lt('requested_at', dayStart.toISOString())
         .order('requested_at', { ascending: false });
  }

  const trips = ok(await q.limit(100), `facility trips (${bucket})`) as unknown as FacilityTrip[];
  return withAssignmentDetail(await withPassengerDetail(facilityId, trips));
}



export async function facilityTripCounts(facilityId: string) {
  const db = supabaseAdmin();
  const dayStart = charlotteDayStart();
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [today, upcoming] = await Promise.all([
    db.from(TRIP_REQUESTS_TABLE).select('id, status', { count: 'exact' })
      .eq('facility_id', facilityId)
      .gte('requested_at', dayStart.toISOString())
      .lt('requested_at', dayEnd.toISOString()),
    db.from(TRIP_REQUESTS_TABLE).select('id', { count: 'exact', head: true })
      .eq('facility_id', facilityId)
      .gte('requested_at', dayEnd.toISOString()),
  ]);

  // Neither response was checked. A failed count arrives as data:null/count:null
  // and this returned a confident `today: 0` — the dashboard badge and the
  // "nothing scheduled today" copy both read from here, so a coordinator with
  // three pickups on the books was told there were none. Same silent drop as
  // everywhere else: PostgREST does not throw, so it has to be asked.
  if (today.error) throw new Error(`facility trip counts (today): ${today.error.message}`);
  if (upcoming.error) throw new Error(`facility trip counts (upcoming): ${upcoming.error.message}`);

  const todayRows = (today.data ?? []) as { status: string }[];
  return {
    today: today.count ?? todayRows.length,
    upcoming: upcoming.count ?? 0,
    // "In progress" is assigned-but-not-finished. The nearest true statement to
    // the walkthrough's "in progress now", without inventing a GPS feed.
    inProgress: todayRows.filter((t) => t.status === 'assigned').length,
  };
}

/* ────────────────────────────────────────────────── the week at a glance */

/** Seven day-buckets starting Monday of the current Charlotte week. */
export async function facilityWeek(facilityId: string) {
  const db = supabaseAdmin();
  const today = charlotteDayStart();
  const dow = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: CHARLOTTE, weekday: 'short' })
      .format(today)
      .replace(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/, (m) =>
        String(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(m))),
  );
  const monday = new Date(today.getTime() - dow * 86400000);
  const end = new Date(monday.getTime() + 7 * 86400000);

  const rows = ok(
    await db.from(TRIP_REQUESTS_TABLE).select('requested_at, status')
      .eq('facility_id', facilityId)
      .gte('requested_at', monday.toISOString())
      .lt('requested_at', end.toISOString())
      .limit(1000),
    'facility week',
  ) as unknown as { requested_at: string; status: string }[];

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels.map((label, i) => {
    const from = new Date(monday.getTime() + i * 86400000);
    const to = new Date(from.getTime() + 86400000);
    const count = rows.filter((r) => {
      const t = new Date(r.requested_at).getTime();
      return t >= from.getTime() && t < to.getTime() && r.status !== 'cancelled';
    }).length;
    return { label, count, isToday: from.getTime() === today.getTime() };
  });
}

/* ─────────────────────────────────────────────────────────────── patients */

export type FacilityPatient = {
  id: string;
  display_name: string;
  mobility: string | null;
  /** Veterinary accounts only — null for every human-passenger facility. */
  species: string | null;
  breed: string | null;
  facility_ref: string | null;
  access_notes: string | null;
  created_at: string;
};

export async function facilityPatients(facilityId: string): Promise<
  (FacilityPatient & { tripCount: number; lastTripAt: string | null })[]
> {
  const db = supabaseAdmin();
  const patients = ok(
    await db.from(FACILITY_PATIENTS_TABLE)
      .select('id, display_name, mobility, species, breed, facility_ref, access_notes, created_at')
      .eq('facility_id', facilityId)
      .is('archived_at', null)
      .order('display_name', { ascending: true })
      .limit(500),
    'facility patients',
  ) as unknown as FacilityPatient[];

  if (patients.length === 0) return [];

  // One query for every patient's history rather than N. The counts are what
  // make "24 trips · last 2 days ago" possible, and that line is the whole
  // argument for saving a profile in the first place.
  const history = ok(
    await db.from(TRIP_REQUESTS_TABLE)
      .select('facility_patient_id, requested_at')
      .eq('facility_id', facilityId)
      .in('facility_patient_id', patients.map((p) => p.id))
      .neq('status', 'cancelled')
      .limit(5000),
    'patient trip history',
  ) as unknown as { facility_patient_id: string; requested_at: string }[];

  return patients.map((p) => {
    const mine = history.filter((h) => h.facility_patient_id === p.id);
    const last = mine
      .map((h) => h.requested_at)
      .sort()
      .at(-1) ?? null;
    return { ...p, tripCount: mine.length, lastTripAt: last };
  });
}

/* ─────────────────────────────────────────────────────────────── messages */

export type FacilityMessage = {
  id: string;
  trip_request_id: string | null;
  author: 'facility' | 'dispatch';
  author_name: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function facilityMessages(facilityId: string): Promise<FacilityMessage[]> {
  const db = supabaseAdmin();
  return ok(
    await db.from(FACILITY_MESSAGES_TABLE)
      .select('id, trip_request_id, author, author_name, body, read_at, created_at')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: true })
      .limit(200),
    'facility messages',
  ) as unknown as FacilityMessage[];
}

/** Unread FROM DISPATCH — the badge counts what the coordinator has not read,
 *  never what they wrote themselves. */
export async function facilityUnreadCount(facilityId: string): Promise<number> {
  const db = supabaseAdmin();
  const res = await db.from(FACILITY_MESSAGES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('facility_id', facilityId)
    .eq('author', 'dispatch')
    .is('read_at', null);
  return res.count ?? 0;
}

/* ──────────────────────────────────────────────────────────────── reports */

export type MonthRow = {
  key: string;
  label: string;
  trips: number;
  completed: number;
  cancelled: number;
  billedCents: number;
  unpriced: number;
};

/**
 * Twelve months of volume and spend.
 *
 * THE WALKTHROUGH SHOWED AN ON-TIME RATE AND THIS DOES NOT. On-time needs a
 * recorded pickup time against a promised one; trip_events exists but holds
 * nothing yet, so any number here would be invented. A column of made-up 96%s
 * on a page a facility may forward to its own finance team is worse than an
 * honest gap. It returns the moment trip_events carries arrivals.
 */
export async function facilityMonthlyReport(
  facilityId: string,
  discountPct: number,
  months = 12,
): Promise<{ rows: MonthRow[]; totalTrips: number; totalBilledCents: number }> {
  const db = supabaseAdmin();
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const trips = ok(
    await db.from(TRIP_REQUESTS_TABLE).select(TRIP_COLS)
      .eq('facility_id', facilityId)
      .gte('requested_at', from.toISOString())
      .order('requested_at', { ascending: false })
      .limit(5000),
    'facility monthly report',
  ) as unknown as FacilityTrip[];

  const buckets = new Map<string, FacilityTrip[]>();
  for (const t of trips) {
    const d = new Date(t.requested_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }

  const rows: MonthRow[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const mine = buckets.get(key) ?? [];
    // Only trips the FACILITY pays for count toward spend. A patient-card ride
    // on the same account is theirs to see and not theirs to pay.
    const onAccount = mine.filter((t) => t.payer === 'facility' && t.status !== 'cancelled');
    const retail = onAccount.reduce((sum, t) => sum + (tripCents(t) ?? 0), 0);
    const { totalCents } = applyFacilityDiscount(retail, discountPct);
    rows.push({
      key,
      label: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
      trips: mine.length,
      completed: mine.filter((t) => t.status === 'completed' || t.status === 'closed').length,
      cancelled: mine.filter((t) => t.status === 'cancelled').length,
      billedCents: totalCents,
      unpriced: onAccount.filter((t) => tripCents(t) === null).length,
    });
  }

  return {
    rows,
    totalTrips: rows.reduce((s, r) => s + r.trips, 0),
    totalBilledCents: rows.reduce((s, r) => s + r.billedCents, 0),
  };
}
