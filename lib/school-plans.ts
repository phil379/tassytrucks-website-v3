import { z } from 'zod';

/**
 * Tassy Scholar — parent-direct school transport.
 *
 * Ported from TassyOps (components/booking/school/schoolFormulas.ts) on
 * 2026-09-29. Phil built this believing it was on the marketing site; it landed
 * in the SaaS app instead, behind a route whose submit handler returned success
 * for bookings it never stored. This is the same product, on the pipeline that
 * has the hardening.
 *
 * PORTED UNCHANGED, deliberately: the three plans and their slugs, all seven
 * policies and their exact wording, the six step titles, and PRICING_PLACEHOLDER.
 * There are ZERO dollar amounts anywhere in this file and none should be added
 * until Phil sets real numbers — a placeholder price is a quote to a parent.
 *
 * NOT PORTED: `allergies`, `carries_medications`, `medication_details` and
 * `special_needs_notes`. Those collected health data about an identified minor,
 * tied to a home address, a school address and a daily pickup time, at a company
 * with no BAA and no HIPAA programme. See SAFETY_NOTE_* below for what replaced
 * them and why that is not the same thing.
 */

export type PlanKey = 'full_year' | 'weekly_pattern' | 'after_school';

export interface SchoolPlan {
  key: PlanKey;
  /** URL segment. Already in the wild — /request?service=scholar&plan=full-year. */
  slug: string;
  name: string;
  /** Customer-facing name. Never "Formula" — that is internal vocabulary. */
  planLabel: string;
  tagline: string;
  commitment: string;
  includes: string[];
  billing: string;
  badge: string | null;
}

export const SCHOOL_PLANS: SchoolPlan[] = [
  {
    key: 'full_year',
    slug: 'full-year',
    name: 'Full School Year',
    planLabel: 'Full Year Plan',
    tagline: 'Daily AM + PM · Mon–Fri · August–May',
    commitment: 'Daily morning and afternoon pickup, Monday–Friday, the entire school year.',
    includes: [
      'AM + PM every school day',
      'Same trusted driver all year',
      'Schedule locked for the year',
      'Priority weather rerouting',
    ],
    billing: 'Annual subscription · biggest per-ride discount',
    badge: 'Best value',
  },
  {
    key: 'weekly_pattern',
    slug: 'weekly',
    name: 'Weekly Pattern',
    planLabel: 'Weekly Plan',
    tagline: 'Pick your days · e.g. Tue / Wed / Thu',
    commitment: 'Specific days each week, AM and/or PM per day — your recurring pattern.',
    includes: [
      'Choose the days that fit',
      'AM and/or PM per day',
      'Same driver on your days',
      'Schedule locked monthly',
    ],
    billing: 'Monthly subscription',
    badge: null,
  },
  {
    key: 'after_school',
    slug: 'after-school',
    name: 'After-School Activities',
    planLabel: 'After-School Plan',
    tagline: 'Sports · clubs · programs',
    commitment: 'Recurring rides to and from after-school programs for the whole season.',
    includes: [
      'Per-program scheduling',
      'Sports, clubs, tutoring',
      'Pay upfront for the season',
      'Schedule locked per program',
    ],
    billing: 'Per-program package',
    badge: null,
  },
];

export function planBySlug(slug: string): SchoolPlan | undefined {
  return SCHOOL_PLANS.find((p) => p.slug === slug);
}

export const PRICING_PLACEHOLDER = 'Pricing varies by school';

export const STEP_TITLES = [
  'Parent',
  'Your child',
  'Schedule',
  'Policies',
  'Commit',
  'Done',
] as const;

/* ─────────────────────────────────────────────────────────────── policies */

export type PolicyKey =
  | 'curb_to_curb'
  | 'no_show_5min'
  | 'hygiene'
  | 'trusted_handoff'
  | 'professional_conduct'
  | 'recorded_safety'
  | 'known_driver';

export interface PolicyDef {
  key: PolicyKey;
  title: string;
  /** A **double-asterisk** span renders emphasised via <PolicyBody>. */
  body: string;
}

/**
 * The seven policies, word for word.
 *
 * A parent ticks each one and we store the acknowledgement with a timestamp, so
 * this text is the thing that was agreed to. Editing a string here changes what
 * a past acknowledgement means, which is why it lives in version control and
 * why POLICY_VERSION below moves whenever the wording does.
 */
export const SCHOOL_POLICIES: PolicyDef[] = [
  {
    key: 'curb_to_curb',
    title: 'Curb-to-curb',
    body: 'Your driver picks up and drops off at the curb. An authorized adult must see your child to and from the vehicle.',
  },
  {
    key: 'no_show_5min',
    title: '5-minute no-show',
    body: 'Drivers wait 5 minutes at pickup. After that, to keep every other child on time, the driver continues the route.',
  },
  {
    key: 'hygiene',
    title: 'Hygiene standard',
    body: 'Riders come ready for school — clean, fed, and well. Sick children stay home; we hold your seat, no penalty.',
  },
  {
    key: 'trusted_handoff',
    title: 'Trusted handoff',
    body: 'Your driver only releases your child to an authorized adult — someone on your pickup list. If no one is there, your driver waits 10 minutes, contacts dispatch, then returns your child to school. **We never hand off to a stranger.**',
  },
  {
    key: 'professional_conduct',
    title: 'Professional conduct',
    body: "Your driver follows the planned route — no detours, no stops, no errands. They don't touch your child, don't fasten seatbelts, don't engage in personal conversations. **Professional, quiet, focused on safety.**",
  },
  {
    key: 'recorded_safety',
    title: 'Recorded for safety',
    body: "Every trip is recorded — video and audio inside the cabin — and reviewed only if there's a concern. Footage is kept 30 days, then deleted. **You can request your child's footage within that window.**",
  },
  {
    key: 'known_driver',
    title: 'Known driver, every trip',
    body: "Before pickup, you see your driver's name, photo, vehicle make and license plate. We assign the same driver to your family whenever we can. **Predictability is part of the safety promise.**",
  },
];

/**
 * Bumped whenever any policy wording changes.
 *
 * Stored alongside every acknowledgement. Without it, "the parent accepted the
 * trusted-handoff policy" is unfalsifiable a year later, because the text it
 * refers to has moved on. This is the cheap half of making an acknowledgement
 * mean something.
 */
export const POLICY_VERSION = '2026-09-29';

/* ───────────────────────────────────────────────────── schedule vocabulary */

export const AM_TIMES = ['6:45 AM', '7:00 AM', '7:10 AM', '7:25 AM'] as const;
export const PM_TIMES = ['3:15 PM', '3:25 PM', '4:05 PM', '4:30 PM'] as const;
export const PROGRAMS = ['Soccer', 'Basketball', 'Robotics Club', 'Tutoring', 'Band'] as const;

/**
 * Weekdays with their ISO numbers, because `standing_orders.days_of_week` is
 * smallint[] and 0=Sun vs 1=Mon is a silent off-by-one that ends with a child
 * left at a school gate. ISO: 1=Mon … 7=Sun, matching EXTRACT(ISODOW).
 */
export const WEEKDAYS = [
  { label: 'Mon', iso: 1 },
  { label: 'Tue', iso: 2 },
  { label: 'Wed', iso: 3 },
  { label: 'Thu', iso: 4 },
  { label: 'Fri', iso: 5 },
] as const;

export type WeekdayLabel = (typeof WEEKDAYS)[number]['label'];

export function isoDayFor(label: string): number | undefined {
  return WEEKDAYS.find((d) => d.label === label)?.iso;
}

/**
 * "6:45 AM" → "06:45". Postgres `time` wants 24h, and the chips are 12h.
 * Returns null rather than guessing, so a bad value fails validation instead of
 * silently becoming midnight.
 */
export function to24h(display: string | null | undefined): string | null {
  if (!display) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(display.trim());
  if (!m) return null;
  const [, hRaw, min, mer] = m;
  let h = Number(hRaw);
  if (h < 1 || h > 12) return null;
  if (mer.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (mer.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

/* ──────────────────────────────────────────────── wizard resume (session) */

export const wizardStorageKey = (planKey: string) => `tassy-school-setup:${planKey}`;

/**
 * Clamp a restored step to a resumable range.
 *
 * Step 6 (Done) is post-submit and is NEVER restored: reopening a completed
 * booking mid-wizard invites a parent to submit it twice. Anything invalid
 * (undefined, 0, 6+, a string, NaN) falls back to step 1.
 */
export function restoreStep(restored: unknown): number {
  const s = (restored as { step?: unknown } | null | undefined)?.step;
  return Number.isInteger(s) && (s as number) >= 1 && (s as number) <= 5 ? (s as number) : 1;
}

/* ──────────────────────────────────────────────────────────────── schema */

const policyAck = z.object({ accepted: z.literal(true), ts: z.string() });

/**
 * The single safety field that replaced four health fields.
 *
 * A driver genuinely needs to know that a child gets anxious, doesn't speak
 * much English, or should sit behind the driver. That is an operational note,
 * not a medical record. A child who needs medication administered in transit is
 * a `care` trip with a CNA — a different service at a different rate — and the
 * copy on screen says so.
 */
export const SAFETY_NOTE_LABEL = 'Anything your driver should know to keep your child safe?';
export const SAFETY_NOTE_HINT =
  "Please don't include medical details — for anything medical, call us and we'll arrange a CNA-escorted ride.";

export const schoolBookingSchema = z.object({
  plan: z.enum(['full-year', 'weekly', 'after-school']),
  parent: z.object({
    first_name: z.string().trim().min(1, 'Please add your first name'),
    last_name: z.string().trim().min(1, 'Please add your last name'),
    email: z.string().trim().email('Please check the email address'),
    phone: z.string().trim().min(7, 'Please add a phone number we can reach you on'),
    home_address: z.string().trim().min(3, 'Please add your home address'),
  }),
  child: z.object({
    first_name: z.string().trim().min(1, "Please add your child's first name"),
    /**
     * Required because students.last_name is NOT NULL and the original wizard
     * never asked. Adding the field beats making the column nullable: a school
     * needs the full name anyway, and an empty string in a NOT NULL column is
     * a lie the database cannot catch.
     */
    last_name: z.string().trim().min(1, "Please add your child's last name"),
    grade: z.string().trim().max(40).optional().nullable(),
    school_name: z.string().trim().min(1, 'Please add the school'),
    /**
     * The resolved schools.id, when the parent picked from the list.
     *
     * Optional on purpose. A school missing from the list must never block a
     * booking — the name is kept either way and a null id IS the review queue's
     * predicate. Never make this required to "improve data quality": that
     * trades a booking for a tidier table.
     */
    school_id: z.string().uuid().optional().nullable(),
    school_address: z.string().trim().min(1, 'Please add the school address'),
    emergency_contact_name: z.string().trim().min(1, 'Please add an emergency contact'),
    emergency_contact_phone: z.string().trim().min(7, 'Please add an emergency phone number'),
    safety_note: z.string().trim().max(1000).optional().nullable(),
  }),
  schedule: z.object({
    am: z.string().nullable().optional(),
    pm: z.string().nullable().optional(),
    days: z.array(z.string()).default([]),
    program: z.string().nullable().optional(),
    programDay: z.string().nullable().optional(),
    programTime: z.string().nullable().optional(),
    programLocation: z.string().nullable().optional(),
  }),
  policies: z.object({
    curb_to_curb: policyAck,
    no_show_5min: policyAck,
    hygiene: policyAck,
    trusted_handoff: policyAck,
    professional_conduct: policyAck,
    recorded_safety: policyAck,
    known_driver: policyAck,
  }),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick a start date'),
  hp_token: z.string().optional(),
  elapsedMs: z.number().optional(),
});

export type SchoolBookingInput = z.infer<typeof schoolBookingSchema>;

/**
 * Nothing in the payload may carry clinical text.
 *
 * Belt and braces next to the schema: the schema says what IS allowed, this
 * says what must never appear even if someone adds a field later. The spec
 * requires a test asserting no field accepts medication, diagnosis or condition
 * text, and a shape assertion is what that test can hold on to.
 */
export const FORBIDDEN_CLINICAL_KEYS = [
  'allergies',
  'carries_medications',
  'medication_details',
  'medications',
  'diagnosis',
  'condition',
  'special_needs_notes',
] as const;

/** The reference shown on step 6. Mirrors TASSY-SCHOOL-XX-0000 from TassyOps. */
export function bookingReference(plan: PlanKey, n: number): string {
  const tag = plan === 'full_year' ? 'FY' : plan === 'weekly_pattern' ? 'WK' : 'AS';
  return `TASSY-SCHOOL-${tag}-${String(n % 10000).padStart(4, '0')}`;
}

/* ─────────────────────────────────────────────────── school address display */

/**
 * Title-case a GIS address for DISPLAY ONLY.
 *
 * The county publishes "4100 GALLANT LN CHARLOTTE NC 28273" — all caps, street
 * types abbreviated. Shouting a parent's own school back at them looks like a
 * system error, so it is normalised on the way to the screen and NEVER on the
 * way to the database: schools.address keeps exactly what the source published,
 * because that is the value we can point at when a route is disputed.
 *
 * State abbreviations and single-letter directionals stay upper — "Nc" and
 * "4100 N Tryon" vs "4100 n Tryon" are both worse than leaving them alone.
 */
const KEEP_UPPER = new Set([
  'NC', 'SC', 'US', 'NE', 'NW', 'SE', 'SW', 'N', 'S', 'E', 'W', 'II', 'III', 'IV',
]);

export function titleCaseAddress(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => {
      const bare = word.replace(/[^A-Za-z0-9]/g, '');
      if (KEEP_UPPER.has(bare.toUpperCase())) return word.toUpperCase();
      // A pure number or something like 28273 stays as it is.
      if (/^\d+$/.test(bare)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Which of the three school states a form is in.
 *
 * The rule the states encode: never present an empty required field for a fact
 * the system already holds. 286 of 299 seeded schools carry an address, so for
 * the overwhelming majority asking for one is asking a parent to retype
 * something we can already show them.
 */
export type SchoolFieldState =
  /** Matched, and we hold the address. Show it; ask for nothing. */
  | 'confirmed'
  /** Matched, but no address on file. Ask, and say why. */
  | 'matched_no_address'
  /** Free text. Ask, as before — the null id stays the review predicate. */
  | 'unmatched';

export function schoolFieldState(
  schoolId: string | null | undefined,
  schoolAddress: string | null | undefined,
): SchoolFieldState {
  if (!schoolId) return 'unmatched';
  return schoolAddress && schoolAddress.trim() !== '' ? 'confirmed' : 'matched_no_address';
}
