/**
 * Community Rate (Veteran Rate + Senior Day): the one place that decides whether a trip gets a
 * program discount and how much.
 *
 * PURE. No database, no network, no clock: everything arrives as arguments so it can be tested
 * and so the server (never the browser) is the only caller that matters. The browser never sends a
 * percentage or an amount.
 *
 * Rules (spec section 11, final 2026-10-15):
 *   - Only ACTIVE programs. Both ship switched off (discount_programs.active = false).
 *   - The service line must be in the program's list. Concierge, Scholar and wheelchair (Care WAV)
 *     trips are never eligible; facility-, program- or account-billed trips are never eligible.
 *   - Programs that require verification apply only to a rider who is VERIFIED. No self-attestation.
 *   - Senior Day: the weekday of the SCHEDULED PICKUP in America/New_York must equal `weekday`.
 *   - No stacking: the single largest discount wins. A tie goes to the plan discount, then to the
 *     earlier program, so nothing is ever added together.
 *   - Driver pay is on the LIST fare (TassyOps splitFare); this file never touches driver pay.
 * All money is integer cents, rounded with Math.round.
 */

export type DiscountProgram = {
  code: string;
  label: string;
  pct: number;
  serviceLines: string[];
  /** ISO weekday, 1 = Monday .. 7 = Sunday. null = every day. */
  weekday: number | null;
  requiresVerification: boolean;
  minContributionCents: number;
  active: boolean;
};

export type Discount = { code: string; label: string; pct: number };

export type PickInput = {
  serviceLine: string | null | undefined;
  mobility?: string | null;
  /** Scheduled pickup instant (ISO string or Date). Needed only for weekday programs. */
  pickupAt?: string | Date | null;
  billing?: { facility?: boolean; programBilled?: boolean; onAccount?: boolean };
  /** program code -> the rider is verified for it. */
  verified: Record<string, boolean>;
  /** A percentage already offered by a plan (Standing, Care Pack, facility tier...). Never stacks. */
  planPct?: number | null;
  programs: DiscountProgram[];
};

const EXCLUDED_LINES = new Set(['concierge', 'scholar', 'care_wav', 'wellness', 'guardian']);

/** The booking form once called Winnie `pet`; treat both as the same line. */
function normalizeLine(line: string | null | undefined): string {
  const v = (line ?? '').trim().toLowerCase();
  return v === 'pet' ? 'winnie' : v;
}

/** ISO weekday (1 = Mon .. 7 = Sun) of an instant, as it is on the wall clock in Eastern time. */
export function easternIsoWeekday(at: string | Date): number | null {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(d);
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(name);
  return idx === -1 ? null : idx + 1;
}

export function pickDiscount(input: PickInput): Discount | null {
  const line = normalizeLine(input.serviceLine);
  if (!line || EXCLUDED_LINES.has(line)) return null;
  if ((input.mobility ?? '').toLowerCase().includes('wheelchair')) return null; // Care WAV
  const b = input.billing ?? {};
  if (b.facility || b.programBilled || b.onAccount) return null;

  const plan = input.planPct && input.planPct > 0 ? input.planPct : 0;
  let best: Discount | null = null;

  for (const p of input.programs) {
    if (!p.active) continue;
    if (!p.serviceLines.includes(line)) continue;
    if (p.requiresVerification && input.verified[p.code] !== true) continue;
    if (p.weekday !== null) {
      if (input.pickupAt == null) continue;
      if (easternIsoWeekday(input.pickupAt) !== p.weekday) continue;
    }
    if (!(p.pct > 0)) continue;
    // Strictly greater: an equal discount keeps the earlier program.
    if (!best || p.pct > best.pct) best = { code: p.code, label: p.label, pct: p.pct };
  }

  if (!best) return null;
  // A plan discount that is as large or larger wins; the program discount is then simply not applied.
  if (plan >= best.pct) return null;
  return best;
}

export function applyDiscount(listCents: number, pct: number): { discountCents: number; agreedCents: number } {
  if (!Number.isInteger(listCents) || listCents <= 0) throw new Error('listCents must be a positive whole number of cents');
  if (!(pct > 0) || pct > 50) throw new Error('pct out of range');
  const discountCents = Math.round((listCents * pct) / 100);
  return { discountCents, agreedCents: listCents - discountCents };
}

type RateLike = {
  card_fee_pct?: number | string | null;
  card_fee_fixed_cents?: number | string | null;
  insurance_cents?: number | string | null;
  dispatch_cents?: number | string | null;
} | null | undefined;

/**
 * What Tassy would keep on a discounted ride. MUST match TassyOps splitFare (driver on LIST,
 * card on COLLECTED, platform = insurance + dispatch). Used only for the minimum-contribution guard.
 */
export function projectedKeepCents(listCents: number, agreedCents: number, driverPct: number, rate: RateLike): number {
  const driver = Math.round((Math.max(listCents, agreedCents) * driverPct) / 100);
  const card = Math.round((agreedCents * Number(rate?.card_fee_pct ?? 2.9)) / 100) + Number(rate?.card_fee_fixed_cents ?? 30);
  const platform = Number(rate?.insurance_cents ?? 600) + Number(rate?.dispatch_cents ?? 300);
  return agreedCents - driver - card - platform;
}

/** True when the discounted ride still leaves Tassy at least the program's minimum. */
export function meetsMinContribution(program: Pick<DiscountProgram, 'minContributionCents'>, keepCents: number): boolean {
  return keepCents >= program.minContributionCents;
}
