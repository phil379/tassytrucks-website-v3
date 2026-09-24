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
/** FIX_PROD_143 — routed through src() so the B2B facility funnel carries the same
 *  `source=web` attribution as every booking CTA. It previously emitted only
 *  `?type=...`, so the four in-body facility CTAs (/nemt, /winnie, /renew, /recover)
 *  landed unattributed. */
export const facilitySignup = (type?: string) =>
  type ? src('/facility/signup', { type }) : src('/facility/signup');

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

/** B2B facility intake deep link with attribution.
 *  MEGA_TASSY_PUBLISH_READY (2026-07-02): /facility/intake now 307s to /facility/signup
 *  on the SaaS and DROPS the query string → point straight at signup so
 *  source/type attribution survives. */
export const facilityIntake = (params: Record<string, string>) =>
  `${SAAS_BASE}/facility/signup?${new URLSearchParams(params).toString()}`;

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
  /**
   * The careers index. Temporary: the hiring reference doc puts this page on
   * the marketing site, and it does not exist here yet — the footer's "View all
   * careers" was a 404 on every page until this line. Delete it, and point the
   * footer at a local route, the day /careers ships here.
   */
  careers: src('/careers'),
  facility: src('/facility/signup'),
};

// ⚠️ FIX_PROD_142 (SECURITY) — DO NOT render `portal.login` / `portal.facilityLogin`
// (or any /login deep-link) from a public marketing surface (Header/Footer/CTA/body).
// A public, crawl-indexable link to the SaaS login exposes an internal admin/facility
// entry point. Onboarded users already have the app URL. These are kept only for
// non-public/internal use; the marketing funnel points at booking + /facility/signup.
export const portal = {
  login: src('/login'),
  // FIX_PROD_024 — net-new facilities go to /facility/signup (apply.facility). EXISTING
  // facilities sign in here (intent=facility lets /login tailor the copy). The bare
  // /facility portal auth-walls a public visitor, so we no longer link to it directly.
  // FIX_PROD_142 — no longer linked from any marketing surface (security).
  facilityLogin: src('/login', { intent: 'facility' }),
  facility: src('/facility'),
  // MEGA_TASSY_PUBLISH_READY (2026-07-02): /driver-app + /sales-app were 404s on the
  // SaaS. Real persona hubs are /driver and /sales (verified 200 live).
  driver: src('/driver'),
  sales: src('/sales'),
};

export const contact = {
  bookingEmail: 'mailto:book@tassytrucks.com',
  salesEmail: 'mailto:partners@tassytrucks.com',
  phone: 'tel:+17049418508', // (704) 941-8508 — Charlotte main line
  phoneDisplay: '(704) 941-8508',
};
