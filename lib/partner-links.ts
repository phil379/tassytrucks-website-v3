/**
 * Every facility/partner CTA points here — at the in-repo signup
 * (/partners/signup), not at the SaaS.
 *
 * This is the second half of the migration lib/request-links.ts started. That
 * file moved the BOOKING CTAs in-house and said so in its own header:
 *
 *   "[saas-links] is still used for careers, facility signup, and subscription
 *    links; only the *booking* CTAs moved."
 *
 * Facility signup was the piece left behind, and leaving it behind had a cost
 * that was invisible until someone checked the database:
 *
 *   SaaS /facility/signup  → tassy_archive.accounts + account_invitations
 *   V3   /partners/signup  → public.facilities    + public.facility_users
 *
 * `trip_requests.facility_id` has a FOREIGN KEY to public.facilities.id. There
 * is no path from tassy_archive.accounts to a trip, so a facility that signed
 * up through the SaaS door could never be attached to a ride, never appear on
 * /ops/board, and never show up in the /facility dashboard. Counted
 * 2026-10-01: public.facilities 0 rows, tassy_archive.accounts 4 rows — all
 * four of them Phil's own July test runs. No real partner was lost. The next
 * one would have been.
 *
 * The SaaS route still exists and still works. Nothing public links to it.
 */

/** The one facility front door. */
export const PARTNER_SIGNUP_BASE = '/partners/signup';

/**
 * `type` is a FACILITY_KINDS value and it is not decoration: facilities.kind
 * is NOT NULL DEFAULT 'other', so a veterinary practice arriving from
 * /partners/veterinary without it is stored as 'other' with an empty
 * service_lines array — the page's entire purpose, forgotten at the insert.
 * The server coerces an unrecognised value to 'other' rather than erroring,
 * because a malformed URL must never block a real signup.
 *
 * `rep` is a sales-rep slug and drives residual commission. Absent means
 * nobody is credited, which is a real outcome, not an error.
 */
export const partnerSignup = (params: {
  source: string;
  type?: string;
  rep?: string;
} ) => {
  const { source, type, rep } = params;
  const qs = new URLSearchParams({
    source,
    ...(type ? { type } : {}),
    ...(rep ? { rep } : {}),
  });
  return `${PARTNER_SIGNUP_BASE}?${qs.toString()}`;
};
