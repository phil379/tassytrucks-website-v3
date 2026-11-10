import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Post-ride ratings: the rules, kept free of any database or network import so they can be tested
 * without either. lib/ride-ratings.server.ts supplies the real store (Supabase, service role) and the
 * real admin alert (lib/notifications.ts); tests supply fakes.
 *
 *   1. Ops records a trip as completed, then calls POST /api/internal/rating-link with { tripId }.
 *   2. The website mints a private link /rating/<token>: 32 random bytes, base64url (43 characters).
 *      Only the sha256 of the token is stored, bound to one trip, valid for 14 days. The URL never
 *      carries a name, a phone number, a trip number or the trip id.
 *   3. Ops texts (with its STOP line) or emails the link. The website does not send it.
 *   4. The rider opens the page (a GET records nothing; email scanners follow links), picks 1-5,
 *      optionally writes a comment and submits (POST, server action).
 *   5. Score 1-3: the admin is alerted and an issue is opened in public.incident_reports.
 *      Score 4-5: a polite "share this on Google?" link, only when GOOGLE_REVIEW_URL is set.
 *
 * One rating per trip: a unique constraint on ride_ratings.trip_id, plus code that checks first and
 * treats a duplicate insert as "already rated" and shows the thank-you.
 *
 * Ratings never change what a driver earns. Nothing here reads or writes any compensation column;
 * scripts/test-ride-ratings.ts scans these files to keep it that way.
 */

// ───────────────────────────────────────────────────────────────── flag and settings

type Env = Record<string, string | undefined>;

/** OFF unless the env var is exactly the string "true" (same rule as the other feature flags). */
export function ratingsEnabled(env: Env = process.env): boolean {
  return env.RATINGS_ENABLED === 'true';
}

/**
 * The Google review link shown after a 4 or 5. Read from env GOOGLE_REVIEW_URL (there is no settings
 * table on the website). Empty, unset, unparseable or non-https means "hide the prompt".
 */
export function googleReviewUrl(env: Env = process.env): string | null {
  const raw = (env.GOOGLE_REVIEW_URL ?? '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || !u.hostname) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────── token

export const RATING_TOKEN_TTL_DAYS = 14;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** 32 random bytes = 256 bits, base64url = 43 URL-safe characters. */
export function generateRatingToken(): string {
  return randomBytes(32).toString('base64url');
}

export function isValidRatingToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

/** Hex sha256. The only form of the token that is ever stored. */
export function hashRatingToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function ratingTokenExpiry(now: Date): Date {
  return new Date(now.getTime() + RATING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function siteBase(env: Env = process.env): string {
  return (env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app').replace(/\/+$/, '');
}

export function ratingUrlFor(token: string, env: Env = process.env): string {
  return `${siteBase(env)}/rating/${token}`;
}

// ───────────────────────────────────────────────────────────────── internal auth

/**
 * `Authorization: Bearer <INTERNAL_NOTIFY_SECRET>`, compared in constant time. Both sides are hashed
 * first so the comparison never leaks the secret's length. An unset or empty secret refuses everything.
 */
export function bearerMatches(header: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const m = /^Bearer\s+(.+)$/.exec(header.trim());
  if (!m) return false;
  const a = createHash('sha256').update(m[1], 'utf8').digest();
  const b = createHash('sha256').update(secret, 'utf8').digest();
  return timingSafeEqual(a, b);
}

// ───────────────────────────────────────────────────────────────── input

export const COMMENT_MAX = 1000;

/** A whole number 1-5, or null. Accepts the string a form posts. */
export function parseScore(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\s*[1-5]\s*$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Trimmed, capped at 1000 characters, null when empty. Stored as plain text; React escapes on output. */
export function cleanComment(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Drop control characters except newline and tab.
  // eslint-disable-next-line no-control-regex
  const s = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!s) return null;
  return Array.from(s).slice(0, COMMENT_MAX).join('').trim() || null;
}

// ───────────────────────────────────────────────────────────────── trip rules

export type TripForRating = {
  id: string;
  status: string | null;
  driver_id: string | null;
  is_test_data: boolean | null;
};

export const RATABLE_STATUSES = ['completed', 'closed'] as const;
export const BLOCKING_EVENTS = ['cancelled', 'no_show'] as const;

export type RatableCheck = { ok: true } | { ok: false; reason: 'not_found' | 'test_data' | 'not_ratable' };

/**
 * Only a finished ride can be rated: status completed or closed, AND no cancelled / no_show event in
 * its timeline (a trip can be closed after a no-show). Test data is never rated.
 */
export function checkRatable(trip: TripForRating | null, events: readonly string[]): RatableCheck {
  if (!trip) return { ok: false, reason: 'not_found' };
  if (trip.is_test_data === true) return { ok: false, reason: 'test_data' };
  if (!(RATABLE_STATUSES as readonly string[]).includes(String(trip.status ?? ''))) {
    return { ok: false, reason: 'not_ratable' };
  }
  if (events.some((e) => (BLOCKING_EVENTS as readonly string[]).includes(e))) {
    return { ok: false, reason: 'not_ratable' };
  }
  return { ok: true };
}

export function isLowScore(score: number): boolean {
  return score >= 1 && score <= 3;
}

export function lowRatingSeverity(score: number): 'minor' | 'moderate' {
  return score === 3 ? 'minor' : 'moderate';
}

export type IncidentInsert = {
  trip_id: string;
  severity: 'minor' | 'moderate';
  incident_type: 'low_rating';
  resolution_status: 'open';
  reported_at: string;
  description: string;
  context: { source: 'ride_rating'; rating_id: string; score: number; driver_id: string | null };
  is_test_data: false;
};

/** The row opened in public.incident_reports for a 1-3. The comment stays in ride_ratings. */
export function buildLowRatingIncident(a: {
  tripId: string;
  ratingId: string;
  score: number;
  driverId: string | null;
  now: Date;
}): IncidentInsert {
  return {
    trip_id: a.tripId,
    severity: lowRatingSeverity(a.score),
    incident_type: 'low_rating',
    resolution_status: 'open',
    reported_at: a.now.toISOString(),
    description: `Rider rated this trip ${a.score} out of 5. See public.ride_ratings for the comment.`,
    context: { source: 'ride_rating', rating_id: a.ratingId, score: a.score, driver_id: a.driverId },
    is_test_data: false,
  };
}

// ───────────────────────────────────────────────────────────────── injectable dependencies

export type TokenRow = { id: string; trip_id: string; expires_at: string; used_at: string | null };
export type RatingRow = { id: string; score: number };

export interface RatingStore {
  findTrip(tripId: string): Promise<TripForRating | null>;
  /** The trip's cancelled / no_show events (others may be returned and are ignored). */
  tripEvents(tripId: string): Promise<string[]>;
  insertToken(row: { trip_id: string; token_hash: string; expires_at: string }): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<TokenRow | null>;
  markTokenUsed(tokenId: string, at: string): Promise<void>;
  findRatingForTrip(tripId: string): Promise<RatingRow | null>;
  /** 'duplicate' when the unique constraint on trip_id refused it. */
  insertRating(row: {
    trip_id: string;
    score: number;
    comment: string | null;
    rater_type: 'customer';
  }): Promise<{ id: string } | 'duplicate'>;
  /** Returns the new issue id, or null if it could not be written. Never throws. */
  insertIncident(row: IncidentInsert): Promise<string | null>;
}

export type LowRatingAlert = {
  tripId: string;
  ratingId: string;
  score: number;
  comment: string | null;
  issueId: string | null;
};

export type RatingAlerter = (alert: LowRatingAlert) => Promise<void>;

export type RatingDeps = {
  store: RatingStore;
  alert: RatingAlerter;
  env?: Env;
  now?: () => Date;
};

function nowOf(deps: RatingDeps): Date {
  return deps.now ? deps.now() : new Date();
}

// ───────────────────────────────────────────────────────────────── mint (ops endpoint)

export type MintResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error: 'disabled' | 'not_found' | 'test_data' | 'not_ratable' | 'already_rated' | 'server_error' };

export async function mintRatingLink(deps: RatingDeps, tripId: string): Promise<MintResult> {
  if (!ratingsEnabled(deps.env)) return { ok: false, error: 'disabled' };
  try {
    const trip = await deps.store.findTrip(tripId);
    const events = trip ? await deps.store.tripEvents(tripId) : [];
    const check = checkRatable(trip, events);
    if (!check.ok) return { ok: false, error: check.reason };
    if (await deps.store.findRatingForTrip(tripId)) return { ok: false, error: 'already_rated' };

    const token = generateRatingToken();
    const expiresAt = ratingTokenExpiry(nowOf(deps)).toISOString();
    await deps.store.insertToken({ trip_id: tripId, token_hash: hashRatingToken(token), expires_at: expiresAt });
    return { ok: true, url: ratingUrlFor(token, deps.env), expiresAt };
  } catch (e) {
    console.error('[ride-ratings] could not mint a link:', (e as Error).message);
    return { ok: false, error: 'server_error' };
  }
}

// ───────────────────────────────────────────────────────────────── page state (GET, read-only)

export type PageState =
  | { kind: 'disabled' }
  | { kind: 'invalid' }
  | { kind: 'expired' }
  | { kind: 'not_ratable' }
  | { kind: 'error' }
  | { kind: 'open' }
  | { kind: 'thanks'; score: number; googleUrl: string | null };

/** The thank-you, with the Google prompt only for a 4-5 and only when a URL is configured. */
export function thanksState(score: number, env?: Env): PageState {
  return { kind: 'thanks', score, googleUrl: score >= 4 ? googleReviewUrl(env) : null };
}

type Resolved =
  | { kind: 'state'; state: PageState }
  | { kind: 'ok'; token: TokenRow; trip: TripForRating };

async function resolveToken(deps: RatingDeps, token: unknown): Promise<Resolved> {
  if (!ratingsEnabled(deps.env)) return { kind: 'state', state: { kind: 'disabled' } };
  if (!isValidRatingToken(token)) return { kind: 'state', state: { kind: 'invalid' } };
  const row = await deps.store.findTokenByHash(hashRatingToken(token));
  if (!row) return { kind: 'state', state: { kind: 'invalid' } };

  // Already rated: always the thank-you, even after the link expires.
  const existing = await deps.store.findRatingForTrip(row.trip_id);
  if (existing) return { kind: 'state', state: thanksState(existing.score, deps.env) };

  const expires = Date.parse(row.expires_at);
  if (!Number.isFinite(expires) || expires <= nowOf(deps).getTime()) {
    return { kind: 'state', state: { kind: 'expired' } };
  }
  const trip = await deps.store.findTrip(row.trip_id);
  const events = trip ? await deps.store.tripEvents(row.trip_id) : [];
  const check = checkRatable(trip, events);
  if (!check.ok || !trip) return { kind: 'state', state: { kind: 'not_ratable' } };
  return { kind: 'ok', token: row, trip };
}

/** What the page shows for a token. Never writes anything. */
export async function loadRatingPage(deps: RatingDeps, token: unknown): Promise<PageState> {
  try {
    const r = await resolveToken(deps, token);
    return r.kind === 'state' ? r.state : { kind: 'open' };
  } catch (e) {
    console.error('[ride-ratings] could not load the page:', (e as Error).message);
    return { kind: 'error' };
  }
}

// ───────────────────────────────────────────────────────────────── submit (POST only)

export type SubmitResult = PageState | { kind: 'bad_input' };

export async function submitRating(
  deps: RatingDeps,
  input: { token: unknown; score: unknown; comment: unknown },
): Promise<SubmitResult> {
  let r: Resolved;
  try {
    r = await resolveToken(deps, input.token);
  } catch (e) {
    console.error('[ride-ratings] could not resolve a token:', (e as Error).message);
    return { kind: 'error' };
  }
  if (r.kind === 'state') return r.state;

  const score = parseScore(input.score);
  if (score === null) return { kind: 'bad_input' };
  const comment = cleanComment(input.comment);
  const { token, trip } = r;
  const now = nowOf(deps);

  let ratingId: string;
  try {
    const inserted = await deps.store.insertRating({ trip_id: trip.id, score, comment, rater_type: 'customer' });
    if (inserted === 'duplicate') {
      // Lost a race with another submit: one rating per trip, show what was stored.
      const existing = await deps.store.findRatingForTrip(trip.id);
      return thanksState(existing?.score ?? score, deps.env);
    }
    ratingId = inserted.id;
  } catch (e) {
    console.error('[ride-ratings] could not store a rating:', (e as Error).message);
    return { kind: 'error' };
  }

  try {
    await deps.store.markTokenUsed(token.id, now.toISOString());
  } catch (e) {
    console.error('[ride-ratings] could not mark the token used:', (e as Error).message);
  }

  if (isLowScore(score)) {
    let issueId: string | null = null;
    try {
      issueId = await deps.store.insertIncident(
        buildLowRatingIncident({ tripId: trip.id, ratingId, score, driverId: trip.driver_id ?? null, now }),
      );
    } catch (e) {
      console.error('[ride-ratings] could not open an issue:', (e as Error).message);
    }
    try {
      await deps.alert({ tripId: trip.id, ratingId, score, comment, issueId });
    } catch (e) {
      console.error('[ride-ratings] low-rating alert failed:', (e as Error).message);
    }
  }

  return thanksState(score, deps.env);
}
