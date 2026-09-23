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
 *   /vip     VIP Concierge    → recovery
 *   /winnie  Winnie Ride      → pet
 *   /renew   Tassy Wellness   → wellness
 *   /recover Tassy Guardian   → guardian
 *   /school  Tassy Scholar    → scholar
 */

export const REQUEST_BASE = '/request';

export type Vertical = 'nemt' | 'vip' | 'winnie' | 'renew' | 'recover' | 'school';

export const SERVICE_BY_VERTICAL: Record<Vertical, string> = {
  nemt: 'care',
  vip: 'recovery',
  winnie: 'pet',
  renew: 'wellness',
  recover: 'guardian',
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
  vip: to('recovery'),
  winnie: to('pet'),
  renew: to('wellness'),
  recover: to('guardian'),
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
