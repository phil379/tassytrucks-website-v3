import { NextResponse } from 'next/server';
import { fullName, tripRequestSchema, UNAVAILABLE_SERVICE_LINES } from '@/lib/trip-request';
import { estimateTrip } from '@/lib/quote';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { fireNotifications } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { coerceLatLng, roadDistance } from '@/lib/road-distance';
import { validateDetails, type DetailValidation } from '@/lib/trip-details';
import { parseLocalDateTime } from '@/lib/time';

/**
 * Submissions allowed per IP per hour.
 *
 * Deliberately a knob rather than a literal. Two reasons:
 *
 *   1. A clinic or office coordinator booking rides for several patients comes
 *      from one NAT'd IP shared with the whole building. Five is fine for a
 *      household and wrong for a facility partner, which is the customer the
 *      NEMT side is trying to win.
 *   2. The Playwright suite submits more in one run than any real visitor
 *      would, and a 429 there fails tests that are asserting something else
 *      entirely. playwright.config.ts sets this high for the test server.
 *
 * This is a speed bump against form spam, not a security control -
 * lib/rate-limit.ts is explicit about why (per-instance memory on serverless).
 */
const REQUESTS_PER_IP_PER_HOUR = Number(process.env.TRIP_REQUEST_RATE_LIMIT) || 5;


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/trip-request — the one write path for the request pipeline.
 *
 * Order matters: validate, store, then alert. The insert is the only step that
 * can fail the request. Notifications run after the row exists and can never
 * turn a captured request into a 500.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a JSON body.' }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;

  // Honeypot. A real browser leaves this hidden field empty. Answer 200 so a bot
  // learns nothing from the response, but store nothing and alert no one.
  if (typeof raw.company === 'string' && raw.company.trim() !== '') {
    return NextResponse.json({ ok: true, id: null });
  }

  const ip = clientIp(request.headers);
  const limit = rateLimit(`trip-request:${ip}`, REQUESTS_PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please call us at (704) 941-8508.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  // Explicit guard for lines that exist as a product but are not currently
  // bookable. The zod enum below already rejects these, but this states the
  // reason out loud and survives someone re-adding a line to the enum without
  // meaning to re-open requests for it.
  if (typeof raw.serviceLine === 'string' && UNAVAILABLE_SERVICE_LINES.includes(raw.serviceLine as never)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'That service is not currently accepting requests. Please call (704) 941-8508 to ask about availability.',
        fieldErrors: { serviceLine: 'Not currently available' },
      },
      { status: 400 },
    );
  }

  const parsed = tripRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: 'Please check the form.', fieldErrors }, { status: 400 });
  }

  const data = parsed.data;

  // The per-service answers get their own pass, against the spec rather than
  // against zod. A missing pet name or an unrecognised grade comes back here as
  // a field error keyed `details.<key>`, which is exactly what the form expects.
  //
  // OMITTING THE KEY ENTIRELY IS NOT THE SAME AS LEAVING IT BLANK. The form
  // always posts the object, even empty, so a customer always gets the
  // questions enforced. A caller that does not send the key at all is an older
  // integration that predates these questions, and the answer to that is a row
  // a dispatcher has to chase on the phone — not a rejected booking. Same rule
  // as the legacy single `contactName` field: keep the old shape working.
  const suppliedDetails = data.tripDetails !== undefined && data.tripDetails !== null;
  const detailCheck: DetailValidation = suppliedDetails
    ? validateDetails(data.serviceLine, data.tripDetails)
    : { ok: true, values: {} };

  if (!detailCheck.ok) {
    const fieldErrors: Record<string, string> = {};
    for (const [key, message] of Object.entries(detailCheck.errors)) {
      fieldErrors[`details.${key}`] = message;
    }
    return NextResponse.json(
      { ok: false, error: 'Please check the form.', fieldErrors },
      { status: 400 },
    );
  }
  // An empty object is stored as NULL, not as `{}`. A dispatcher scanning the
  // queue should be able to tell "this line asks nothing extra" from "they
  // answered nothing", and `{}` reads as neither.
  const tripDetails = Object.keys(detailCheck.values).length > 0 ? detailCheck.values : null;

  const source = typeof raw.source === 'string' ? raw.source.slice(0, 500) : null;
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  // The SAME measured distance the visitor was shown, fetched again here rather
  // than trusted from the body - a price the browser can edit is not a price.
  // Cached in lib/road-distance.ts, so in practice this is the browser's own
  // lookup served back with no second call to Google. Null is fine: the engine
  // falls back to the straight-line estimate exactly as the form did.
  const pickupPoint = coerceLatLng({ lat: data.pickupLat, lng: data.pickupLng });
  const dropoffPoint = coerceLatLng({ lat: data.dropoffLat, lng: data.dropoffLng });
  const measured =
    pickupPoint && dropoffPoint ? await roadDistance(pickupPoint, dropoffPoint) : null;

  // Recomputed here from the coordinates that arrived, never taken from the
  // request body. Null whenever the addresses were typed instead of picked -
  // there is nothing to measure, and a guessed price is worse than none.
  const quoted = estimateTrip({
    serviceLine: data.serviceLine,
    roadMiles: measured?.miles ?? null,
    // Read from the VALIDATED details, so the stored estimate matches the one
    // on screen. The engine ignores it off Recovery.
    escort: tripDetails?.escort === 'yes',
    pickup: { lat: data.pickupLat, lng: data.pickupLng },
    dropoff: { lat: data.dropoffLat, lng: data.dropoffLng },
    // The typed addresses are passed too, so a row with no picked place still
    // gets a ZIP-derived estimate rather than a blank in the ops queue.
    pickupAddress: data.pickupAddress,
    dropoffAddress: data.dropoffAddress,
    requestedAt: data.requestedAt,
    passengers: data.passengers,
    returnTrip: data.returnTrip,
    // Wheelchair moves Tassy Care onto the WAV card. The form has always
    // collected this; until now the price ignored it.
    mobility: data.mobility,
  });

  // Only a real estimate is stored as a number. A 'quote-only' answer (Scholar,
  // or a trip past the last band) is NOT a price and must not be written into
  // the estimate columns, where /ops would read it as one.
  const estimate = quoted?.kind === 'estimate' ? quoted : null;

  let id: string;
  try {
    const { data: inserted, error } = await supabaseAdmin()
      .from(TRIP_REQUESTS_TABLE)
      .insert({
        service_line: data.serviceLine,
        // contact_name stays the combined value: /ops, the notification
        // templates and every row written before the split all read it.
        contact_name: fullName(data),
        contact_first_name: data.contactFirstName,
        contact_last_name: data.contactLastName,
        contact_phone: data.contactPhone,
        contact_email: data.contactEmail || null,
        preferred_contact: data.preferredContact,
        pickup_address: data.pickupAddress,
        dropoff_address: data.dropoffAddress,
        // Charlotte wall-clock -> UTC instant. Never `new Date(naiveString)`
        // here: this function runs in UTC and would shift the trip 4 hours.
        requested_at: parseLocalDateTime(data.requestedAt)!.toISOString(),
        return_trip: data.returnTrip,
        return_at:
          data.returnTrip && data.returnAt
            ? (parseLocalDateTime(data.returnAt)?.toISOString() ?? null)
            : null,
        // Set only when the visitor PICKED a suggestion. A typed address leaves
        // these null, which is how a later mileage quote can tell which rows it
        // can measure and which have to be geocoded first.
        pickup_place_id: data.pickupPlaceId || null,
        pickup_lat: data.pickupLat ?? null,
        pickup_lng: data.pickupLng ?? null,
        dropoff_place_id: data.dropoffPlaceId || null,
        dropoff_lat: data.dropoffLat ?? null,
        dropoff_lng: data.dropoffLng ?? null,
        estimate_low_cents: estimate?.lowCents ?? null,
        estimate_high_cents: estimate?.highCents ?? null,
        estimate_miles: estimate?.miles ?? null,
        // Only true when the range was on screen. An estimate computed for the
        // ops queue while the public display is off is not a promise.
        estimate_shown: Boolean(estimate && data.estimateShown),
        passengers: data.passengers ?? 1,
        mobility: data.mobility || null,
        vehicle_notes: data.vehicleNotes || null,
        // Validated above, never the raw body. See lib/trip-details.ts.
        trip_details: tripDetails,
        source,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    // PostgREST does not throw — an ignored `error` is how rows silently vanish.
    if (error) throw new Error(error.message);
    if (!inserted?.id) throw new Error('Insert returned no id');

    id = inserted.id as string;
  } catch (err) {
    console.error('[trip-request] INSERT FAILED:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: 'We could not save your request. Please call (704) 941-8508.' },
      { status: 500 },
    );
  }

  // Past this line the request is captured. Nothing below may change the status code.
  // The alert gets the VALIDATED details, the same object that went into the
  // row — never the raw body, or a dispatcher's email could be made to print
  // whatever a script chose to post.
  const notifications = await fireNotifications(id, { ...data, tripDetails });

  return NextResponse.json({ ok: true, id, notifications }, { status: 200 });
}
