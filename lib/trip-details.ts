import type { ServiceLine } from '@/lib/trip-request';

/**
 * WHO OR WHAT IS TRAVELLING — the questions that change per service line.
 *
 * WHY THIS FILE EXISTS. The request form used to ask every service line the
 * same six questions and then, directly under "How does your pet travel?",
 * "First name" and "Last name". A Winnie Ride customer reads that as the form
 * asking for their dog's surname. Worse, it collected nothing a dispatcher
 * actually needs to quote or crew the job: no breed, no weight, no vaccination,
 * no carrier, no grade, no school, no flight number, nobody signing the patient
 * out of the surgery center.
 *
 * ONE SPEC, FOUR CONSUMERS. The field list below is the only place a question
 * is written down. The form renders from it, the server validates against it,
 * the ops queue labels rows with it, and the confirmation email reads it. Add a
 * question here and all four follow; add it in the form only and the ops queue
 * shows a raw key.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PRIVACY — HARD REQUIREMENT, READ BEFORE ADDING A FIELD
 *
 * Nothing here may collect a diagnosis, a procedure name, a condition, or a
 * medication. Not for Care, and ESPECIALLY not for Recovery, where it is most
 * tempting: "what procedure are you having?" would be the single most useful
 * dispatch question on this form and it is not ours to ask. A ride home is a
 * transport service, not a clinical one, and the moment this table holds
 * procedure names it becomes a health record with everything that follows.
 *
 * Every question below is about MOVEMENT — can they walk to the car, are there
 * steps at the door, who is signing them out, how long will we wait. Those
 * answers crew the trip without describing anyone's health. Where a clinical
 * question was the obvious one, the mobility question that gets the same
 * operational answer is asked instead. Keep it that way.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type DetailFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'date'
  | 'checkbox';

export type DetailOption = { value: string; label: string };

export type DetailField = {
  /** Stored as this key inside trip_details. Unique within its section. */
  key: string;
  label: string;
  type: DetailFieldType;
  options?: readonly DetailOption[];
  required?: boolean;
  /** Small print under the field. */
  help?: string;
  placeholder?: string;
  /** text/textarea: maximum characters kept. Anything longer is rejected. */
  max?: number;
  /** number: inclusive bounds. */
  min?: number;
  maxValue?: number;
  /**
   * Suggestion list for a free-text field, keyed by ANOTHER field's value.
   * Breed is the only user: the list follows the species picked above it, and
   * it stays a text input so an unlisted breed can still be typed. A booking
   * must never fail because a reference list is incomplete.
   */
  suggestFrom?: string;
  /** Shown only while another field holds one of these values. */
  showWhen?: { key: string; equals: readonly string[] };
  /** Renders half width on a wide screen. */
  half?: boolean;
};

export type DetailSection = {
  /** The heading above the block. Names the subject, so the contact block below
   *  can never be mistaken for it. */
  title: string;
  intro?: string;
  fields: readonly DetailField[];
};

const YES_NO_UNSURE = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
] as const;

const STEPS = [
  { value: 'none', label: 'No steps — level entry' },
  { value: 'few', label: 'A few steps' },
  { value: 'flight', label: 'A full flight of stairs' },
  { value: 'unsure', label: 'Not sure' },
] as const;

export const NOTES_MAX = 300;

/** The breed list is keyed by these values. Keep them in step with pet-breeds.ts. */
const SPECIES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'bird', label: 'Bird' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'other', label: 'Other' },
] as const;

const PET: DetailSection = {
  title: 'About your pet',
  intro:
    'This is what decides which vehicle comes and who drives it. Your own details come further down.',
  fields: [
    { key: 'pet_name', label: "Pet's name", type: 'text', required: true, max: 60, half: true },
    { key: 'species', label: 'Species', type: 'select', options: SPECIES, required: true, half: true },
    {
      key: 'breed',
      label: 'Breed',
      type: 'text',
      max: 80,
      half: true,
      suggestFrom: 'species',
      help: 'Start typing — or write it in if it is not on the list.',
    },
    { key: 'weight_lbs', label: 'Weight (lbs)', type: 'number', min: 1, maxValue: 300, half: true },
    { key: 'age_years', label: 'Age (years)', type: 'number', min: 0, maxValue: 40, half: true },
    {
      key: 'rabies',
      label: 'Rabies vaccination',
      type: 'select',
      required: true,
      half: true,
      options: [
        { value: 'current', label: 'Current' },
        { value: 'due', label: 'Expired or due' },
        { value: 'unsure', label: 'Not sure' },
      ],
      help: 'We cannot transport without a current rabies vaccination. Bring the record.',
    },
    {
      key: 'rabies_expires',
      label: 'Rabies expires',
      type: 'date',
      half: true,
      showWhen: { key: 'rabies', equals: ['current'] },
    },
    {
      key: 'carrier',
      label: 'Carrier or crate',
      type: 'select',
      required: true,
      options: [
        { value: 'owner', label: 'We have our own' },
        { value: 'need', label: 'Please bring one' },
        { value: 'none', label: 'Travels without one' },
      ],
    },
    {
      key: 'temperament',
      label: 'How is your pet with strangers?',
      type: 'select',
      options: [
        { value: 'calm', label: 'Calm — happy with new people' },
        { value: 'shy', label: 'Shy or anxious' },
        { value: 'reactive', label: 'Reactive — needs careful handling' },
        { value: 'first_time', label: 'Never been transported before' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      key: 'pet_notes',
      label: 'Anything else about your pet?',
      type: 'textarea',
      max: NOTES_MAX,
      help: 'Handling, leash habits, comfort items. Please do not include medical details.',
    },
  ],
};

const CARE: DetailSection = {
  title: 'About the rider',
  intro:
    'Enough for the driver to get them to the door and back. We never ask what the appointment is for.',
  fields: [
    {
      key: 'rider_is',
      label: 'Who is riding?',
      type: 'select',
      required: true,
      half: true,
      options: [
        { value: 'self', label: 'Me' },
        { value: 'family', label: 'A family member' },
        { value: 'client', label: 'Someone I coordinate care for' },
      ],
    },
    {
      key: 'rider_first_name',
      label: "Rider's first name",
      type: 'text',
      max: 60,
      half: true,
      help: 'So the driver can greet them by name.',
    },
    {
      key: 'assistance',
      label: 'How much help do they need?',
      type: 'select',
      required: true,
      options: [
        { value: 'curb', label: 'Curb to curb — they get themselves in and out' },
        { value: 'door', label: 'Door to door — met at the door and walked to the car' },
        { value: 'through', label: 'Door through door — walked inside and handed over' },
      ],
      help: 'Door through door takes the driver longer and is quoted accordingly.',
    },
    { key: 'pickup_steps', label: 'Steps at the pickup door', type: 'select', options: STEPS, half: true },
    {
      key: 'escort',
      label: 'Is someone riding with them?',
      type: 'select',
      options: YES_NO_UNSURE,
      half: true,
    },
  ],
};

const RECOVERY: DetailSection = {
  title: 'About the pickup',
  intro:
    'We do not ask what the procedure was, and you should not tell us. These questions are only about getting them home safely.',
  fields: [
    {
      key: 'patient_is',
      label: 'Who are we picking up?',
      type: 'select',
      required: true,
      half: true,
      options: [
        { value: 'self', label: 'Me' },
        { value: 'family', label: 'A family member' },
        { value: 'coordinated', label: 'A patient I am coordinating for' },
      ],
    },
    { key: 'patient_first_name', label: 'Their first name', type: 'text', max: 60, half: true },
    {
      key: 'responsible_adult',
      label: 'Who is signing them out?',
      type: 'select',
      required: true,
      options: [
        { value: 'me', label: 'I will be there' },
        { value: 'someone_else', label: 'Someone else will be there' },
        { value: 'driver_only', label: 'Nobody — the driver is the responsible adult' },
      ],
      help: 'Most surgery centers will not release a sedated patient without one. Tell us now, not at the door.',
    },
    {
      key: 'responsible_adult_name',
      label: 'Their name',
      type: 'text',
      max: 80,
      half: true,
      showWhen: { key: 'responsible_adult', equals: ['someone_else'] },
    },
    {
      /**
       * TASSY ESCORT. Deliberately placed straight after "who is signing them
       * out", because the answer `driver_only` is the moment the customer
       * realizes they have a problem — and this is the answer to it.
       *
       * The wording is careful and must stay careful. We walk them out. We do
       * not claim to BE the responsible adult, because whether a surgery center
       * accepts a paid escort in that role varies by facility and has not been
       * checked with any Charlotte center. See lib/quote.ts, ESCORT_CENTS.
       */
      key: 'escort',
      label: 'Add a Tassy Escort? (+$45)',
      type: 'select',
      options: [
        { value: 'no', label: 'No — someone will be with them' },
        { value: 'yes', label: 'Yes — walk them out to the car' },
      ],
      help: 'Your driver comes in 15 minutes early, meets them at the discharge desk and walks them to the car instead of waiting at the curb.',
    },
    {
      key: 'support_to_car',
      label: 'Getting to the car',
      type: 'select',
      required: true,
      options: [
        { value: 'unaided', label: 'Walks out unaided' },
        { value: 'an_arm', label: 'Needs an arm to lean on' },
        { value: 'wheelchair', label: 'Comes out in a wheelchair' },
        { value: 'unsure', label: 'Not sure yet' },
      ],
    },
    {
      key: 'wait_estimate',
      label: 'How long should we expect to wait?',
      type: 'select',
      half: true,
      options: [
        { value: 'under_30', label: 'Under 30 minutes' },
        { value: '30_60', label: '30 to 60 minutes' },
        { value: 'over_60', label: 'Over an hour' },
        { value: 'unknown', label: 'No idea yet' },
      ],
      help: '20 minutes is included. Longer is quoted before it is charged.',
    },
    { key: 'home_steps', label: 'Steps at the drop-off door', type: 'select', options: STEPS, half: true },
  ],
};

const CONCIERGE: DetailSection = {
  title: 'About the trip',
  fields: [
    {
      key: 'occasion',
      label: "What's the occasion?",
      type: 'select',
      required: true,
      options: [
        { value: 'airport', label: 'Airport' },
        { value: 'golf', label: 'Golf' },
        { value: 'event', label: 'Event or dinner' },
        { value: 'corporate', label: 'Corporate or client pickup' },
        { value: 'other', label: 'Something else' },
      ],
    },
    {
      key: 'airline',
      label: 'Airline',
      type: 'text',
      max: 60,
      half: true,
      showWhen: { key: 'occasion', equals: ['airport'] },
    },
    {
      key: 'flight_number',
      label: 'Flight number',
      type: 'text',
      max: 12,
      half: true,
      placeholder: 'AA 1423',
      showWhen: { key: 'occasion', equals: ['airport'] },
      help: 'We track it, so a delay moves the pickup instead of losing it.',
    },
    {
      key: 'greeting',
      label: 'Where should the driver meet you?',
      type: 'select',
      showWhen: { key: 'occasion', equals: ['airport'] },
      options: [
        { value: 'curbside', label: 'Curbside at arrivals' },
        { value: 'baggage', label: 'Inside, at baggage claim, with a name sign' },
      ],
    },
    { key: 'bags', label: 'Bags', type: 'number', min: 0, maxValue: 12, half: true },
    {
      key: 'child_seat',
      label: 'Child seat',
      type: 'select',
      half: true,
      options: [
        { value: 'none', label: 'None needed' },
        { value: 'booster', label: 'Booster' },
        { value: 'forward', label: 'Forward facing' },
        { value: 'rear', label: 'Rear facing' },
      ],
    },
    {
      key: 'bulky_items',
      label: 'Anything bulky coming along?',
      type: 'text',
      max: 120,
      placeholder: 'Golf clubs, ski bag, cello',
    },
  ],
};

const GRADES = [
  { value: 'pre_k', label: 'Pre-K' },
  { value: 'k', label: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Grade ${i + 1}`,
  })),
] as const;

const SCHOLAR: DetailSection = {
  title: 'About the student',
  intro: 'Routes are quoted by the run, so the schedule matters as much as the address.',
  fields: [
    {
      key: 'student_first_name',
      label: "Student's first name",
      type: 'text',
      required: true,
      max: 60,
      half: true,
    },
    { key: 'grade', label: 'Grade', type: 'select', options: GRADES, half: true },
    { key: 'school_name', label: 'School', type: 'text', required: true, max: 120 },
    {
      key: 'schedule',
      label: 'Which runs?',
      type: 'select',
      required: true,
      half: true,
      options: [
        { value: 'morning', label: 'Morning only' },
        { value: 'afternoon', label: 'Afternoon only' },
        { value: 'both', label: 'Both, every day' },
        { value: 'varies', label: 'It varies' },
      ],
    },
    { key: 'days_per_week', label: 'Days per week', type: 'number', min: 1, maxValue: 7, half: true },
    {
      key: 'car_seat',
      label: 'Booster or car seat',
      type: 'select',
      half: true,
      options: [
        { value: 'none', label: 'Not needed' },
        { value: 'booster', label: 'Booster' },
        { value: 'forward', label: 'Forward facing' },
      ],
    },
    {
      key: 'authorized_adults',
      label: 'Who else may drop off or collect?',
      type: 'textarea',
      max: NOTES_MAX,
      help: 'Names only. The driver releases a student to nobody who is not on this list.',
    },
    {
      key: 'accommodations',
      label: 'Anything that would make the ride work better?',
      type: 'textarea',
      max: NOTES_MAX,
      help: 'Seating, noise, routine. Please do not include medical details or diagnoses.',
    },
  ],
};

/** The section for a line, or null when that line asks nothing extra. */
export const TRIP_DETAILS: Partial<Record<ServiceLine, DetailSection>> = {
  winnie: PET,
  // Legacy alias, so a historical row still renders its pet answers.
  pet: PET,
  care: CARE,
  recovery: RECOVERY,
  concierge: CONCIERGE,
  scholar: SCHOLAR,
};

export function detailsFor(service: string): DetailSection | null {
  return TRIP_DETAILS[service as ServiceLine] ?? null;
}

/** Whether a conditional field is currently in play. */
export function fieldVisible(field: DetailField, values: Record<string, string>): boolean {
  if (!field.showWhen) return true;
  return field.showWhen.equals.includes(values[field.showWhen.key] ?? '');
}

export type DetailValue = string | number | boolean;
export type DetailValues = Record<string, DetailValue>;

export type DetailValidation =
  | { ok: true; values: DetailValues }
  | { ok: false; values: DetailValues; errors: Record<string, string> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a submitted detail block against its section.
 *
 * THE SERVER IS THE AUTHORITY. The form runs this too, for inline errors, but
 * what the route stores is whatever comes back from here — nothing else. Three
 * properties matter and each one is load-bearing:
 *
 *   1. UNKNOWN KEYS ARE DROPPED, not rejected. A stale tab posting last week's
 *      field names must not 400 a real booking; it stores what it can.
 *   2. HIDDEN FIELDS ARE DROPPED. Pick "Airport", type a flight number, change
 *      to "Golf" — the flight number must not travel to the database, where a
 *      dispatcher would read it as current.
 *   3. NOTHING IS STORED RAW. Text is trimmed and truncated, numbers are
 *      clamped to the declared bounds, selects must match a declared option.
 *      This column is rendered in the ops queue and in email.
 */
export function validateDetails(service: string, raw: unknown): DetailValidation {
  const section = detailsFor(service);
  if (!section) return { ok: true, values: {} };

  const input: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  // Visibility is resolved against the RAW strings, because a conditional field
  // depends on a sibling that may itself be invalid.
  const asText: Record<string, string> = {};
  for (const field of section.fields) {
    const v = input[field.key];
    asText[field.key] = v === undefined || v === null ? '' : String(v);
  }

  const values: DetailValues = {};
  const errors: Record<string, string> = {};

  for (const field of section.fields) {
    if (!fieldVisible(field, asText)) continue;

    const rawValue = input[field.key];
    const text = asText[field.key]!.trim();

    if (field.type === 'checkbox') {
      if (rawValue === true || text === 'true' || text === 'on') values[field.key] = true;
      continue;
    }

    if (text === '') {
      if (field.required) errors[field.key] = `${field.label} is required`;
      continue;
    }

    switch (field.type) {
      case 'select': {
        const allowed = (field.options ?? []).some((o) => o.value === text);
        if (!allowed) {
          errors[field.key] = `Choose an option for ${field.label.toLowerCase()}`;
          break;
        }
        values[field.key] = text;
        break;
      }
      case 'number': {
        const n = Number(text);
        if (!Number.isFinite(n)) {
          errors[field.key] = `${field.label} should be a number`;
          break;
        }
        const min = field.min ?? Number.NEGATIVE_INFINITY;
        const max = field.maxValue ?? Number.POSITIVE_INFINITY;
        if (n < min || n > max) {
          errors[field.key] = `${field.label} should be between ${min} and ${max}`;
          break;
        }
        values[field.key] = n;
        break;
      }
      case 'date': {
        if (!DATE_RE.test(text)) {
          errors[field.key] = `${field.label} should be a date`;
          break;
        }
        values[field.key] = text;
        break;
      }
      default: {
        values[field.key] = text.slice(0, field.max ?? NOTES_MAX);
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, values, errors } : { ok: true, values };
}

/**
 * Stored details as label/value pairs, for the ops queue and the confirmation
 * email. Select values resolve back to the words the customer actually read —
 * a dispatcher should never have to know that `through` means door through
 * door. A key no longer in the spec still renders, under its raw key, because
 * losing an old row's answer is worse than an ugly label.
 */
export function describeDetails(
  service: string,
  stored: unknown,
): { key: string; label: string; value: string }[] {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
  const bag = stored as Record<string, unknown>;
  const section = detailsFor(service);
  const out: { key: string; label: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const field of section?.fields ?? []) {
    const value = bag[field.key];
    if (value === undefined || value === null || value === '') continue;
    seen.add(field.key);
    out.push({ key: field.key, label: field.label, value: readable(field, value) });
  }

  for (const [key, value] of Object.entries(bag)) {
    if (seen.has(key) || value === undefined || value === null || value === '') continue;
    out.push({ key, label: key, value: String(value) });
  }

  return out;
}

function readable(field: DetailField, value: unknown): string {
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (field.type === 'select') {
    return field.options?.find((o) => o.value === String(value))?.label ?? String(value);
  }
  return String(value);
}
