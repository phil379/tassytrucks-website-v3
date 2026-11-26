/**
 * Thanksgiving 2026 (Phil, 2026-11-26): the gratitude banner at the top of every page —
 * the website twin of the Thanksgiving Facebook post published the same morning.
 *
 * PURE and shared, on the lib/promo.ts pattern: the banner reads this one definition,
 * so the window can never drift between surfaces. The window is keyed on the visitor's
 * clock at view time (Eastern wall clock via offsets), so the banner appears on
 * Thanksgiving morning and removes itself after the holiday weekend with no deploy
 * in between.
 *
 * Terms, as decided:
 *   - Window: Thu Nov 26, 2026 12:00 a.m. ET through Sun Nov 29, 2026 11:59:59 p.m. ET
 *     (the end constant is exclusive: midnight at the start of Mon Nov 30 ET) — the
 *     same Sunday-night end as the Black Friday window in lib/promo.ts.
 *   - It is a message, not an offer: no discount, no price, no claim. The Black Friday
 *     discount (lib/promo.ts) is untouched and keeps applying at booking on its own.
 */

export const THANKSGIVING = {
  code: 'thanksgiving-2026',
  startsAt: '2026-11-26T00:00:00-05:00',
  /** Exclusive: the first moment the banner is over. */
  endsAt: '2026-11-30T00:00:00-05:00',
  /** localStorage key remembering a visitor's dismissal for the rest of the window. */
  dismissKey: 'tassy-thanksgiving-2026-dismissed',
} as const;

/** True when `at` falls inside the Thanksgiving window (Eastern wall clock via offsets). */
export function thanksgivingActive(at: Date): boolean {
  const t = at.getTime();
  if (Number.isNaN(t)) return false;
  return t >= Date.parse(THANKSGIVING.startsAt) && t < Date.parse(THANKSGIVING.endsAt);
}
