/**
 * The visitor's choice about non-essential tracking, and nothing else.
 *
 * What counts as non-essential today: website analytics (Vercel Web Analytics and,
 * since Nov 27, 2026, Umami — Phil's chosen visitor counter for tassytrucks.com).
 * Booking, payment and address search are not gated by this choice.
 *
 * The choice is remembered in the visitor's own browser (localStorage) so we do not
 * ask on every page. That one key is the only thing this file stores.
 */
export const CONSENT_STORAGE_KEY = 'tassy-consent';
/** Bump when the categories change, so people are asked again.
 *  v2 (Nov 27, 2026): Umami joined Vercel Web Analytics as a named analytics
 *  tool, so earlier Accept choices are re-asked under the new wording. */
export const CONSENT_VERSION = 2;
/** The footer's "Cookie settings" button fires this on window to reopen the banner. */
export const OPEN_SETTINGS_EVENT = 'tassy:open-cookie-settings';
/** The analytics script. Loaded only after the visitor presses Accept. */
export const ANALYTICS_SCRIPT_SRC = '/_vercel/insights/script.js';
/** Umami Cloud's script. Also loaded only after Accept, and only when a
 *  website ID is configured — an empty ID means no Umami tag is ever injected. */
export const UMAMI_SCRIPT_SRC = 'https://cloud.umami.is/script.js';
/** The tassytrucks.com website ID in Phil's Umami Cloud account
 *  (phil@tassytrucks.com, free Hobby plan; registered Nov 27, 2026 after Phil
 *  removed his Foundation test site to free the plan's single slot).
 *  A website ID is a public identifier, not a secret — it is printed in the
 *  tracking tag every visitor's browser loads. It lives in code because the
 *  Vercel env-var route needs a team-access grant we have not taken. */
export const UMAMI_WEBSITE_ID = 'e6763a0e-fd82-4771-a094-20018e1e81a3';

export interface ConsentChoice {
  v: number;
  analytics: boolean;
  /** ISO time the choice was made. */
  at: string;
}

export function serializeConsent(analytics: boolean, now: Date = new Date()): string {
  const choice: ConsentChoice = { v: CONSENT_VERSION, analytics, at: now.toISOString() };
  return JSON.stringify(choice);
}

/** Returns null for nothing stored, garbage, or a choice made under an older version. */
export function parseConsent(raw: string | null | undefined): ConsentChoice | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ConsentChoice> | null;
    if (!v || typeof v !== 'object') return null;
    if (v.v !== CONSENT_VERSION) return null;
    if (typeof v.analytics !== 'boolean') return null;
    return { v: v.v, analytics: v.analytics, at: typeof v.at === 'string' ? v.at : '' };
  } catch {
    return null;
  }
}
