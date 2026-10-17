import { z } from 'zod';

/**
 * Tassy Scholar — who may use the standard booking, and the custom request
 * everyone else goes to.
 *
 * DECIDED (Phil, 2026-10-13): the automated booking wizard is for ONE child,
 * ONE pickup address, ONE school and a STANDARD recurring schedule. Anything
 * else is a Custom Household Request: collected, reviewed by a person, and
 * never charged, subscribed or promised a driver, a route, a price or a start
 * date until it has been reviewed.
 *
 * Why: the per-ride fixed costs (insurance, dispatch) are charged per trip row,
 * so a second child at a discount loses money on the current system, and the
 * shared-drive model that would fix it is deferred. Until it exists, a
 * multi-child household must never be able to subscribe by itself.
 *
 * There is deliberately no price, discount, bundle or "sibling" wording
 * anywhere in this file.
 */

/**
 * Status a household request is saved with. A person has to look at it before
 * anything else can happen to it.
 */
export const HOUSEHOLD_REQUEST_STATUS = 'pending_review' as const;

/** The table the request is stored in. See supabase/migrations (proposed, not applied). */
export const HOUSEHOLD_REQUESTS_TABLE = 'scholar_household_requests';

/**
 * Reasons a family cannot use the standard booking. The key is what is stored;
 * the label is what the parent reads. Order is the order on screen.
 */
export const NONSTANDARD_REASONS = [
  { key: 'multiple_children', label: 'More than one child needs transportation' },
  { key: 'multiple_schools', label: 'My children attend more than one school' },
  { key: 'multiple_addresses', label: 'There is more than one pickup address' },
  { key: 'custody_schedules', label: 'Different custody or household schedules' },
  { key: 'multiple_destinations', label: 'More than one destination' },
  { key: 'different_am_pm', label: 'Morning and afternoon destinations are different' },
  { key: 'different_days', label: 'A different Friday, early-dismissal or weekly schedule' },
  { key: 'activities_plus_school', label: 'After-school activities combined with school transportation' },
  { key: 'dedicated_service', label: 'I want dedicated or private transportation' },
  { key: 'other_nonstandard', label: 'Something else that is not a standard school-day routine' },
] as const;

export type NonstandardReason = (typeof NONSTANDARD_REASONS)[number]['key'];

const REASON_KEYS = NONSTANDARD_REASONS.map((r) => r.key) as readonly string[];

/** Keep only reasons we know, once each, in screen order. Unknown values are dropped. */
export function cleanReasons(input: unknown): NonstandardReason[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set(input.filter((v): v is string => typeof v === 'string'));
  return NONSTANDARD_REASONS.filter((r) => seen.has(r.key) && REASON_KEYS.includes(r.key)).map((r) => r.key);
}

export type HouseholdPath = 'standard' | 'custom';

/**
 * The one decision. ANY reason at all sends the family to the custom request.
 * There is no weighting and no "mostly standard": the standard booking is the
 * narrow door and everything else goes through a person.
 */
export function classifyHousehold(reasons: unknown): { path: HouseholdPath; reasons: NonstandardReason[] } {
  const clean = cleanReasons(reasons);
  return { path: clean.length === 0 ? 'standard' : 'custom', reasons: clean };
}

/** Where the custom request lives, with the reasons carried across. */
export function householdRequestHref(reasons: unknown, planSlug?: string | null): string {
  const clean = cleanReasons(reasons);
  const params = new URLSearchParams();
  if (clean.length) params.set('reasons', clean.join(','));
  if (planSlug) params.set('plan', planSlug);
  const qs = params.toString();
  return `/school/household-request${qs ? `?${qs}` : ''}`;
}

/** Read the reasons back out of a query string value. */
export function reasonsFromQuery(value: string | string[] | undefined): NonstandardReason[] {
  const raw = Array.isArray(value) ? value.join(',') : value ?? '';
  return cleanReasons(raw.split(',').map((s) => s.trim()));
}

/* ───────────────────────────────────────────────────────────── the request */

export const HOUSEHOLD_DIRECTIONS = [
  { key: 'am', label: 'Morning only' },
  { key: 'pm', label: 'Afternoon only' },
  { key: 'round_trip', label: 'Morning and afternoon' },
] as const;

export const MAX_HOUSEHOLD_CHILDREN = 8;

const childRow = z.object({
  school_name: z.string().trim().min(1, "Please add this child's school").max(200),
  grade_or_age: z.string().trim().min(1, "Please add this child's grade or age range").max(60),
});

/**
 * The request as the server accepts it. Shape only: nothing here quotes,
 * charges or reserves anything.
 */
export const householdRequestSchema = z
  .object({
    guardian_name: z.string().trim().min(2, 'Please add your name').max(120),
    email: z.string().trim().email('Please check the email address').max(200),
    phone: z.string().trim().min(7, 'Please add a mobile number we can reach you on').max(40),
    home_address: z.string().trim().min(3, 'Please add the home pickup address').max(300),
    child_count: z.number().int().min(1, 'Please tell us how many children').max(MAX_HOUSEHOLD_CHILDREN),
    children: z.array(childRow).min(1, 'Please add at least one child').max(MAX_HOUSEHOLD_CHILDREN),
    direction: z.enum(['am', 'pm', 'round_trip'], { error: 'Please choose morning, afternoon or both' }),
    desired_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick the date you would like to start'),
    schedule_notes: z
      .string()
      .trim()
      .min(3, 'Please tell us the usual school-day schedule')
      .max(1500),
    friday_differs: z.boolean().default(false),
    friday_schedule: z.string().trim().max(600).optional().nullable(),
    extra_notes: z.string().trim().max(2000).optional().nullable(),
    reasons: z.array(z.string()).max(20).default([]),
    plan_interest: z.enum(['full-year', 'weekly', 'after-school']).optional().nullable(),
    consent_contact: z.literal(true, { error: 'Please confirm we may contact you about a transportation plan' }),
    hp_token: z.string().optional(),
    elapsedMs: z.number().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.children.length !== v.child_count) {
      ctx.addIssue({
        code: 'custom',
        path: ['children'],
        message: 'Please add the school and grade for each child',
      });
    }
    if (v.friday_differs && !(v.friday_schedule ?? '').trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['friday_schedule'],
        message: 'Please tell us what is different on Fridays',
      });
    }
  });

export type HouseholdRequestInput = z.infer<typeof householdRequestSchema>;

/** Exactly what the parent is shown after submitting. Promises nothing. */
export const HOUSEHOLD_CONFIRMATION_TITLE = 'We received your transportation request.';
export const HOUSEHOLD_CONFIRMATION_BODY =
  "Our team will review your family's pickup location, school schedule, and transportation needs before confirming service options and pricing. Submitting this request does not create a reservation or guarantee availability.";

/** The prompt on the standard-booking screen, and the request page's intro. */
export const HOUSEHOLD_PROMPT_TITLE = 'Need transportation for more than one child or more than one school?';
export const HOUSEHOLD_PROMPT_BODY =
  "Tell us about your family's schedule and we'll prepare a personalized transportation plan.";
