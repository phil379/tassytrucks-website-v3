import { z } from 'zod';

/**
 * Winnie Ride — the JOIN LIST.
 *
 * DECIDED (Phil, 2026-11-18): the phased launch opens Care, Recovery and
 * Concierge first. Winnie Ride does not take bookings until a real Winnie
 * driver exists, so every public Winnie booking surface became a join list —
 * the same flip Tassy Scholar got on 2026-11-17 (website PR #111). The form
 * collects a lead. It does not book, charge, quote a confirmed ride, or
 * promise a start date, and nothing in this file may suggest it does. The
 * published rates stay visible on /winnie and /pricing as what the service
 * will cost when it opens; the list itself promises nothing but a call back.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STORAGE GAP — READ BEFORE RELYING ON THIS LIST.
 *
 * Scholar's join list writes to a table (scholar_household_requests). No
 * equivalent table exists for Winnie, and none of the existing tables can
 * honestly hold a pet lead: scholar_household_requests is child/school
 * shaped, trip_requests would surface in dispatch as a booking, and
 * notification_log is an email-attempt log. Creating a `winnie_waitlist`
 * table needs a migration Phil approves and applies (repo precedent:
 * docs/migrations_pending/), and that has NOT happened yet.
 *
 * Until it does, POST /api/winnie-waitlist captures the lead through the
 * operator notification pipeline only (notifyOperatorWinnieWaitlist: ntfy
 * push + Zapier + the operator email, which carries the full lead under
 * its reference). That makes the operator mailbox the list of record —
 * workable at waitlist volume, not queryable, and the known price of
 * flipping the surfaces before the table exists. When the table lands,
 * the route gains its insert next to the marker in
 * app/api/winnie-waitlist/route.ts and this banner comes out.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Status word the API returns for a captured lead. Not a booking status. */
export const WINNIE_WAITLIST_STATUS = 'waitlist' as const;

/**
 * The rides a pet owner can say they are waiting for. The key is what the
 * operator sees; the label is what the owner reads. Order is screen order.
 */
export const WINNIE_SERVICES = [
  { key: 'vet', label: 'Vet appointments' },
  { key: 'groomer', label: 'Groomer' },
  { key: 'daycare', label: 'Daycare' },
  { key: 'boarding', label: 'Boarding' },
  { key: 'post_surgery', label: 'Post-surgery pickup' },
  { key: 'other', label: 'Something else' },
] as const;

export type WinnieService = (typeof WINNIE_SERVICES)[number]['key'];

const SERVICE_KEYS = WINNIE_SERVICES.map((s) => s.key) as readonly string[];

/** Keep only services we know, once each, in screen order. Unknown values are dropped. */
export function cleanWinnieServices(input: unknown): WinnieService[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set(input.filter((v): v is string => typeof v === 'string'));
  return WINNIE_SERVICES.filter((s) => seen.has(s.key) && SERVICE_KEYS.includes(s.key)).map((s) => s.key);
}

export const WINNIE_PET_TYPES = [
  { key: 'dog', label: 'Dog' },
  { key: 'cat', label: 'Cat' },
  { key: 'other', label: 'Other' },
] as const;

export type WinniePetType = (typeof WINNIE_PET_TYPES)[number]['key'];

/**
 * The lead as the server accepts it. Shape only: nothing here books,
 * charges or reserves anything.
 */
export const winnieWaitlistSchema = z.object({
  owner_name: z.string().trim().min(2, 'Please add your name').max(120),
  email: z.string().trim().email('Please check the email address').max(200),
  phone: z.string().trim().min(7, 'Please add a mobile number we can reach you on').max(40),
  pet_name: z.string().trim().min(1, "Please add your pet's name").max(80),
  pet_type: z.enum(['dog', 'cat', 'other'], { error: 'Please choose dog, cat or other' }),
  pet_basics: z
    .string()
    .trim()
    .min(2, 'Please add the breed or size')
    .max(200),
  services: z.array(z.string()).max(10).default([]),
  extra_notes: z.string().trim().max(1000).optional().nullable(),
  consent_contact: z.literal(true, { error: 'Please confirm we may contact you when Winnie Ride opens' }),
  hp_token: z.string().optional(),
  elapsedMs: z.number().optional(),
});

export type WinnieWaitlistInput = z.infer<typeof winnieWaitlistSchema>;

/** Exactly what the pet owner is shown after joining. Promises nothing but contact. */
export const WINNIE_CONFIRMATION_TITLE = "You're on the Winnie list.";
export const WINNIE_CONFIRMATION_BODY =
  'Thanks — we will contact you when Winnie Ride opens. Joining the list does not book a ride, reserve a spot, or promise a start date; it is how we learn how many pets are waiting, and how we reach you first.';
