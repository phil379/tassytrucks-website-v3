import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { OPERATING_TIME_ZONE } from '@/lib/time';

/**
 * "Where is my ride": a private, no-login page at /ride/<token> that the rider (and up to two family
 * numbers listed on the booking) are texted when a trip is assigned.
 *
 * WHO SENDS THE TEXT: not this site. TassyOps assigns the trip, calls POST /api/internal/ride-link
 * with { tripId }, gets back { url, recipients } and sends the texts itself (consent, quiet hours,
 * STOP and dry-run all live there). This site only mints the link and shows the page.
 *
 * THE TOKEN: 32 random bytes (256 bits), base64url, 43 characters. Only its sha256 is stored, in
 * public.ride_tracking_tokens, bound to one trip. Nothing in the URL is a name, a phone number or a
 * trip number.
 *
 * EXPIRY: the link dies 2 hours after the trip ends (completed_at, or the dropped_off / completed
 * event when completed_at was never stamped). Until the trip ends the link stays valid, but never
 * past a hard cap stored on the row: the scheduled pickup + 24 hours (and at least 2 hours from the
 * moment it was minted, so a link minted late still works for a while).
 *
 * WHAT THE PAGE MAY SHOW, and nothing else: the driver's FIRST name, the vehicle's color, make and
 * model (no plate), the status, the pickup STREET (no house number, city, state or ZIP) and the
 * scheduled pickup time. Never a phone number, a full name, a price or any pay figure. Everything
 * the page renders goes through buildRideView() below, which only copies those fields.
 *
 * Everything in this file is pure or takes its data access as an argument, so the tests run with
 * no database and no network. The Supabase-backed store is lib/ride-link.server.ts.
 */

/* ───────────────────────────────────────────────────────────── the flag */

/** RIDE_TRACKING_LINK_ENABLED=true turns this on. Anything else (unset, "1", "TRUE") is off. */
export function rideTrackingEnabled(): boolean {
  return process.env.RIDE_TRACKING_LINK_ENABLED === 'true';
}

/* ─────────────────────────────────────────────────────────── the token */

export const RIDE_TOKEN_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function generateRideToken(): string {
  return randomBytes(RIDE_TOKEN_BYTES).toString('base64url');
}

export function isValidRideToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

/** What is stored. The raw token exists only in the text message and the rider's address bar. */
export function hashRideToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app').replace(/\/+$/, '');
}

export function rideUrlFor(token: string): string {
  return `${siteBase()}/ride/${token}`;
}

/**
 * Constant-time check of an `Authorization: Bearer <secret>` header. Both sides are hashed first so
 * the comparison is always over 32 bytes and leaks neither the content nor the length of the secret.
 */
export function bearerMatches(header: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret || typeof header !== 'string') return false;
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return false;
  const given = createHash('sha256').update(m[1], 'utf8').digest();
  const expected = createHash('sha256').update(secret, 'utf8').digest();
  return timingSafeEqual(given, expected);
}

/* ─────────────────────────────────────────────────────────── expiry */

const HOUR_MS = 60 * 60 * 1000;
/** The link stays alive this long after the trip ends. */
export const AFTER_TRIP_MS = 2 * HOUR_MS;
/** Hard cap: never valid past the scheduled pickup plus this, even if the trip is never closed. */
export const HARD_CAP_AFTER_PICKUP_MS = 24 * HOUR_MS;
/** A link minted late (pickup already long past) still lives at least this long. */
export const MIN_LIFETIME_MS = 2 * HOUR_MS;

function ms(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** The hard cap stored on the token row at mint time. */
export function hardCapExpiry(
  trip: { scheduledFor: string | null; requestedAt: string | null },
  now: Date,
): Date {
  const pickup = ms(trip.scheduledFor) ?? ms(trip.requestedAt) ?? now.getTime();
  return new Date(Math.max(pickup + HARD_CAP_AFTER_PICKUP_MS, now.getTime() + MIN_LIFETIME_MS));
}

/** When the trip ended, or null while it has not. */
export function tripEndedAt(trip: { completedAt: string | null }, events: readonly RideEvent[]): number | null {
  const completed = ms(trip.completedAt);
  if (completed !== null) return completed;
  let latest: number | null = null;
  for (const e of events) {
    if (e.event !== 'dropped_off' && e.event !== 'completed') continue;
    const at = ms(e.at);
    if (at !== null && (latest === null || at > latest)) latest = at;
  }
  return latest;
}

/** Is a token row still good right now? Revoked, past its hard cap, or 2h after the trip ended: no. */
export function tokenIsLive(
  token: { expiresAt: string; revokedAt: string | null },
  tripEnd: number | null,
  now: Date,
): boolean {
  if (token.revokedAt) return false;
  const cap = ms(token.expiresAt);
  if (cap === null || now.getTime() >= cap) return false;
  if (tripEnd !== null && now.getTime() >= tripEnd + AFTER_TRIP_MS) return false;
  return true;
}

/* ─────────────────────────────────────────────────────────── status */

export type RideEvent = { event: string; at: string };

export type RideStatus = 'assigned' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed';

export const RIDE_STATUS_LABEL: Record<RideStatus, string> = {
  assigned: 'Driver assigned',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed: 'Completed',
};

/** Events that move the ride along. created / confirmed / note say nothing about where the driver is. */
const EVENT_STATUS: Record<string, RideStatus | 'inactive' | 'none'> = {
  assigned: 'assigned',
  unassigned: 'none',
  en_route: 'on_the_way',
  arrived: 'arrived',
  picked_up: 'in_progress',
  dropped_off: 'completed',
  completed: 'completed',
  no_show: 'inactive',
  cancelled: 'inactive',
};

/**
 * The status the page shows, or 'inactive' (cancelled / no-show: the neutral page) or 'none' (no
 * driver on the trip right now: also the neutral page). The latest movement event wins; with none,
 * trip_requests.status decides. A cancelled or completed trip row overrides a stale event trail.
 */
export function rideStatusFrom(
  trip: { status: string | null; completedAt: string | null },
  events: readonly RideEvent[],
): RideStatus | 'inactive' | 'none' {
  const rowStatus = (trip.status ?? '').toLowerCase();
  if (rowStatus === 'cancelled') return 'inactive';
  if (trip.completedAt || rowStatus === 'completed' || rowStatus === 'closed') return 'completed';

  let latest: { status: RideStatus | 'inactive' | 'none'; at: number } | null = null;
  for (const e of events) {
    const mapped = EVENT_STATUS[e.event];
    const at = ms(e.at);
    if (!mapped || at === null) continue;
    // `>=` so that of two events stamped the same instant, the later row wins.
    if (latest === null || at >= latest.at) latest = { status: mapped, at };
  }
  if (latest) return latest.status;
  return rowStatus === 'assigned' ? 'assigned' : 'none';
}

/**
 * The map is drawn only while the ride is ACTIVE (on the way, arrived, in progress) and only with a
 * location the driver app actually reported. It stops at drop-off: never on assigned or completed
 * (Phil, 2026-11-12).
 */
export const ACTIVE_STATUSES: readonly RideStatus[] = ['on_the_way', 'arrived', 'in_progress'];

export function isActiveRide(status: RideStatus | 'none' | 'inactive'): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function canShowMap(status: RideStatus, location: DriverLocation | null | undefined): boolean {
  if (!isActiveRide(status)) return false;
  return !!location && Number.isFinite(location.lat) && Number.isFinite(location.lng);
}

/* ─────────────────────────────────────────────────── privacy-safe text */

/** First name only: the first word, letters and name punctuation only, so a phone typed into the field never shows. */
export function firstNameOnly(raw: string | null | undefined): string | null {
  const word = String(raw ?? '').trim().split(/\s+/)[0] ?? '';
  const clean = word.replace(/[^\p{L}'’.-]/gu, '').slice(0, 30);
  return /\p{L}/u.test(clean) ? clean : null;
}

function cleanVehicleText(raw: string | null | undefined): string | null {
  const v = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
  // A run of 7+ digits is not a color or a model; it is a phone number or a VIN typed in the wrong box.
  if (!v || /\d[\d\s().-]{6,}\d/.test(v)) return null;
  return v;
}

/** "Silver Toyota Sienna". No plate, ever: the plate is not even read from the database. */
export function vehicleLabel(v: { color: string | null; make: string | null; model: string | null } | null): string | null {
  if (!v) return null;
  const parts = [cleanVehicleText(v.color), cleanVehicleText(v.make), cleanVehicleText(v.model)].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

const HOUSE_NUMBER = /^\s*(?:\d+[A-Za-z]?(?:[-/]\d+[A-Za-z]?)?|\d+\s+\d\/\d)\s+/;
const UNIT_TAIL = /\s*(?:#\s*\S+|\b(?:apt|apartment|unit|ste|suite|bldg|building|fl|floor|rm|room|lot)\b\.?\s*\S*)\s*$/i;
const STATE_ZIP_TAIL = /\s+(?:[A-Z]{2}\s+)?\d{5}(?:-\d{4})?\s*$/;

/**
 * The pickup STREET and nothing else: "1220 Tourmaline Rd, Apt 1910, Charlotte, NC 28202" becomes
 * "Tourmaline Rd". The first part before a comma is the street line; the house number, any unit,
 * the city, state and ZIP are all dropped. A place name ("Charlotte Douglas Airport") passes as is.
 */
export function pickupStreetOnly(address: string | null | undefined): string | null {
  const segments = String(address ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    let s = seg.replace(STATE_ZIP_TAIL, '').replace(UNIT_TAIL, '').replace(HOUSE_NUMBER, '').trim();
    s = s.replace(/^\d+\s*$/, ''); // a segment that was only a house number
    if (/\p{L}/u.test(s)) return s.slice(0, 80);
  }
  return null;
}

/** "Tue, Nov 10, 3:00 PM" in Charlotte time. */
export function formatScheduled(iso: string | null | undefined): string | null {
  const t = ms(iso);
  if (t === null) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: OPERATING_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(t));
}

/* ─────────────────────────────────────────────────────────── the view */

export type DriverLocation = { lat: number; lng: number; at: string };

/** Everything the page can render. Built only by buildRideView, which copies nothing else. */
export type RideView = {
  status: RideStatus;
  statusLabel: string;
  driverFirstName: string | null;
  vehicle: string | null;
  pickupStreet: string | null;
  /** The arrival estimate. Today always the scheduled pickup time, labelled as scheduled. */
  scheduledLabel: string | null;
  showMap: boolean;
  location: DriverLocation | null;
};

export function buildRideView(input: {
  status: RideStatus;
  driverFirstName: string | null;
  vehicle: { color: string | null; make: string | null; model: string | null } | null;
  pickupAddress: string | null;
  scheduledFor: string | null;
  requestedAt: string | null;
  location?: DriverLocation | null;
}): RideView {
  const showMap = canShowMap(input.status, input.location);
  // An estimate only means something before pickup.
  const wantsEstimate = input.status === 'assigned' || input.status === 'on_the_way';
  return {
    status: input.status,
    statusLabel: RIDE_STATUS_LABEL[input.status],
    driverFirstName: firstNameOnly(input.driverFirstName),
    vehicle: vehicleLabel(input.vehicle),
    pickupStreet: input.status === 'completed' ? null : pickupStreetOnly(input.pickupAddress),
    scheduledLabel: wantsEstimate ? formatScheduled(input.scheduledFor ?? input.requestedAt) : null,
    showMap,
    location: showMap ? input.location ?? null : null,
  };
}

/* ─────────────────────────────────────────────── phones and consent */

/** A US number as +1XXXXXXXXXX, or null. */
export function normalizeUsPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  if (d.length !== 10 || /^[01]/.test(d)) return null;
  return `+1${d}`;
}

export const FAMILY_PHONE_ERROR = 'Enter a 10-digit US mobile number, or leave it blank';

/**
 * The family numbers to merge into trip_details, as flat primitives. Blank fields are dropped; a
 * number that repeats the rider's or the other family number is dropped; anything that is not a
 * US number is an error. Only called when the flag is on and the booking opted into texts.
 */
export { FAMILY_PERMISSION_LABEL } from '@/lib/ride-link-copy';
export const FAMILY_PERMISSION_ERROR = 'Please confirm these family members agreed to get ride texts, or clear the numbers';

export type FamilyPhoneValues = { family_phone_1?: string; family_phone_2?: string; family_permission_confirmed?: true };

export function buildFamilyPhones(
  raw1: unknown,
  raw2: unknown,
  contactPhone: string,
  permission: unknown = false,
): { ok: true; values: FamilyPhoneValues } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const rider = normalizeUsPhone(contactPhone);
  const kept: string[] = [];
  ([['familyPhone1', raw1], ['familyPhone2', raw2]] as const).forEach(([key, raw]) => {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) return;
    const phone = text.length <= 40 ? normalizeUsPhone(text) : null;
    if (!phone) {
      errors[key] = FAMILY_PHONE_ERROR;
      return;
    }
    if (phone !== rider && !kept.includes(phone)) kept.push(phone);
  });
  if (Object.keys(errors).length) return { ok: false, errors };
  if (kept.length === 0) return { ok: true, values: {} };
  // A family number is stored only with the booker's confirmation that the person agreed.
  if (permission !== true && permission !== 'true' && permission !== 'on') {
    return { ok: false, errors: { familyPermission: FAMILY_PERMISSION_ERROR } };
  }
  const values: FamilyPhoneValues = { family_permission_confirmed: true };
  if (kept[0]) values.family_phone_1 = kept[0];
  if (kept[1]) values.family_phone_2 = kept[1];
  return { ok: true, values };
}

/**
 * Who gets a ride text, and when (Phil, 2026-11-12):
 *   rider   the booker, at assignment, at any hour            -> sendWhen 'any_hour'
 *   family  up to two numbers, ONLY with the booker's confirmed permission, and only while the
 *           ride is active (on the way, arrived, in progress)  -> sendWhen 'while_active'
 * One text per audience per ride; nothing to a number after it texted STOP (TassyOps' STOP list).
 */
export type RideAudience = 'rider' | 'family';
export type RideRecipient = { phone: string; role: RideAudience; sendWhen: 'any_hour' | 'while_active' };

/**
 * Who may be texted the link. Consent is recorded per booking: trip_details.sms_consent === true,
 * the number it was given for (sms_consent_phone) still equals the contact phone, and the
 * contact_sms_consent column has not been set to false. Without all three, NOBODY is returned:
 * not the rider, and not the family numbers either, because they ride on the booking's consent.
 */
export function rideRecipients(trip: {
  contactPhone: string | null;
  contactSmsConsent: boolean | null;
  tripDetails: Record<string, unknown> | null;
}): RideRecipient[] {
  const d = trip.tripDetails ?? {};
  if (d.sms_consent !== true) return [];
  if (trip.contactSmsConsent === false) return [];
  const rider = normalizeUsPhone(trip.contactPhone);
  const consented = normalizeUsPhone(d.sms_consent_phone);
  if (!rider || !consented || rider !== consented) return [];

  const out: RideRecipient[] = [{ phone: rider, role: 'rider', sendWhen: 'any_hour' }];
  // Family numbers only when the booker confirmed, on the form, that these people agreed to the texts.
  if (d.family_permission_confirmed !== true) return out;
  for (const key of ['family_phone_1', 'family_phone_2'] as const) {
    const phone = normalizeUsPhone(d[key]);
    if (phone && !out.some((r) => r.phone === phone)) out.push({ phone, role: 'family', sendWhen: 'while_active' });
  }
  return out;
}

/* ─────────────────────────────────────────── data access, injected */

export type RideTripRecord = {
  id: string;
  status: string | null;
  driverId: string | null;
  vehicleId: string | null;
  pickupAddress: string | null;
  requestedAt: string | null;
  scheduledFor: string | null;
  completedAt: string | null;
  contactPhone: string | null;
  contactSmsConsent: boolean | null;
  tripDetails: Record<string, unknown> | null;
};

export type RideTokenRecord = { id: string; tripId: string; expiresAt: string; revokedAt: string | null };

/** What the logic below needs from the database. lib/ride-link.server.ts is the real one. */
export interface RideLinkStore {
  getTrip(tripId: string): Promise<RideTripRecord | null>;
  getDriverFirstName(driverId: string): Promise<string | null>;
  getVehicle(vehicleId: string): Promise<{ color: string | null; make: string | null; model: string | null } | null>;
  getEvents(tripId: string): Promise<RideEvent[]>;
  /** Nothing stores a driver's position today, so the real store always answers null. */
  getDriverLocation(tripId: string): Promise<DriverLocation | null>;
  insertToken(row: { tripId: string; tokenHash: string; expiresAt: string; audience: RideAudience }): Promise<{ id: string }>;
  /** True when a not-revoked link was already issued for this trip and audience (one text per ride). */
  hasIssued(tripId: string, audience: RideAudience): Promise<boolean>;
  findTokenByHash(tokenHash: string): Promise<RideTokenRecord | null>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTripId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export type MintResult =
  | { kind: 'disabled' }
  | { kind: 'not_found' }
  | { kind: 'not_active' }
  | { kind: 'no_recipients' }
  | { kind: 'already_sent' }
  | { kind: 'minted'; url: string; recipients: RideRecipient[]; expiresAt: string; audience: RideAudience };

export function isAudience(value: unknown): value is RideAudience {
  return value === 'rider' || value === 'family';
}

/**
 * Mint the link for one AUDIENCE of a trip (Phil, 2026-11-12):
 *   'rider'   the booker, once the trip is assigned or active; ops may text it at any hour.
 *   'family'  the confirmed family numbers, only while the ride is active (on the way, arrived,
 *             in progress); 'not_active' otherwise.
 * ONE link per audience per ride: a second call returns 'already_sent' and mints nothing, so ops
 * never texts the same people twice. With no consented recipient in the audience, nothing is minted.
 * Throws only on a database failure; the route turns that into a 503.
 */
export async function mintRideLink(opts: {
  store: RideLinkStore;
  tripId: string;
  enabled: boolean;
  audience?: RideAudience;
  now?: Date;
  token?: string;
}): Promise<MintResult> {
  if (!opts.enabled) return { kind: 'disabled' };
  const audience: RideAudience = opts.audience ?? 'rider';
  const now = opts.now ?? new Date();
  const trip = await opts.store.getTrip(opts.tripId);
  if (!trip) return { kind: 'not_found' };

  const events = await opts.store.getEvents(trip.id);
  const status = rideStatusFrom(trip, events);
  if (status === 'inactive' || status === 'completed') return { kind: 'not_active' };
  if (audience === 'family' && !isActiveRide(status)) return { kind: 'not_active' };

  const recipients = rideRecipients(trip).filter((r) => r.role === audience);
  if (recipients.length === 0) return { kind: 'no_recipients' };
  if (await opts.store.hasIssued(trip.id, audience)) return { kind: 'already_sent' };

  const token = opts.token ?? generateRideToken();
  const expiresAt = hardCapExpiry(trip, now).toISOString();
  await opts.store.insertToken({ tripId: trip.id, tokenHash: hashRideToken(token), expiresAt, audience });
  return { kind: 'minted', url: rideUrlFor(token), recipients, expiresAt, audience };
}

export type RidePageResult = { kind: 'neutral' } | { kind: 'ride'; view: RideView };

const NEUTRAL: RidePageResult = { kind: 'neutral' };

/**
 * What /ride/<token> shows. A wrong token, an expired or revoked one, a cancelled trip, a database
 * error and the flag being off all come back as the SAME neutral result, so the page cannot be used
 * to tell a real link from a made-up one. Never throws.
 */
export async function loadRidePage(opts: {
  store: RideLinkStore;
  token: unknown;
  enabled: boolean;
  now?: Date;
}): Promise<RidePageResult> {
  if (!opts.enabled || !isValidRideToken(opts.token)) return NEUTRAL;
  const now = opts.now ?? new Date();
  try {
    const row = await opts.store.findTokenByHash(hashRideToken(opts.token));
    if (!row) return NEUTRAL;
    const trip = await opts.store.getTrip(row.tripId);
    if (!trip) return NEUTRAL;
    const events = await opts.store.getEvents(trip.id);
    if (!tokenIsLive(row, tripEndedAt(trip, events), now)) return NEUTRAL;

    const status = rideStatusFrom(trip, events);
    if (status === 'inactive' || status === 'none') return NEUTRAL;

    const [driverFirstName, vehicle, location] = await Promise.all([
      trip.driverId ? opts.store.getDriverFirstName(trip.driverId) : Promise.resolve(null),
      trip.vehicleId ? opts.store.getVehicle(trip.vehicleId) : Promise.resolve(null),
      status === 'on_the_way' || status === 'arrived' ? opts.store.getDriverLocation(trip.id) : Promise.resolve(null),
    ]);

    return {
      kind: 'ride',
      view: buildRideView({
        status,
        driverFirstName,
        vehicle,
        pickupAddress: trip.pickupAddress,
        scheduledFor: trip.scheduledFor,
        requestedAt: trip.requestedAt,
        location,
      }),
    };
  } catch (e) {
    console.error('[ride-link] page lookup failed:', (e as Error).message);
    return NEUTRAL;
  }
}
