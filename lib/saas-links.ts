/**
 * The ONLY two things the marketing site still links into the SaaS: careers,
 * and the phone/email contact details.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT WAS DELETED, AND WHY IT HAD TO BE
 *
 * This file used to hold 30-odd deep links into tassytrucksops: `book.nemt`,
 * `book.vip`, `book.ride`, `book.school*`, fifteen `subscribe.*` product
 * links, `seoBook()`, `WINNIE_BOOK_URL`, and `portal.*`. Every one of them was
 * already dead — nothing imported them — because booking moved into this app:
 *   • retail booking      → lib/request-links.ts    (/request)
 *   • facility signup     → lib/partner-links.ts    (/partners/signup)
 *   • the facility console→ /facility
 *
 * Dead was not safe enough. A URL named `book.nemt` sitting in the links file
 * is an invitation: the next CTA wired to it sends a paying customer to a
 * second application with its own prices and its own database, around the V3
 * quote engine and around /api/trip-request — the single write path that
 * attaches the account, applies the discount and derives the fare from
 * lib/quote.ts. That is not a broken link, it is a booking we never see and a
 * price that does not match the invoice.
 *
 * So they are gone. Wiring the wrong destination now requires writing the URL
 * out by hand, which is a decision rather than an autocomplete.
 *
 * CAREERS STAYS. Those routes are not a duplicate of anything here: they write
 * to tassy_archive.*_applications on the live project — 16 real applications —
 * and mint the onboarding magic links. The archive IS the applications table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SAAS_BASE = 'https://tassytrucksops.vercel.app';

/** Source param on every link, so SaaS-side attribution still works. */
const src = (path: string, extra: Record<string, string> = {}) => {
  const params = new URLSearchParams({ source: 'web', ...extra });
  return `${SAAS_BASE}${path}?${params.toString()}`;
};

/**
 * The four hiring funnels, on the SaaS. Linked from /careers and the footer.
 */
export const apply = {
  driver: src('/careers/driver'),
  salesRep: src('/careers/sales-rep'),
  companion: src('/careers/companion'),
  cna: src('/careers/cna'),
};

export const contact = {
  bookingEmail: 'mailto:book@tassytrucks.com',
  salesEmail: 'mailto:partners@tassytrucks.com',
  phone: 'tel:+17049418508', // (704) 941-8508 — Charlotte main line
  phoneDisplay: '(704) 941-8508',
};
