import { z } from 'zod';

/**
 * Careers — the INTEREST LIST (the closed state of /careers).
 *
 * DECIDED (Phil, 2026-11-21, for the Monday launch): job applications stay
 * CLOSED — hiring waits on the pro bono driver agreement and the insurance
 * setup — but /careers no longer 404s while it waits. The page is visible
 * and readable: the roles and the company intro stay up, the Apply buttons
 * and the SaaS application links come off, and in their place one interest
 * form. Tassy reaches out to the list when applications open. See
 * lib/careers-gate.ts for the switch itself.
 *
 * The form collects a lead. It does not start an application, promise a
 * job, an interview or a start date, and nothing in this file may suggest
 * it does.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STORAGE GAP — READ BEFORE RELYING ON THIS LIST.
 *
 * Same position as the Winnie join list (lib/winnie-waitlist.ts): no
 * careers-interest table exists, and none of the existing tables can
 * honestly hold a candidate lead — trip_requests would surface in dispatch
 * as a booking, and notification_log is an email-attempt log. Creating a
 * table needs a migration Phil approves and applies, and that has NOT
 * happened.
 *
 * Until it does, POST /api/careers-interest captures the lead through the
 * operator notification pipeline only (notifyOperatorCareersInterest: ntfy
 * push + Zapier + the operator email, which carries the full lead under
 * its reference). That makes the operator mailbox the list of record —
 * workable at interest-list volume, not queryable, and the known price of
 * opening the page before the table exists.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Status word the API returns for a captured lead. Not an application status. */
export const CAREERS_INTEREST_STATUS = 'interest' as const;

/**
 * The roles a candidate can register interest in. The first four are the
 * roles on /careers (same order as the page); the key is what the operator
 * sees, the label is what the candidate reads. "Not sure yet" is a real
 * answer — plenty of good hires know the company before they know the seat.
 */
export const CAREERS_ROLES = [
  { key: 'driver', label: 'Driver' },
  { key: 'companion', label: 'Ride companion' },
  { key: 'cna', label: 'CNA' },
  { key: 'sales_rep', label: 'Sales rep' },
  { key: 'not_sure', label: 'Not sure yet' },
] as const;

export type CareersRole = (typeof CAREERS_ROLES)[number]['key'];

const ROLE_KEYS = CAREERS_ROLES.map((r) => r.key) as [CareersRole, ...CareersRole[]];

/** The label the operator (and the confirmation) reads for a stored role key. */
export function careersRoleLabel(key: string): string {
  return CAREERS_ROLES.find((r) => r.key === key)?.label ?? key;
}

/**
 * The lead as the server accepts it. Shape only: nothing here applies,
 * hires or reserves anything.
 *
 * One deliberate difference from the Winnie schema: no consent_contact
 * literal. The Winnie form needs one because joining that list is a
 * by-the-way next to a service page. This form's ONLY purpose is asking
 * to be contacted when applications open — submitting it is the consent,
 * and the privacy line under the form says exactly that.
 */
export const careersInterestSchema = z.object({
  full_name: z.string().trim().min(2, 'Please add your name').max(120),
  email: z.string().trim().email('Please check the email address').max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .refine((v) => v == null || v === '' || v.replace(/\D/g, '').length >= 7, {
      message: 'Please check the phone number',
    }),
  role: z.enum(ROLE_KEYS, { error: 'Please choose the role you are interested in' }),
  hp_token: z.string().optional(),
  elapsedMs: z.number().optional(),
});

export type CareersInterestInput = z.infer<typeof careersInterestSchema>;

/**
 * The banner at the top of /careers while applications are closed. Honest
 * about why, and about what joining the list does.
 */
export const CAREERS_INTEREST_BANNER_TITLE = 'Applications are not open yet.';
export const CAREERS_INTEREST_BANNER_BODY =
  'We are finalizing the driver agreement and the insurance setup that every hire needs, and we will not take applications until both are in place. Read about the roles below, join the interest list, and we will reach out the moment applications open.';

/** Exactly what the candidate is shown after joining. Promises nothing but contact. */
export const CAREERS_INTEREST_CONFIRMATION_TITLE = "You're on the list.";
export const CAREERS_INTEREST_CONFIRMATION_BODY =
  "We'll reach out when applications open — no need to apply again. Joining the list is not an application: it does not promise a job, an interview or a start date.";
