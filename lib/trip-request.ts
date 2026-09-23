import { z } from 'zod';

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
 * The six service lines.
 *
 * ⚠️ `recovery` vs `guardian` was ambiguous in the brief. Resolved as:
 *   recovery = VIP Concierge — post-procedure, driver waits on-site
 *   guardian = Tassy Guardian — oncology / chemo / hospital discharge
 * This reading is what makes the "60 minutes of on-site wait" rule apply to
 * `recovery` + `wellness` (the two lines where the driver waits). If that is
 * backwards, swapping the two `label`/`href` values below is the whole fix.
 */
export const SERVICE_LINES = [
  { value: 'care', label: 'Tassy Care — medical transport', href: '/nemt' },
  { value: 'recovery', label: 'VIP Concierge — post-procedure', href: '/vip' },
  { value: 'wellness', label: 'Tassy Wellness — IV therapy, med-spa', href: '/renew' },
  { value: 'pet', label: 'Winnie Ride — pet transport', href: '/winnie' },
  { value: 'guardian', label: 'Tassy Guardian — oncology, discharge', href: '/recover' },
  { value: 'scholar', label: 'Tassy Scholar — student transport', href: '/school' },
] as const;

export type ServiceLine = (typeof SERVICE_LINES)[number]['value'];

export const SERVICE_VALUES = SERVICE_LINES.map((s) => s.value) as [ServiceLine, ...ServiceLine[]];

/** The two lines that include on-site wait time. Drives the extra copy block. */
export const WAIT_TIME_LINES: ServiceLine[] = ['recovery', 'wellness'];

export const MOBILITY_OPTIONS = [
  { value: 'ambulatory', label: 'Ambulatory — walks unaided' },
  { value: 'walker', label: 'Walker / cane' },
  { value: 'wheelchair', label: 'Wheelchair' },
  { value: 'pet_carrier', label: 'Pet carrier' },
  { value: 'other', label: 'Other' },
] as const;

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
    'Recovery and wellness trips include up to 60 minutes of on-site wait time. Additional wait is billed in 30-minute increments and quoted upfront.',
} as const;

const trimmed = (max: number) => z.string().trim().max(max);

export const tripRequestSchema = z
  .object({
    serviceLine: z.enum(SERVICE_VALUES),

    pickupAddress: trimmed(500).min(5, 'Enter a pickup address'),
    dropoffAddress: trimmed(500).min(5, 'Enter a destination'),

    requestedAt: z
      .string()
      .min(1, 'Choose a date and time')
      .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date and time'),

    returnTrip: z.boolean().default(false),
    returnAt: z.string().optional().nullable(),

    passengers: z.coerce.number().int().min(1, 'At least 1').max(8, 'Call us for groups over 8').default(1),

    mobility: z.enum(['ambulatory', 'walker', 'wheelchair', 'pet_carrier', 'other']).optional().nullable(),

    vehicleNotes: trimmed(VEHICLE_NOTES_MAX).optional().nullable(),

    contactName: trimmed(200).min(2, 'Enter your name'),
    contactPhone: trimmed(40).min(7, 'Enter a phone number we can reach you on'),
    contactEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional().nullable(),
    preferredContact: z.enum(PREFERRED_CONTACT).default('phone'),

    /** Honeypot — must stay empty. Real browsers never fill a hidden field. */
    company: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const requested = Date.parse(data.requestedAt);
    if (!Number.isNaN(requested) && requested < Date.now() + MIN_LEAD_TIME_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['requestedAt'],
        message: 'Please choose a time at least 4 hours from now.',
      });
    }

    if (data.returnTrip) {
      if (!data.returnAt || Number.isNaN(Date.parse(data.returnAt))) {
        ctx.addIssue({ code: 'custom', path: ['returnAt'], message: 'Choose a return date and time' });
      } else if (!Number.isNaN(requested) && Date.parse(data.returnAt) <= requested) {
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
  });

export type TripRequestInput = z.infer<typeof tripRequestSchema>;

/** Round `now` up to the next 15 minutes, +4h, as a value for <input type="datetime-local">. */
export function minDateTimeLocal(now = new Date()): string {
  const d = new Date(now.getTime() + MIN_LEAD_TIME_MS);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function serviceLabel(value: string): string {
  return SERVICE_LINES.find((s) => s.value === value)?.label ?? value;
}

/** Normalise an arbitrary `?service=` param to a valid line, defaulting to care. */
export function coerceServiceLine(raw: string | undefined | null): ServiceLine {
  return SERVICE_VALUES.includes(raw as ServiceLine) ? (raw as ServiceLine) : 'care';
}
