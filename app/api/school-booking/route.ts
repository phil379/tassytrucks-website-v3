import { NextResponse } from 'next/server';
import {
  isoDayFor,
  planBySlug,
  schoolBookingSchema,
  to24h,
  POLICY_VERSION,
  bookingReference,
  type SchoolBookingInput,
  type SchoolPlan,
} from '@/lib/school-plans';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { looksLikeTestIdentity } from '@/lib/test-data';
import { parseLocalDateTime } from '@/lib/time';
import { fireNotifications } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGNUPS_PER_IP_PER_HOUR = Number(process.env.SCHOOL_BOOKING_RATE_LIMIT) || 5;
/** Fastest a human plausibly completes six steps. Below it, treat as a script. */
const MIN_FILL_MS = 3_000;

const STUDENTS_TABLE = 'students';
const STANDING_ORDERS_TABLE = 'standing_orders';

/**
 * POST /api/school-booking — the one write path for Tassy Scholar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A FAILED WRITE RETURNS A FAILURE. This is the whole reason the wizard was
 * ported rather than linked to.
 *
 * The TassyOps original returned `{ ok: true }` from its catch block on every
 * failure and documented it as a feature: capture the payload to audit_log and
 * "STILL return success to the UI, so the parent's commitment completes". A
 * parent finished six steps, accepted seven policies, committed to a school
 * year and saw "You're all set." while nothing reached an operational table.
 *
 * There is no fallback here, no audit-log consolation write, and no success
 * shape reachable from an error. If the rows are not there, the parent is told.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Order: validate → student → schedule → trip → alert. The three inserts are
 * the only steps that can fail the request; notifications run after the rows
 * exist and can never turn a stored booking into a 500.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a JSON body.' }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;

  /**
   * Bot checks, identical in shape to /api/trip-request.
   *
   * 200 with a null id so a script learns nothing from the status code — and
   * the CLIENT treats a null id as a FAILURE. The honeypot is `hp_token`; never
   * rename it to `company` or `organization`, which are autofill categories
   * browsers fill from the saved profile even when the field is off-screen.
   */
  const trippedHoneypot = typeof raw.hp_token === 'string' && raw.hp_token.trim() !== '';
  const elapsed = typeof raw.elapsedMs === 'number' ? raw.elapsedMs : null;
  const submittedTooFast = elapsed !== null && elapsed < MIN_FILL_MS;

  if (trippedHoneypot || submittedTooFast) {
    console.warn(
      `[school-booking] discarded as bot: honeypot=${trippedHoneypot} elapsedMs=${elapsed ?? 'absent'}`,
    );
    return NextResponse.json({ ok: true, id: null, stored: false });
  }

  const ip = clientIp(request.headers);
  const limit = rateLimit(`school-booking:${ip}`, SIGNUPS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please call us at (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = schoolBookingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: 'Please check the form.', fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const plan = planBySlug(data.plan);
  if (!plan) {
    return NextResponse.json({ ok: false, error: 'Unknown plan.' }, { status: 400 });
  }

  const schedule = resolveSchedule(plan, data);
  if (!schedule) {
    return NextResponse.json(
      { ok: false, error: 'That schedule is incomplete. Please go back and pick your times.' },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();
  const parentName = `${data.parent.first_name} ${data.parent.last_name}`.trim();
  const childName = `${data.child.first_name} ${data.child.last_name}`.trim();

  // ── 1. the student ────────────────────────────────────────────────────────
  const { data: student, error: studentErr } = await db
    .from(STUDENTS_TABLE)
    .insert({
      first_name: data.child.first_name,
      last_name: data.child.last_name,
      grade: data.child.grade || null,
      school_name: data.child.school_name,
      // NULL when the parent typed a school we do not have. That is the review
      // predicate (students where school_id is null), not a failure — the name
      // is kept regardless and the booking goes through.
      school_id: data.child.school_id ?? null,
      school_address: data.child.school_address,
      home_address: data.parent.home_address,
      parent_name: parentName,
      parent_phone: data.parent.phone,
      parent_email: data.parent.email,
      pickup_window_start: schedule.pickup_time,
      pickup_window_end: schedule.return_time,
      /**
       * The trusted-handoff policy promises the driver releases a child only to
       * someone on a pickup list, so that list has to be somewhere structured —
       * not prose in a notes field a dispatcher has to read under pressure.
       */
      authorized_adults: [
        {
          name: data.child.emergency_contact_name,
          phone: data.child.emergency_contact_phone,
          relationship: 'emergency_contact',
          added_at: new Date().toISOString(),
        },
      ],
      // The one non-medical safety field. See SAFETY_NOTE_* in lib/school-plans.
      notes: data.child.safety_note || null,
    })
    .select('id')
    .single();

  if (studentErr || !student?.id) {
    console.error('[school-booking] student insert FAILED:', studentErr?.message ?? 'no row returned');
    return NextResponse.json(
      { ok: false, error: 'We could not save that, and nothing has been booked. Please call (704) 941-8508.' },
      { status: 500 },
    );
  }

  // ── 2. the recurring schedule ─────────────────────────────────────────────
  //
  // The schedule IS the product: Full Year is ~180 school days x 2 runs. Parking
  // it as jsonb on one trip row would leave nothing able to produce tomorrow's
  // ride. standing_orders was built for exactly this; migration
  // 20260929T0100 gave it a parent-direct owner.
  const { data: order, error: orderErr } = await db
    .from(STANDING_ORDERS_TABLE)
    .insert({
      student_id: student.id,
      facility_id: null, // standing_orders_owner_ck: exactly one owner.
      created_by: null, // FKs facility_users; a parent has none.
      service_line: 'scholar',
      passenger_name: childName,
      passenger_phone: data.parent.phone,
      pickup_address: schedule.pickup_address,
      dropoff_address: schedule.dropoff_address,
      days_of_week: schedule.days_of_week,
      pickup_time: schedule.pickup_time,
      return_trip: schedule.return_trip,
      return_time: schedule.return_time,
      starts_on: data.starts_on,
      payer: 'passenger', // the column defaults to 'facility' — wrong here.
      active: true,
      label: `${plan.planLabel} · ${childName}`,
    })
    .select('id')
    .single();

  if (orderErr || !order?.id) {
    console.error('[school-booking] standing order insert FAILED:', orderErr?.message ?? 'no row returned');
    // Best-effort unwind so a failed booking does not leave a child row behind
    // that no schedule points at. If this delete fails there is nothing further
    // to do — but the parent is still told the truth either way.
    await db.from(STUDENTS_TABLE).delete().eq('id', student.id);
    return NextResponse.json(
      { ok: false, error: 'We could not save your schedule, and nothing has been booked. Please call (704) 941-8508.' },
      { status: 500 },
    );
  }

  // ── 3. the first trip, and the commitment record ──────────────────────────
  // Charlotte wall-clock -> UTC instant. requested_at is timestamptz and the
  // database session runs in UTC, so the naive string this used to send was
  // read as 06:45 UTC -- 2:45 in the morning in Charlotte. Every school
  // booking's first trip landed on the dispatch board four hours early.
  // /api/trip-request has always used this helper; this route did not.
  const requestedAt = parseLocalDateTime(`${data.starts_on}T${schedule.pickup_time}:00`)!.toISOString();
  const returnAt = schedule.return_trip && schedule.return_time
    ? parseLocalDateTime(`${data.starts_on}T${schedule.return_time}:00`)!.toISOString()
    : null;
  const { data: trip, error: tripErr } = await db
    .from(TRIP_REQUESTS_TABLE)
    .insert({
      service_line: 'scholar',
      status: 'new',
      contact_name: parentName,
      contact_phone: data.parent.phone,
      contact_email: data.parent.email,
      // Same rule as /api/trip-request: a plus-tagged parent address is a test
      // booking and must not reach the dispatch board as a child's ride.
      is_test_data: looksLikeTestIdentity(data.parent.email),
      pickup_address: schedule.pickup_address,
      dropoff_address: schedule.dropoff_address,
      requested_at: requestedAt,
      return_trip: schedule.return_trip,
      return_at: returnAt,
      scheduled_for: requestedAt,
      passengers: 1,
      // These are real columns, and the recurring engine depends on them. Its
      // idempotency key is (standing_order_id, requested_at); with the ids
      // buried in trip_details only, the nightly run had no way to see that day
      // one already existed and would have booked the child twice.
      student_id: student.id,
      standing_order_id: order.id,
      payer: 'passenger',
      source: `school:${plan.slug}`,
      /**
       * The acknowledgements are a commitment record with legal weight, so they
       * are stored with POLICY_VERSION — "the parent accepted the trusted-handoff
       * policy" is unfalsifiable a year later if the text it refers to has moved
       * on and nothing recorded which text was shown.
       */
      trip_details: {
        plan: plan.slug,
        plan_label: plan.planLabel,
        student_id: student.id,
        standing_order_id: order.id,
        schedule: {
          days_of_week: schedule.days_of_week,
          pickup_time: schedule.pickup_time,
          return_time: schedule.return_time,
          starts_on: data.starts_on,
          program: data.schedule.program ?? null,
          program_location: data.schedule.programLocation ?? null,
        },
        school_id: data.child.school_id ?? null,
        school_needs_review: !data.child.school_id,
        policy_version: POLICY_VERSION,
        policies: data.policies,
      },
    })
    .select('id')
    .single();

  if (tripErr || !trip?.id) {
    console.error('[school-booking] trip insert FAILED:', tripErr?.message ?? 'no row returned');
    await db.from(STANDING_ORDERS_TABLE).delete().eq('id', order.id);
    await db.from(STUDENTS_TABLE).delete().eq('id', student.id);
    return NextResponse.json(
      { ok: false, error: 'We could not save that, and nothing has been booked. Please call (704) 941-8508.' },
      { status: 500 },
    );
  }

  const reference = bookingReference(plan.key, Date.now());

  // Past this line the booking is stored. Nothing below may change the status
  // code — a failed email is a delivery problem, not a lost commitment.
  const notifications = await fireNotifications(trip.id, {
    serviceLine: 'scholar',
    pickupAddress: schedule.pickup_address,
    dropoffAddress: schedule.dropoff_address,
    requestedAt,
    returnTrip: schedule.return_trip,
    returnAt: null,
    passengers: 1,
    mobility: null,
    vehicleNotes: null,
    pickupPlaceId: null,
    pickupLat: null,
    pickupLng: null,
    dropoffPlaceId: null,
    dropoffLat: null,
    dropoffLng: null,
    estimateShown: false,
    contactFirstName: data.parent.first_name,
    contactLastName: data.parent.last_name,
    contactPhone: data.parent.phone,
    contactEmail: data.parent.email,
    preferredContact: 'phone',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return NextResponse.json(
    { ok: true, id: trip.id, reference, studentId: student.id, standingOrderId: order.id, notifications },
    { status: 200 },
  );
}

type ResolvedSchedule = {
  days_of_week: number[];
  pickup_time: string;
  return_time: string | null;
  return_trip: boolean;
  pickup_address: string;
  dropoff_address: string;
};

/**
 * Turn the plan-specific wizard answers into the one shape standing_orders wants.
 *
 * Returns null rather than guessing when a plan's required times are missing —
 * `to24h` also returns null on anything it cannot parse, so a malformed time
 * fails the request instead of silently becoming midnight.
 */
function resolveSchedule(plan: SchoolPlan, data: SchoolBookingInput): ResolvedSchedule | null {
  const home = data.parent.home_address;
  const school = data.child.school_address;

  if (plan.key === 'after_school') {
    const day = isoDayFor(data.schedule.programDay ?? '');
    const time = to24h(data.schedule.programTime);
    if (!day || !time) return null;
    return {
      days_of_week: [day],
      pickup_time: time,
      return_time: null,
      return_trip: false,
      // The child is collected FROM the program and taken home.
      pickup_address: data.schedule.programLocation?.trim() || school,
      dropoff_address: home,
    };
  }

  const am = to24h(data.schedule.am);
  const pm = to24h(data.schedule.pm);

  if (plan.key === 'weekly_pattern') {
    const days = (data.schedule.days ?? []).map(isoDayFor).filter((d): d is number => typeof d === 'number');
    if (days.length === 0 || (!am && !pm)) return null;
    return {
      days_of_week: days.sort((a, b) => a - b),
      // A PM-only week is legal: the morning run is simply not booked.
      pickup_time: am ?? (pm as string),
      return_time: am && pm ? pm : null,
      return_trip: Boolean(am && pm),
      pickup_address: am ? home : school,
      dropoff_address: am ? school : home,
    };
  }

  // full_year — Mon–Fri, AM and PM, both required.
  if (!am || !pm) return null;
  return {
    days_of_week: [1, 2, 3, 4, 5],
    pickup_time: am,
    return_time: pm,
    return_trip: true,
    pickup_address: home,
    dropoff_address: school,
  };
}
