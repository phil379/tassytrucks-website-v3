/**
 * Who we are, in one place. The footer, Terms, Privacy, Refunds and the emails read
 * from here so a change is made once.
 *
 * PHIL'S DECISION (2026-10-24): publish the city and state only. Phil's FMCSA address
 * may be his home, so no street address is shown anywhere on the site. Do not paste
 * one into a page, an email or this file's BUSINESS_LOCATION.
 */

/** Shown in the footer, Terms, Privacy, Refunds and transactional emails. */
export const BUSINESS_LOCATION = 'Charlotte, NC';

/**
 * Full postal address for marketing / outreach email (CAN-SPAM needs one). EMPTY ON
 * PURPOSE. While it is empty, lib/marketing-guard.ts refuses to send any marketing,
 * prospecting or outreach email. Transactional email (request received, booked,
 * receipt, pay link) does not need it and is not blocked.
 *
 * To unblock outreach, Phil decides what address may be published (a PO box or a
 * commercial mail drop is common) and it is set here. Nothing else changes.
 */
export const BUSINESS_MAILING_ADDRESS = '';

export const BUSINESS = {
  legalName: 'Tassy Trucks LLC',
  tradeName: 'Tassy Transportation',
  phoneDisplay: '(704) 941-8508',
  phoneTel: '+17049418508',
  bookingEmail: 'book@tassytrucks.com',
  partnersEmail: 'partners@tassytrucks.com',
  location: BUSINESS_LOCATION,
  mailingAddress: BUSINESS_MAILING_ADDRESS,
  /**
   * Dispatch hours are not stated here on purpose: the public pages use the
   * confirmation promise ("within 2 hours during business hours", see
   * lib/confirmation-promise.ts) and nobody has told us the real hours. No page may
   * claim round-the-clock dispatch (scripts/unbuilt-claims.json lists what is not allowed).
   * Left null until Phil confirms them.
   */
  dispatchHours: null as string | null,
} as const;

/** "Tassy Trucks LLC, d/b/a Tassy Transportation · Charlotte, NC" */
export function businessIdentityLine(): string {
  return `${BUSINESS.legalName}, d/b/a ${BUSINESS.tradeName} · ${BUSINESS.location}`;
}

/** Identity plus phone and booking email, for the bottom of a policy page. */
export function businessContactLine(): string {
  return `${businessIdentityLine()} · ${BUSINESS.bookingEmail} · ${BUSINESS.phoneDisplay}`;
}

/** True once a postal address has been set for marketing email. */
export function hasMailingAddress(): boolean {
  return BUSINESS_MAILING_ADDRESS.trim().length > 0;
}

// ── Email footers ───────────────────────────────────────────────────────────────

/** Who is writing, for the foot of every email. City and state only (see BUSINESS_LOCATION). */
export function emailIdentityText(): string {
  return `${BUSINESS.tradeName} (${BUSINESS.legalName}) · ${BUSINESS.location}`;
}

/** Said at the foot of customer emails about a ride. */
export const EMAIL_MANAGE_TEXT =
  'You are getting this email because of a ride you asked for. To stop non-essential messages, reply to this email or write to book@tassytrucks.com. Messages about a ride you booked, such as a confirmation or a receipt, are still sent for that ride.';

export const EMAIL_PRIVACY_URL = 'https://www.tassytrucks.com/privacy';

/** Plain-text footer lines (no leading blank line). */
export function emailFooterText(): string[] {
  return [emailIdentityText(), EMAIL_MANAGE_TEXT, `Privacy: ${EMAIL_PRIVACY_URL}`];
}

/** HTML footer block in the given muted colour. Safe to drop inside a table cell. */
export function emailFooterHtml(mutedColor: string): string {
  return `<div style="margin-top:14px;color:${mutedColor};font-size:11.5px;line-height:1.6;">${emailIdentityText()}<br>${EMAIL_MANAGE_TEXT}<br><a href="${EMAIL_PRIVACY_URL}" style="color:${mutedColor};">Privacy Policy</a></div>`;
}
