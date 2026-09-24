import { NextResponse } from 'next/server';
import { tripRequestSchema, UNAVAILABLE_SERVICE_LINES } from '@/lib/trip-request';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';
import { fireNotifications } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';

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
  const limit = rateLimit(`trip-request:${ip}`, 5, 60 * 60 * 1000);
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

  const source = typeof raw.source === 'string' ? raw.source.slice(0, 500) : null;
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  let id: string;
  try {
    const { data: inserted, error } = await supabaseAdmin()
      .from(TRIP_REQUESTS_TABLE)
      .insert({
        service_line: data.serviceLine,
        contact_name: data.contactName,
        contact_phone: data.contactPhone,
        contact_email: data.contactEmail || null,
        preferred_contact: data.preferredContact,
        pickup_address: data.pickupAddress,
        dropoff_address: data.dropoffAddress,
        requested_at: new Date(data.requestedAt).toISOString(),
        return_trip: data.returnTrip,
        return_at: data.returnTrip && data.returnAt ? new Date(data.returnAt).toISOString() : null,
        passengers: data.passengers ?? 1,
        mobility: data.mobility || null,
        vehicle_notes: data.vehicleNotes || null,
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
  const notifications = await fireNotifications(id, data);

  return NextResponse.json({ ok: true, id, notifications }, { status: 200 });
}
