/**
 * The visitor's choice about non-essential tracking, and nothing else.
 *
 * What counts as non-essential today: website analytics (Vercel Web Analytics).
 * Booking, payment and address search are not gated by this choice.
 *
 * The choice is remembered in the visitor's own browser (localStorage) so we do not
 * ask on every page. That one key is the only thing this file stores.
 */
export const CONSENT_STORAGE_KEY = 'tassy-consent';
/** Bump when the categories change, so people are asked again. */
export const CONSENT_VERSION = 1;
/** The footer's "Cookie settings" button fires this on window to reopen the banner. */
export const OPEN_SETTINGS_EVENT = 'tassy:open-cookie-settings';
/** The analytics script. Loaded only after the visitor presses Accept. */
export const ANALYTICS_SCRIPT_SRC = '/_vercel/insights/script.js';

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
