// All deep-links from the marketing site into the SaaS.
// Every CTA passes through these so we can change the destination
// (subdomain swap, A/B test, etc.) in ONE place.

export const SAAS_BASE = 'https://tassytrucksops.vercel.app';

/** Source param added to every CTA so we can attribute marketing-driven bookings. */
const src = (path: string, extra: Record<string, string> = {}) => {
  const params = new URLSearchParams({ source: 'web', ...extra });
  return `${SAAS_BASE}${path}?${params.toString()}`;
};

export const book = {
  nemt: src('/book/nemt'),
  vip: src('/book/vip'),
  winnie: src('/book/winnie'),
  renew: src('/book/renew'),
  recover: src('/book/recover'),
  // FIX_PROD_024 — PUBLIC 6-service picker. THE destination for every "Book a Ride" CTA.
  ride: src('/book'),
  // ⚠️ /quick-book is the AUTHENTICATED admin "log a one-off for a walk-in" tool — it
  // renders the persona sidebar/admin shell. NEVER link a public CTA here. (kept for
  // reference only; no public CTA should use it.)
  quick: src('/quick-book'),
  // FIX_PROD_021 — Tassy School parent-direct subscription (FIX_PROD_008/010). The
  // landing + the three plan-setup deep links (slugs verified live: full-year / weekly
  // / after-school). This is the connection the marketing /school page was missing.
  school: src('/book/school'),
  schoolFullYear: src('/book/school/full-year/setup'),
  schoolWeekly: src('/book/school/weekly/setup'),
  schoolAfterSchool: src('/book/school/after-school/setup'),
};

/** FIX_PROD_020 self-serve facility magic-link signup. `?type=` is an optional hint
 *  (hospital / veterinary / clinic / school) the signup form can read. */
export const facilitySignup = (type?: string) =>
  type ? `${SAAS_BASE}/facility/signup?type=${encodeURIComponent(type)}` : `${SAAS_BASE}/facility/signup`;

export const subscribe = {
  // VIP CAMO-style passes
  vipCompanion: src('/subscribe', { product: 'vip_companion_pass' }),
  vipConcierge: src('/subscribe', { product: 'vip_concierge_pass' }),
  vipRecovery: src('/subscribe', { product: 'vip_recovery_pass' }),
  // Winnie Ride B2C
  winnieStarter: src('/subscribe', { product: 'winnie_starter' }),
  winnieStandard: src('/subscribe', { product: 'winnie_standard' }),
  winniePremium: src('/subscribe', { product: 'winnie_premium' }),
  // Winnie Ride B2B (facility)
  winnieB2BStarter: src('/subscribe', { product: 'winnie_b2b_starter' }),
  winnieB2BStandard: src('/subscribe', { product: 'winnie_b2b_standard' }),
  winnieB2BPremium: src('/subscribe', { product: 'winnie_b2b_premium' }),
  // Renew (wellness)
  renewEssential: src('/subscribe', { product: 'renew_essential' }),
  renewSignature: src('/subscribe', { product: 'renew_signature' }),
  renewElite: src('/subscribe', { product: 'renew_elite' }),
  // Recover (oncology)
  recoverEssential: src('/subscribe', { product: 'recover_essential' }),
  recoverSignature: src('/subscribe', { product: 'recover_signature' }),
  recoverElite: src('/subscribe', { product: 'recover_elite' }),
};

/**
 * SEO landing-page deep links. Each SEO page passes its own `source` (and any
 * wizard prefill params) so marketing attribution survives into the SaaS.
 * Example: seoBook('nemt', { source: 'seo-dialysis', recurring: '1' })
 */
export const seoBook = (
  vertical: 'nemt' | 'vip' | 'winnie' | 'renew' | 'recover',
  params: Record<string, string>,
) => `${SAAS_BASE}/book/${vertical}?${new URLSearchParams(params).toString()}`;

/** B2B facility intake deep link with attribution. */
export const facilityIntake = (params: Record<string, string>) =>
  `${SAAS_BASE}/facility/intake?${new URLSearchParams(params).toString()}`;

/** Winnie Ride booking deep link (MEGA_SEO_002 contract). */
export const WINNIE_BOOK_URL = seoBook('winnie', { source: 'web' });

export const apply = {
  // FIX_PROD_024 — /driver-apply + /sales-rep-apply were 404s. These now point at the
  // PUBLIC SaaS careers lead-capture routes. /facility-partners/request-access was also a
  // 404 → collapsed to the one facility front door, /facility/signup.
  driver: src('/careers/driver'),
  salesRep: src('/careers/sales-rep'),
  // FIX_PROD_025 — companion (VIP Concierge) + CNA (Tassy Recover) hiring funnels.
  companion: src('/careers/companion'),
  cna: src('/careers/cna'),
  facility: src('/facility/signup'),
};

export const portal = {
  login: src('/login'),
  // FIX_PROD_024 — net-new facilities go to /facility/signup (apply.facility). EXISTING
  // facilities sign in here (intent=facility lets /login tailor the copy). The bare
  // /facility portal auth-walls a public visitor, so we no longer link to it directly.
  facilityLogin: src('/login', { intent: 'facility' }),
  facility: src('/facility'),
  driver: src('/driver-app'),
  sales: src('/sales-app'),
};

export const contact = {
  bookingEmail: 'mailto:booking@tassytrucks.com',
  salesEmail: 'mailto:partners@tassytrucks.com',
  phone: 'tel:+17049418508', // (704) 941-8508 — Charlotte main line
  phoneDisplay: '(704) 941-8508',
};
