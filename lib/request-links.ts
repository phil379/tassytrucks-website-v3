/**
 * Every customer-facing booking CTA now points here — at the in-repo request
 * pipeline (/request), not at the SaaS.
 *
 * `lib/saas-links.ts` is deliberately left in place and untouched. It is still
 * used for careers, facility signup, and subscription links; only the *booking*
 * CTAs moved. Nothing in this file references the SaaS.
 *
 * Service-line mapping (site vertical → pipeline service line):
 *   /nemt    Tassy Care       → care
 *   /recover Tassy Recovery   → recovery     ride home after a procedure
 *   /vip     Tassy Concierge  → concierge    airport, golf, events
 *   /winnie  Winnie Ride      → pet
 *   /school  Tassy Scholar    → scholar
 *   /renew   Tassy Wellness   → RETIRED, folds into Concierge
 *
 * ⚠️ `/vip` and `/recover` SWAPPED on 2026-09-24 when Recovery and Concierge
 * were split into separate products. /recover now means what its URL says —
 * the ride home after a procedure — and /vip is the premium lifestyle line.
 * The old /renew (Wellness) vertical routes to Concierge so its inbound links
 * and SEO pages keep landing somewhere real.
 */

export const REQUEST_BASE = '/request';

export type Vertical = 'nemt' | 'vip' | 'winnie' | 'renew' | 'recover' | 'school';

export const SERVICE_BY_VERTICAL: Record<Vertical, string> = {
  nemt: 'care',
  vip: 'concierge',
  winnie: 'winnie',
  renew: 'concierge',
  recover: 'recovery',
  school: 'scholar',
};

const to = (service: string, extra: Record<string, string> = {}) => {
  const params = new URLSearchParams({ service, ...extra });
  return `${REQUEST_BASE}?${params.toString()}`;
};

/** Direct replacements for the `book.*` deep links. */
export const request = {
  /** The generic "Request a Ride" CTA — visitor picks the service on the form. */
  ride: REQUEST_BASE,
  nemt: to('care'),
  vip: to('concierge'),
  winnie: to('winnie'),
  renew: to('concierge'),
  recover: to('recovery'),
  school: to('scholar'),
};

/**
 * Replacement for `seoBook`. The landing pages pass their own attribution
 * (`source: 'seo-dialysis'`, plus prefill hints). Those ride along as query
 * params and the form stamps the whole path+query onto `trip_requests.source`,
 * so SEO attribution survives into the pipeline exactly as it used to survive
 * into the SaaS.
 */
export const seoRequest = (vertical: Vertical, params: Record<string, string> = {}) => {
  const { source, ...rest } = params;
  return to(SERVICE_BY_VERTICAL[vertical], {
    ...(source ? { utm_source: source } : {}),
    ...rest,
  });
};

/** Winnie Ride request deep link (replaces WINNIE_BOOK_URL). */
export const WINNIE_REQUEST_URL = seoRequest('winnie', { source: 'web' });

/**
 * Tassy Scholar plan links.
 *
 * These previously deep-linked into the SaaS subscription setup wizard
 * (`/book/school/<plan>/setup`), which is part of the booking flow that has
 * never worked — so a parent trying to pay hit a dead end. They now land on the
 * request form with the plan they picked carried through as a query param,
 * which the form stamps onto `trip_requests.source`. Dispatch sees which plan
 * they chose and quotes it.
 */
export const scholarPlan = (plan: 'full-year' | 'weekly' | 'after-school') =>
  to('scholar', { plan });
