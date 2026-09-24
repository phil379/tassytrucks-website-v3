import { z } from 'zod';
import { parseLocalDateTimeMs, toLocalDateTimeInput } from '@/lib/time';

/**
 * The Trip Request pipeline — shared contract between the client form and the
 * server route. The server re-validates with this same schema; client-side
 * validation is a courtesy, the server is authoritative.
 *
 * PRIVACY — HARD REQUIREMENT: nothing in this pipeline collects a diagnosis,
 * procedure name, condition, or medication. `vehicleNotes` exists to prepare the
 * VEHICLE (a wheelchair, a carrier, a cooler) and the form says so in copy. Do
 * not add a clinical field here.
 */

/**
 * The service lines, in the order a visitor sees them.
 *
 * RECOVERY AND CONCIERGE ARE DIFFERENT PRODUCTS, NOT TIERS OF ONE. They used to
 * be a single line called "VIP Concierge" and that was the costliest modelling
 * mistake on the card:
 *
 *   recovery  — the ride home after a procedure. Bought because a surgery
 *               center will not discharge a sedated patient without a
 *               responsible adult. Inelastic. Round trip, driver waits.
 *   concierge — airport, golf, dinner, events. Bought because someone wants a
 *               good car. Elastic, and needs no medical training at all.
 *
 * Collapsing them put a trained medical operator into golf trips — pure cost
 * against a customer who will not pay for it — and sold a discharge as a
 * luxury, to a patient whose free alternative is asking their daughter.
 *
 * `wellness` is retired into UNAVAILABLE_SERVICE_LINES rather than deleted, so
 * rows written before the split still render a real name in the ops queue.
 */
const ALL_SERVICE_LINES = [
  { value: 'care', label: 'Tassy Care — medical appointments', short: 'Tassy Care', href: '/nemt' },
  { value: 'recovery', label: 'Tassy Recovery — ride home after a procedure', short: 'Tassy Recovery', href: '/recover' },
  { value: 'concierge', label: 'Tassy Concierge — airport, golf, events', short: 'Tassy Concierge', href: '/vip' },
  { value: 'pet', label: 'Winnie Ride — pet transport', short: 'Winnie Ride', href: '/winnie' },
  { value: 'scholar', label: 'Tassy Scholar — school and after-school', short: 'Tassy Scholar', href: '/school' },
  { value: 'wellness', label: 'Tassy Wellness — IV therapy, med-spa', short: 'Tassy Wellness', href: '/renew' },
  { value: 'guardian', label: 'Tassy Guardian — oncology, discharge', short: 'Tassy Guardian', href: '/recover' },
] as const;

export type ServiceLine = (typeof ALL_SERVICE_LINES)[number]['value'];

/**
 * Service lines that exist as a product but cannot currently be requested.
 *
 * `guardian` (Tassy Guardian) requires CNA-trained drivers the company does not
 * have right now. The /recover page stays up and the line keeps its identity —
 * it is simply not bookable, and its CTA asks about availability instead.
 *
 * Removing it from SERVICE_LINES does three things at once: it leaves the
 * dropdown, it drops out of SERVICE_VALUES so the shared zod enum rejects it on
 * the server, and `serviceLabel()` still resolves it so existing rows in the
 * ops queue keep rendering a real name.
 */
export const UNAVAILABLE_SERVICE_LINES: readonly ServiceLine[] = ['guardian', 'wellness'];

export function isRequestable(value: string): value is ServiceLine {
  return SERVICE_VALUES.includes(value as ServiceLine);
}

/** The lines a visitor can actually pick. Drives the dropdown AND the zod enum. */
export const SERVICE_LINES = ALL_SERVICE_LINES.filter(
  (s) => !UNAVAILABLE_SERVICE_LINES.includes(s.value),
);

export const SERVICE_VALUES = SERVICE_LINES.map((s) => s.value) as [ServiceLine, ...ServiceLine[]];

/**
 * The lines where the driver waits on site, which drives the extra copy block.
 *
 * Only Recovery now. Concierge is one way and the driver is released — if a
 * Concierge customer needs the car to wait, the product they want is Recovery,
 * and the form should not imply otherwise.
 */
export const WAIT_TIME_LINES: ServiceLine[] = ['recovery'];

/**
 * Mobility options, by service line.
 *
 * A single shared list was asking pet owners whether their dog uses a walker or
 * a cane, and asking dialysis patients whether they travel in a pet carrier.
 * Both questions read as "this form was not built for you", on the one page
 * where that costs a booking.
 *
 * So the question itself changes with the service line: who is travelling
 * decides which list, which label, and which default. `other` is in both lists
 * deliberately - it is the escape hatch for either.
 */
export const PASSENGER_MOBILITY_OPTIONS = [
  { value: 'ambulatory', label: 'Ambulatory — walks unaided' },
  { value: 'walker', label: 'Walker / cane' },
  { value: 'wheelchair', label: 'Wheelchair' },
  { value: 'other', label: 'Other' },
] as const;

export const PET_MOBILITY_OPTIONS = [
  { value: 'pet_carrier', label: 'Travels in a carrier or crate' },
  { value: 'pet_leash', label: 'On a leash or harness' },
  { value: 'pet_assist', label: 'Needs help getting in and out' },
  { value: 'other', label: 'Other' },
] as const;

/** Service lines whose passenger is an animal. */
export const PET_LINES: readonly ServiceLine[] = ['pet'];

export function isPetLine(service: string): boolean {
  return PET_LINES.includes(service as ServiceLine);
}

/** Every value either list can produce. Drives the shared zod enum. */
export const MOBILITY_VALUES = [
  ...new Set([
    ...PASSENGER_MOBILITY_OPTIONS.map((m) => m.value),
    ...PET_MOBILITY_OPTIONS.map((m) => m.value),
  ]),
] as [string, ...string[]];

/** The list to render for this service line. */
export function mobilityOptionsFor(service: string) {
  return isPetLine(service) ? PET_MOBILITY_OPTIONS : PASSENGER_MOBILITY_OPTIONS;
}

/** The question to ask above that list. */
export function mobilityLabelFor(service: string): string {
  return isPetLine(service) ? 'How does your pet travel?' : 'Mobility';
}

/** "Passengers" is the wrong noun for a crate of cats. */
export function passengerLabelFor(service: string): string {
  return isPetLine(service) ? 'Pets' : 'Passengers';
}

export function defaultMobilityFor(service: string): string {
  return isPetLine(service) ? 'pet_carrier' : 'ambulatory';
}

/** Resolves ANY stored value to a readable label, for /ops and emails. */
export function mobilityLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const all = [...PASSENGER_MOBILITY_OPTIONS, ...PET_MOBILITY_OPTIONS];
  return all.find((m) => m.value === value)?.label ?? value;
}

/**
 * Kept for anything still importing the old flat list. New code should call
 * `mobilityOptionsFor(service)` so the question matches the passenger.
 * @deprecated
 */
export const MOBILITY_OPTIONS = PASSENGER_MOBILITY_OPTIONS;

export const PREFERRED_CONTACT = ['phone', 'text', 'email'] as const;

/** Earliest bookable time: now + 4 hours. */
export const MIN_LEAD_TIME_MS = 4 * 60 * 60 * 1000;

export const VEHICLE_NOTES_MAX = 300;

/** Verbatim copy — these strings are asserted by the test suite. */
export const COPY = {
  headline: 'Request a ride',
  submit: 'Request a Ride',
  medicalWarning:
    'Please do not include medical details, diagnoses, or procedure names.',
  confirmation:
    'We confirm every request by phone or text within 2 hours during business hours. Pricing is quoted before your trip is confirmed.',
  waitTime:
    'Tassy Recovery covers the trip there, the wait, and the trip home, with 20 minutes of on-site wait included. Longer than that is $35 per extra half hour — quoted to you before it is charged, never after.',
} as const;

const trimmed = (max: number) => z.string().trim().max(max);

/**
 * A coordinate that may be absent.
 *
 * `z.coerce.number().nullable()` does NOT work here: coercion runs first and
 * `Number(null)` is 0, so a missing latitude would silently validate as the
 * equator. The preprocess maps every flavour of "not provided" to undefined
 * before any coercion happens.
 */
const optionalCoordinate = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.number().min(min).max(max).optional(),
  );

const tripRequestObject = z
  .object({
    serviceLine: z.enum(SERVICE_VALUES),

    pickupAddress: trimmed(500).min(5, 'Enter a pickup address'),
    dropoffAddress: trimmed(500).min(5, 'Enter a destination'),

    requestedAt: z
      .string()
      .min(1, 'Choose a date and time')
      .refine((v) => !Number.isNaN(parseLocalDateTimeMs(v)), 'Enter a valid date and time'),

    returnTrip: z.boolean().default(false),
    returnAt: z.string().optional().nullable(),

    passengers: z.coerce.number().int().min(1, 'At least 1').max(8, 'Call us for groups over 8').default(1),

    mobility: z.enum(MOBILITY_VALUES).optional().nullable(),

    vehicleNotes: trimmed(VEHICLE_NOTES_MAX).optional().nullable(),

    // What the address picker resolved, when the visitor PICKED a suggestion
    // rather than typing freehand. All optional: a typed address is still a
    // valid request, it just cannot be measured.
    pickupPlaceId: trimmed(300).optional().nullable(),
    pickupLat: optionalCoordinate(-90, 90),
    pickupLng: optionalCoordinate(-180, 180),
    dropoffPlaceId: trimmed(300).optional().nullable(),
    dropoffLat: optionalCoordinate(-90, 90),
    dropoffLng: optionalCoordinate(-180, 180),

    /**
     * Whether the customer actually SAW a price range before submitting.
     *
     * Only this flag comes from the client. The amounts never do - the server
     * recomputes the estimate from the coordinates it received, because a
     * number the browser could edit is not a number you can defend in a billing
     * dispute.
     */
    estimateShown: z.coerce.boolean().default(false),

    contactFirstName: trimmed(100).min(1, 'Enter your first name'),
    contactLastName: trimmed(100).min(1, 'Enter your last name'),
    contactPhone: trimmed(40).min(7, 'Enter a phone number we can reach you on'),
    contactEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional().nullable(),
    preferredContact: z.enum(PREFERRED_CONTACT).default('phone'),

    /** Honeypot — must stay empty. Real browsers never fill a hidden field. */
    company: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Charlotte wall-clock, not the server's zone. See lib/time.ts.
    const requested = parseLocalDateTimeMs(data.requestedAt);
    if (!Number.isNaN(requested) && requested < Date.now() + MIN_LEAD_TIME_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['requestedAt'],
        message: 'Please choose a time at least 4 hours from now.',
      });
    }

    if (data.returnTrip) {
      const returning = parseLocalDateTimeMs(data.returnAt);
      if (!data.returnAt || Number.isNaN(returning)) {
        ctx.addIssue({ code: 'custom', path: ['returnAt'], message: 'Choose a return date and time' });
      } else if (!Number.isNaN(requested) && returning <= requested) {
        ctx.addIssue({ code: 'custom', path: ['returnAt'], message: 'The return must be after the pickup' });
      }
    }

    if (data.preferredContact === 'email' && !data.contactEmail) {
      ctx.addIssue({
        code: 'custom',
        path: ['contactEmail'],
        message: 'Add an email address, or choose phone or text instead',
      });
    }

    // The mobility answer has to belong to the list that service line shows.
    // The form can only offer the right list, but a hand-crafted POST can pair
    // serviceLine=pet with mobility=wheelchair, and that row would reach a
    // driver as a wheelchair job for a dog.
    if (data.mobility) {
      const allowed = mobilityOptionsFor(data.serviceLine).map((m) => m.value as string);
      if (!allowed.includes(data.mobility)) {
        ctx.addIssue({
          code: 'custom',
          path: ['mobility'],
          message: isPetLine(data.serviceLine)
            ? 'Choose how your pet travels'
            : 'Choose a mobility option for this service',
        });
      }
    }
  });

/**
 * Fill first/last name from a legacy single `contactName`.
 *
 * The form now posts contactFirstName + contactLastName. Anything already
 * integrated against the old single-field API - and every row written before
 * today - sends `contactName`. Splitting it here keeps one authority for the
 * rule instead of duplicating it in the route and the client, and means the
 * old shape keeps working rather than 400ing.
 *
 * Runs before validation, so a legacy caller sends "Maria Santos" and gets the
 * same result as a form that posted the two fields separately.
 */
function fillNamesFromLegacy(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  const input = { ...(raw as Record<string, unknown>) };

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const first = str(input.contactFirstName);
  const last = str(input.contactLastName);
  const legacy = str(input.contactName);

  if (!first && !last && legacy) {
    const gap = legacy.indexOf(' ');
    input.contactFirstName = gap === -1 ? legacy : legacy.slice(0, gap);
    input.contactLastName = gap === -1 ? '' : legacy.slice(gap + 1).trim();
  }

  return input;
}

export const tripRequestSchema = z.preprocess(fillNamesFromLegacy, tripRequestObject);

export type TripRequestInput = z.infer<typeof tripRequestObject>;

/** The full name, as one string — what /ops, emails and the manifest read. */
export function fullName(data: Pick<TripRequestInput, 'contactFirstName' | 'contactLastName'>): string {
  return `${data.contactFirstName} ${data.contactLastName}`.trim();
}

/**
 * Round `now` up to the next 15 minutes, +4h, as a value for
 * <input type="datetime-local">.
 *
 * Rendered in Charlotte time, not the device's. A customer booking from a
 * phone still set to Pacific would otherwise see a floor three hours off the
 * one the server enforces and get rejected for a time the picker offered.
 */
export function minDateTimeLocal(now = new Date()): string {
  const floor = new Date(now.getTime() + MIN_LEAD_TIME_MS);
  // Round up on the instant, so the 15-minute grid survives the zone change.
  const rounded = new Date(Math.ceil(floor.getTime() / 900_000) * 900_000);
  return toLocalDateTimeInput(rounded);
}

/** Resolves ANY line, including unavailable ones, so /ops renders legacy rows. */
export function serviceLabel(value: string): string {
  return ALL_SERVICE_LINES.find((s) => s.value === value)?.label ?? value;
}

/** Brand name only — for customer-facing copy and PII-free alert titles. */
export function serviceShortName(value: string): string {
  return ALL_SERVICE_LINES.find((s) => s.value === value)?.short ?? value;
}

/** First 8 characters of the uuid — the human-quotable reference. */
export function shortRef(id: string): string {
  return id.slice(0, 8);
}

/** Normalise an arbitrary `?service=` param to a valid line, defaulting to care. */
export function coerceServiceLine(raw: string | undefined | null): ServiceLine {
  return SERVICE_VALUES.includes(raw as ServiceLine) ? (raw as ServiceLine) : 'care';
}
