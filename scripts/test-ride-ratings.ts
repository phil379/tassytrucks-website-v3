import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import {
  bearerMatches,
  buildLowRatingIncident,
  checkRatable,
  cleanComment,
  generateRatingToken,
  googleReviewUrl,
  hashRatingToken,
  isValidRatingToken,
  loadRatingPage,
  mintRatingLink,
  parseScore,
  ratingsEnabled,
  submitRating,
  type IncidentInsert,
  type LowRatingAlert,
  type RatingDeps,
  type RatingStore,
  type TokenRow,
  type TripForRating,
} from '../lib/ride-ratings';
import { RatingMessage, RatingThanks } from '../app/rating/[token]/view';

/**
 * Post-ride ratings. No database, no network: an in-memory store and a fake alerter stand in for
 * Supabase and lib/notifications.ts.
 */

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const TRIP = '11111111-2222-4333-8444-555555555555';
const DRIVER = '99999999-8888-4777-8666-555555555555';
const NOW = new Date('2026-11-10T15:00:00Z');
const ON = { RATINGS_ENABLED: 'true', GOOGLE_REVIEW_URL: 'https://g.page/r/example/review', NEXT_PUBLIC_SITE_URL: 'https://site.test' };

// Guard: nothing in this file may reach the network.
globalThis.fetch = (() => {
  throw new Error('test tried to call fetch');
}) as typeof fetch;

type Fake = {
  store: RatingStore;
  trips: Map<string, TripForRating>;
  events: Map<string, string[]>;
  tokens: Array<TokenRow & { token_hash: string }>;
  ratings: Array<{ id: string; trip_id: string; score: number; comment: string | null; rater_type: string }>;
  incidents: IncidentInsert[];
  alerts: LowRatingAlert[];
  failIncident?: boolean;
  failReads?: boolean;
};

function fake(trip: Partial<TripForRating> | null = {}, events: string[] = []): Fake {
  const f: Fake = {
    trips: new Map(),
    events: new Map([[TRIP, events]]),
    tokens: [],
    ratings: [],
    incidents: [],
    alerts: [],
    store: undefined as unknown as RatingStore,
  };
  if (trip) f.trips.set(TRIP, { id: TRIP, status: 'completed', driver_id: DRIVER, is_test_data: false, ...trip });
  const reads = () => {
    if (f.failReads) throw new Error('db down');
  };
  f.store = {
    async findTrip(id) {
      reads();
      return f.trips.get(id) ?? null;
    },
    async tripEvents(id) {
      reads();
      return f.events.get(id) ?? [];
    },
    async insertToken(row) {
      f.tokens.push({ id: `tok-${f.tokens.length + 1}`, used_at: null, ...row });
    },
    async findTokenByHash(h) {
      reads();
      const r = f.tokens.find((x) => x.token_hash === h);
      return r ? { id: r.id, trip_id: r.trip_id, expires_at: r.expires_at, used_at: r.used_at } : null;
    },
    async markTokenUsed(id, at) {
      const r = f.tokens.find((x) => x.id === id);
      if (r && !r.used_at) r.used_at = at;
    },
    async findRatingForTrip(id) {
      reads();
      const r = f.ratings.find((x) => x.trip_id === id);
      return r ? { id: r.id, score: r.score } : null;
    },
    async insertRating(row) {
      // Behaves like the unique constraint on ride_ratings.trip_id.
      if (f.ratings.some((x) => x.trip_id === row.trip_id)) return 'duplicate';
      const id = `rating-${f.ratings.length + 1}`;
      f.ratings.push({ id, ...row });
      return { id };
    },
    async insertIncident(row) {
      if (f.failIncident) return null;
      f.incidents.push(row);
      return String(f.incidents.length);
    },
  };
  return f;
}

function deps(f: Fake, env: Record<string, string | undefined> = ON, now = NOW): RatingDeps {
  return { store: f.store, alert: async (a) => void f.alerts.push(a), env, now: () => now };
}

/** Mint a link through the real path and return its token. */
async function mintToken(f: Fake, env = ON): Promise<string> {
  const r = await mintRatingLink(deps(f, env), TRIP);
  assert.ok(r.ok, JSON.stringify(r));
  return r.url.split('/rating/')[1]!;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

async function main() {
  // ─────────────────────────────── flag
  await t('flag is on only for the exact string "true"', () => {
    assert.equal(ratingsEnabled({ RATINGS_ENABLED: 'true' }), true);
    for (const v of [undefined, '', 'TRUE', 'True', '1', 'yes', ' true', 'true ', 'on']) {
      assert.equal(ratingsEnabled({ RATINGS_ENABLED: v }), false, String(v));
    }
  });

  await t('flag off: nothing is minted', async () => {
    const f = fake();
    const r = await mintRatingLink(deps(f, { ...ON, RATINGS_ENABLED: undefined }), TRIP);
    assert.deepEqual(r, { ok: false, error: 'disabled' });
    assert.equal(f.tokens.length, 0);
  });

  await t('flag off: the page is neutral and a submit records nothing', async () => {
    const f = fake();
    const token = await mintToken(f);
    const off = { ...ON, RATINGS_ENABLED: 'false' };
    assert.deepEqual(await loadRatingPage(deps(f, off), token), { kind: 'disabled' });
    assert.deepEqual(await submitRating(deps(f, off), { token, score: '5', comment: '' }), { kind: 'disabled' });
    assert.equal(f.ratings.length, 0);
  });

  // ─────────────────────────────── token
  await t('tokens: 32 random bytes as 43 URL-safe characters, unique, only the hash is stored', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const tok = generateRatingToken();
      assert.ok(isValidRatingToken(tok), tok);
      seen.add(tok);
    }
    assert.equal(seen.size, 300);
    assert.match(hashRatingToken('abc'), /^[0-9a-f]{64}$/);

    const f = fake();
    const token = await mintToken(f);
    assert.equal(f.tokens.length, 1);
    assert.equal(f.tokens[0]!.token_hash, hashRatingToken(token));
    assert.ok(!JSON.stringify(f.tokens).includes(token), 'raw token must not be stored');
  });

  await t('the link is /rating/<token>: no trip id, name, phone or trip number in it', async () => {
    const f = fake();
    const r = await mintRatingLink(deps(f), TRIP);
    assert.ok(r.ok);
    assert.match(r.url, /^https:\/\/site\.test\/rating\/[A-Za-z0-9_-]{43}$/);
    assert.ok(!r.url.includes(TRIP) && !r.url.includes(TRIP.slice(0, 8)) && !r.url.includes('?'));
  });

  await t('the link expires after 14 days', async () => {
    const f = fake();
    const r = await mintRatingLink(deps(f), TRIP);
    assert.ok(r.ok);
    assert.equal(r.expiresAt, '2026-11-24T15:00:00.000Z');
    const token = r.url.split('/rating/')[1]!;
    const later = new Date('2026-11-24T15:00:01Z');
    assert.deepEqual(await loadRatingPage(deps(f, ON, later), token), { kind: 'expired' });
    assert.deepEqual(await submitRating(deps(f, ON, later), { token, score: '5', comment: '' }), { kind: 'expired' });
    assert.equal(f.ratings.length, 0);
  });

  await t('unknown or malformed tokens are refused', async () => {
    const f = fake();
    await mintToken(f);
    for (const bad of ['', 'abc', 'a'.repeat(42), 'a'.repeat(44), '../' + 'a'.repeat(40), generateRatingToken()]) {
      assert.deepEqual(await loadRatingPage(deps(f), bad), { kind: 'invalid' }, bad);
    }
  });

  await t('internal endpoint auth: Bearer secret, constant-time, empty secret refuses', () => {
    assert.equal(bearerMatches('Bearer s3cret-value', 's3cret-value'), true);
    assert.equal(bearerMatches('Bearer s3cret-valuX', 's3cret-value'), false);
    assert.equal(bearerMatches('Bearer s3cret', 's3cret-value'), false);
    assert.equal(bearerMatches('s3cret-value', 's3cret-value'), false);
    assert.equal(bearerMatches(null, 's3cret-value'), false);
    assert.equal(bearerMatches('Bearer ', ''), false);
    assert.equal(bearerMatches('Bearer x', undefined), false);
  });

  // ─────────────────────────────── which trips can be rated
  await t('a cancelled trip cannot be rated (no link minted, no rating stored)', async () => {
    const f = fake({ status: 'cancelled' });
    assert.deepEqual(await mintRatingLink(deps(f), TRIP), { ok: false, error: 'not_ratable' });
    assert.equal(f.tokens.length, 0);

    // Even with a link minted while it looked completed, a later cancel blocks the submit.
    const g = fake();
    const token = await mintToken(g);
    g.trips.get(TRIP)!.status = 'cancelled';
    assert.deepEqual(await loadRatingPage(deps(g), token), { kind: 'not_ratable' });
    assert.deepEqual(await submitRating(deps(g), { token, score: '5', comment: '' }), { kind: 'not_ratable' });
    assert.equal(g.ratings.length, 0);
  });

  await t('a no_show (or cancelled event) blocks rating even if the status says closed', async () => {
    for (const ev of ['no_show', 'cancelled']) {
      const f = fake({ status: 'closed' }, ['created', ev]);
      assert.deepEqual(await mintRatingLink(deps(f), TRIP), { ok: false, error: 'not_ratable' }, ev);
    }
  });

  await t('only completed or closed trips are ratable; test data never is', () => {
    const base: TripForRating = { id: TRIP, status: 'completed', driver_id: null, is_test_data: false };
    assert.deepEqual(checkRatable(base, []), { ok: true });
    assert.deepEqual(checkRatable({ ...base, status: 'closed' }, ['completed']), { ok: true });
    for (const s of ['new', 'quoted', 'confirmed', 'assigned', 'cancelled', null]) {
      assert.deepEqual(checkRatable({ ...base, status: s }, []), { ok: false, reason: 'not_ratable' }, String(s));
    }
    assert.deepEqual(checkRatable({ ...base, is_test_data: true }, []), { ok: false, reason: 'test_data' });
    assert.deepEqual(checkRatable(null, []), { ok: false, reason: 'not_found' });
  });

  await t('mint refuses test data and unknown trips', async () => {
    assert.deepEqual(await mintRatingLink(deps(fake({ is_test_data: true })), TRIP), { ok: false, error: 'test_data' });
    assert.deepEqual(await mintRatingLink(deps(fake(null)), TRIP), { ok: false, error: 'not_found' });
  });

  // ─────────────────────────────── one rating per trip
  await t('one rating per trip: a second submit does not create a second rating', async () => {
    const f = fake();
    const token = await mintToken(f);
    const first = await submitRating(deps(f), { token, score: '5', comment: 'Lovely driver' });
    assert.equal(first.kind, 'thanks');
    const second = await submitRating(deps(f), { token, score: '1', comment: 'changed my mind' });
    assert.deepEqual(second, { kind: 'thanks', score: 5, googleUrl: 'https://g.page/r/example/review' });
    // A second link for the same trip cannot add one either.
    const other = await mintRatingLink(deps(f), TRIP);
    assert.deepEqual(other, { ok: false, error: 'already_rated' });
    assert.equal(f.ratings.length, 1);
    assert.equal(f.ratings[0]!.score, 5);
    assert.equal(f.alerts.length, 0, 'the ignored second submit must not alert');
    assert.ok(f.tokens[0]!.used_at, 'token marked used');
  });

  await t('one rating per trip: losing a race to the unique constraint shows the thank-you', async () => {
    const f = fake();
    const token = await mintToken(f);
    // Simulate another request winning between the check and the insert.
    const realFind = f.store.findRatingForTrip;
    let calls = 0;
    f.store.findRatingForTrip = async (id) => (calls++ < 1 ? null : realFind(id));
    f.ratings.push({ id: 'rating-x', trip_id: TRIP, score: 4, comment: null, rater_type: 'customer' });
    const r = await submitRating(deps(f), { token, score: '2', comment: '' });
    assert.equal(r.kind, 'thanks');
    assert.equal(f.ratings.length, 1);
    assert.equal(f.alerts.length, 0);
    assert.equal(f.incidents.length, 0);
  });

  await t('loading the page (GET) never records a rating', async () => {
    const f = fake();
    const token = await mintToken(f);
    for (let i = 0; i < 3; i++) assert.deepEqual(await loadRatingPage(deps(f), token), { kind: 'open' });
    assert.equal(f.ratings.length, 0);
    assert.equal(f.tokens[0]!.used_at, null);
  });

  // ─────────────────────────────── low scores
  await t('a low score creates an admin alert and an issue linked to the trip and driver', async () => {
    for (const [score, severity] of [[1, 'moderate'], [2, 'moderate'], [3, 'minor']] as const) {
      const f = fake();
      const token = await mintToken(f);
      const r = await submitRating(deps(f), { token, score: String(score), comment: '  Driver was late  ' });
      assert.deepEqual(r, { kind: 'thanks', score, googleUrl: 'https://g.page/r/example/review' });
      assert.equal(f.incidents.length, 1);
      const inc = f.incidents[0]!;
      assert.equal(inc.trip_id, TRIP);
      assert.equal(inc.severity, severity);
      assert.equal(inc.incident_type, 'low_rating');
      assert.equal(inc.resolution_status, 'open');
      assert.equal(inc.is_test_data, false);
      assert.deepEqual(inc.context, { source: 'ride_rating', rating_id: f.ratings[0]!.id, score, driver_id: DRIVER });
      assert.equal(f.alerts.length, 1);
      assert.deepEqual(f.alerts[0], { tripId: TRIP, ratingId: f.ratings[0]!.id, score, comment: 'Driver was late', issueId: '1' });
    }
  });

  await t('the admin is still alerted when the issue cannot be written', async () => {
    const f = fake();
    f.failIncident = true;
    const token = await mintToken(f);
    await submitRating(deps(f), { token, score: '1', comment: '' });
    assert.equal(f.alerts.length, 1);
    assert.equal(f.alerts[0]!.issueId, null);
    assert.equal(f.ratings.length, 1);
  });

  await t('a failing alerter does not lose the rating', async () => {
    const f = fake();
    const token = await mintToken(f);
    const d = { ...deps(f), alert: async () => { throw new Error('push down'); } };
    const r = await submitRating(d, { token, score: '2', comment: '' });
    assert.equal(r.kind, 'thanks');
    assert.equal(f.ratings.length, 1);
  });

  await t('scores 4 and 5 open no issue and send no alert', async () => {
    for (const score of [4, 5]) {
      const f = fake();
      const token = await mintToken(f);
      await submitRating(deps(f), { token, score: String(score), comment: '' });
      assert.equal(f.incidents.length, 0);
      assert.equal(f.alerts.length, 0);
    }
  });

  await t('incident severity: 3 is minor, 1-2 are moderate', () => {
    const mk = (score: number) => buildLowRatingIncident({ tripId: TRIP, ratingId: 'r', score, driverId: null, now: NOW });
    assert.equal(mk(3).severity, 'minor');
    assert.equal(mk(2).severity, 'moderate');
    assert.equal(mk(1).severity, 'moderate');
    assert.equal(mk(1).context.driver_id, null);
  });

  // ─────────────────────────────── Google prompt
  await t('no Google prompt when the URL is empty', async () => {
    for (const url of [undefined, '', '   ']) {
      const f = fake();
      const token = await mintToken(f);
      const r = await submitRating(deps(f, { ...ON, GOOGLE_REVIEW_URL: url }), { token, score: '5', comment: '' });
      assert.deepEqual(r, { kind: 'thanks', score: 5, googleUrl: null });
    }
    const html = renderToStaticMarkup(createElement(RatingThanks, { score: 5, googleUrl: null }));
    assert.ok(html.includes('Thank you'));
    assert.ok(!html.includes('google-review-prompt') && !/Google/i.test(html), html);
  });

  await t('Google prompt shows for EVERY score 1-5 when an https URL is set (Phil, 2026-11-12)', async () => {
    for (const score of [1, 2, 3, 4, 5]) {
      const html = renderToStaticMarkup(createElement(RatingThanks, { score, googleUrl: 'https://g.page/r/example/review' }));
      assert.ok(html.includes('Would you share your experience on Google?'), `score ${score}`);
      assert.ok(html.includes('href="https://g.page/r/example/review"'));
      assert.ok(html.includes('rel="noopener noreferrer"'));
      const f = fake();
      const token = await mintToken(f);
      const r = await submitRating(deps(f), { token, score: String(score), comment: '' });
      assert.deepEqual(r, { kind: 'thanks', score, googleUrl: 'https://g.page/r/example/review' });
    }
  });

  await t('only an https Google review URL is accepted', () => {
    assert.equal(googleReviewUrl({ GOOGLE_REVIEW_URL: 'https://g.page/r/x/review' }), 'https://g.page/r/x/review');
    for (const bad of ['http://g.page/r/x', 'javascript:alert(1)', 'not a url', 'ftp://x.test', '//g.page/x']) {
      assert.equal(googleReviewUrl({ GOOGLE_REVIEW_URL: bad }), null, bad);
    }
  });

  // ─────────────────────────────── input
  await t('score must be a whole number 1-5; nothing is stored otherwise', async () => {
    assert.equal(parseScore('1'), 1);
    assert.equal(parseScore(5), 5);
    for (const bad of ['0', '6', '2.5', 'abc', '', null, undefined, 3.5, '1; drop table']) {
      assert.equal(parseScore(bad), null, String(bad));
    }
    const f = fake();
    const token = await mintToken(f);
    assert.deepEqual(await submitRating(deps(f), { token, score: '9', comment: '' }), { kind: 'bad_input' });
    assert.equal(f.ratings.length, 0);
  });

  await t('comment is trimmed, capped at 1000 characters and stored plain', async () => {
    assert.equal(cleanComment('   '), null);
    assert.equal(cleanComment(null), null);
    assert.equal(cleanComment('  hi  '), 'hi');
    assert.equal(cleanComment('x'.repeat(1500))!.length, 1000);
    const f = fake();
    const token = await mintToken(f);
    await submitRating(deps(f), { token, score: '4', comment: '<script>alert(1)</script>' });
    assert.equal(f.ratings[0]!.comment, '<script>alert(1)</script>');
    assert.equal(f.ratings[0]!.rater_type, 'customer');
  });

  await t('a database failure gives a neutral page, never a crash', async () => {
    const f = fake();
    const token = await mintToken(f);
    f.failReads = true;
    assert.deepEqual(await loadRatingPage(deps(f), token), { kind: 'error' });
    assert.deepEqual(await submitRating(deps(f), { token, score: '5', comment: '' }), { kind: 'error' });
    assert.deepEqual(await mintRatingLink(deps(f), TRIP), { ok: false, error: 'server_error' });
    for (const kind of ['disabled', 'invalid', 'expired', 'not_ratable', 'error'] as const) {
      const html = renderToStaticMarkup(createElement(RatingMessage, { state: { kind } }));
      assert.ok(html.includes('<h1'), kind);
      assert.ok(!html.includes(TRIP), kind);
    }
  });

  // ─────────────────────────────── pay is untouched
  await t('ratings code never references driver pay', () => {
    const files = [
      'lib/ride-ratings.ts',
      'lib/ride-ratings.server.ts',
      'supabase/migrations/20261110T0100_ride_ratings.sql',
      ...walk(join(ROOT, 'app/rating')).map((p) => p.slice(ROOT.length + 1)),
      ...walk(join(ROOT, 'app/api/internal/rating-link')).map((p) => p.slice(ROOT.length + 1)),
    ];
    const banned = /driver_pay|pay_rate|pay_|_pay\b|payout|payroll|earnings|wage|bonus|compensation_|pay_rates/i;
    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      const hit = src.match(banned);
      assert.equal(hit, null, `${rel} mentions "${hit?.[0]}"`);
    }
    // The alert added to lib/notifications.ts must not reach for a pay column either.
    const notif = readFileSync(join(ROOT, 'lib/notifications.ts'), 'utf8');
    const fn = notif.slice(notif.indexOf('export async function notifyOperatorLowRating'));
    assert.ok(fn.length > 0 && fn.length < 3000);
    assert.equal(fn.match(banned), null);
  });

  await t('the old smiley flow is left in place', () => {
    const old = readFileSync(join(ROOT, 'app/rate/page.tsx'), 'utf8');
    assert.ok(old.includes("schema('tassy_archive')"));
  });

  console.log(`\n${n} ride-rating checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
