import { OPERATING_TIME_ZONE, parseLocalDateTime } from '@/lib/time';
import { roadTimeByAddress } from '@/lib/road-distance';

/**
 * Tassy Scholar route-length cap.
 *
 * DECIDED (Phil, 2026-10-18, Plan B): the standard $850 Scholar booking is only for a
 * ONE-WAY drive of 20 minutes or less. Longer routes go to a person for a custom quote.
 *
 * Why 20: at $850 a month and drivers paid about $24 an hour, Tassy stops making money
 * near 29 minutes (about 17% margin at 20, about minus 2% at 30). A 20-minute cap leaves a
 * cushion for traffic and school-zone waits. Source: "Scholar Route Math" (Oct 18 2026) and
 * claude/recovery-concierge-scholar-margin-proposals-2026-10-14.md.
 *
 * This measures the LOADED drive (home to school) at a school-morning departure time. It
 * does not include a driver's empty drive to the pickup. If real runs show that empty time
 * matters, lower this number in ONE place.
 *
 * FAIL CLOSED: if we cannot measure the drive, the family goes to a person. We never sell
 * a route we could not check.
 */
export const SCHOLAR_MAX_LEG_MINUTES = 20;

/** Emergency switch. Set SCHOLAR_ROUTE_CAP=off in Vercel to stop enforcing (not recommended). */
export function routeCapEnforced(): boolean {
  return (process.env.SCHOLAR_ROUTE_CAP ?? '').trim().toLowerCase() !== 'off';
}

export type RouteVerdict = {
  verdict: 'within' | 'too_long' | 'unknown';
  /** Whole minutes, rounded UP, or null when unknown. */
  minutes: number | null;
};

/** Pure decision. Rounds up: 20 min 01 sec counts as 21 and is over the cap. */
export function judgeLegSeconds(seconds: number | null | undefined, maxMinutes = SCHOLAR_MAX_LEG_MINUTES): RouteVerdict {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return { verdict: 'unknown', minutes: null };
  }
  const minutes = Math.ceil(seconds / 60);
  return { verdict: minutes <= maxMinutes ? 'within' : 'too_long', minutes };
}

/** Next weekday, 7:30 AM Charlotte time, as a Date. Always in the future. */
export function nextSchoolMorning(from: Date = new Date()): Date {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: OPERATING_TIME_ZONE }).format(from);
  const d = new Date(`${today}T12:00:00Z`);
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  const ymd = d.toISOString().slice(0, 10);
  return parseLocalDateTime(`${ymd}T07:30:00`)!;
}

/** Measure and judge one leg. */
export async function checkScholarLeg(fromAddress: string, toAddress: string): Promise<RouteVerdict> {
  const route = await roadTimeByAddress(fromAddress, toAddress, nextSchoolMorning());
  return judgeLegSeconds(route?.seconds ?? null);
}

export { ROUTE_TOO_LONG_MESSAGE, ROUTE_UNVERIFIED_MESSAGE } from '@/lib/school-household';
