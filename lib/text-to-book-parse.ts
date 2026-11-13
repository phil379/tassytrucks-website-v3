import { CLT_TERMINAL, HOTEL_ZONES, type HotelZoneRow } from '@/lib/hotel-zones';
import { OPERATING_TIME_ZONE, parseLocalDateTime, toLocalDateTimeInput } from '@/lib/time';
import { MIN_LEAD_TIME_MS } from '@/lib/trip-request';

/**
 * Text-to-book PARSER. Small and deterministic: regular expressions and a fixed alias list, no
 * language model. PURE: the clock arrives as an argument.
 *
 * It only understands trips it can place: a hotel from the hotel zone table (lib/hotel-zones.ts)
 * or the CLT airport. When it is not sure of something (an unknown place, a missing or ambiguous
 * date or time, an ambiguous hotel, a past time) it returns ONE short question and never a guess.
 */

export const AIRPORT_ID = 'clt';
export type PlaceId = string; // a hotel slug, or AIRPORT_ID

export type Place =
  | { kind: 'airport'; id: typeof AIRPORT_ID; label: string; lat: number; lng: number }
  | { kind: 'hotel'; id: string; label: string; lat: number; lng: number; hotel: HotelZoneRow };

export type ParseFailReason =
  | 'empty'
  | 'unknown_place'
  | 'ambiguous_place'
  | 'missing_place'
  | 'same_place'
  | 'no_direction'
  | 'missing_date'
  | 'ambiguous_date'
  | 'missing_time'
  | 'ambiguous_time'
  | 'past_time'
  | 'too_soon'
  | 'wheelchair';

export type ParseResult =
  | {
      ok: true;
      pickup: PlaceId;
      dropoff: PlaceId;
      /** Charlotte wall-clock `YYYY-MM-DDTHH:mm`, the same shape the booking form's input uses. */
      local: string;
      /** "Fri Nov 13, 6:00 AM". */
      display: string;
    }
  | {
      ok: false;
      reason: ParseFailReason;
      /** The one clarifying question (or short instruction) to send back. */
      question: string;
      /** Hotel slugs offered, for an ambiguous hotel. */
      options?: string[];
    };

// ── Places ────────────────────────────────────────────────────────────────────────────────────

/** Words dropped before matching, from the text AND from the aliases, so "the" or "hotel" never decide anything. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'at', 'on', 'in', 'for', 'and', 'of', 'please', 'pls', 'plz', 'thanks', 'thank', 'you', 'thx',
  'hotel', 'charlotte', 'i', 'im', 'me', 'my', 'we', 'us', 'need', 'needs', 'want', 'would', 'like',
  'ride', 'rides', 'car', 'suv', 'pickup', 'pick', 'up', 'book', 'booking', 'get', 'going', 'go', 'trip', 'can',
  'is', 'it', 'its', 'be', 'leaving', 'leave', 'depart', 'departing', 'arriving', 'arrive', 'around', 'about',
  'one', 'way', 'oneway', 'hi', 'hello', 'hey', 'quote', 'price', 'how', 'much', 'whats', 'what',
]);

/**
 * Common names for the listed hotels. Keys MUST be slugs in HOTEL_ZONES (scripts/test-text-to-book.ts
 * checks). Each hotel's own label is an alias too, so only shorthand is listed here.
 */
export const HOTEL_TEXT_ALIASES: Record<string, readonly string[]> = {
  jw: ['jw', 'jw marriott', 'jw marriot', 'jw marriott uptown', 'j w marriott'],
  westin: ['westin', 'the westin'],
  'marriott-city-center': ['marriott city center', 'city center marriott', 'marriott center city'],
  bohemian: ['bohemian', 'grand bohemian'],
  courtyard: ['courtyard', 'courtyard marriott', 'courtyard city center'],
  'hilton-uptown': ['hilton uptown', 'uptown hilton', 'hilton center city'],
  omni: ['omni'],
  aloft: ['aloft', 'aloft city center', 'aloft uptown'],
  iveys: ['iveys', 'ivey s', 'ivey', 'the iveys'],
  'ac-southpark': ['ac southpark', 'ac south park', 'southpark ac', 'ac'],
  'sheraton-airport': ['sheraton', 'sheraton airport'],
  'hilton-airport': ['hilton airport', 'airport hilton'],
  'hgi-airport': ['hilton garden inn', 'hilton garden', 'hgi', 'hilton garden airport', 'garden inn'],
  'hampton-airport': ['hampton', 'hampton inn', 'hampton airport', 'hampton inn airport'],
};

/** Names that fit more than one listed hotel: always a question, never a pick. */
const AMBIGUOUS_ALIASES: Record<string, readonly string[]> = {
  hilton: ['hilton-uptown', 'hilton-airport'],
  marriott: ['jw', 'marriott-city-center', 'courtyard'],
  marriot: ['jw', 'marriott-city-center', 'courtyard'],
};

const AIRPORT_ALIASES = [
  'clt', 'airport', 'the airport', 'charlotte airport', 'charlotte douglas', 'douglas',
  'charlotte douglas international airport', 'douglas international', 'cltairport', 'clt airport',
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w));
}

type Alias = { words: string[]; ids: readonly string[] };

const ALIASES: Alias[] = (() => {
  const out: Alias[] = [];
  const add = (text: string, ids: readonly string[]) => {
    const words = tokens(text);
    if (words.length) out.push({ words, ids });
  };
  for (const h of HOTEL_ZONES) add(h.label, [h.slug]);
  for (const [slug, list] of Object.entries(HOTEL_TEXT_ALIASES)) for (const a of list) add(a, [slug]);
  for (const [a, ids] of Object.entries(AMBIGUOUS_ALIASES)) add(a, ids);
  for (const a of AIRPORT_ALIASES) add(a, [AIRPORT_ID]);
  add(CLT_TERMINAL.label, [AIRPORT_ID]);
  return out;
})();

export function placeFor(id: PlaceId): Place | null {
  if (id === AIRPORT_ID) {
    return { kind: 'airport', id: AIRPORT_ID, label: 'CLT airport', lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng };
  }
  const hotel = HOTEL_ZONES.find((h) => h.slug === id);
  return hotel ? { kind: 'hotel', id: hotel.slug, label: hotel.label, lat: hotel.lat, lng: hotel.lng, hotel } : null;
}

type Resolved =
  | { kind: 'place'; id: PlaceId }
  | { kind: 'ambiguous'; ids: string[] }
  | { kind: 'unknown'; text: string }
  | { kind: 'missing' };

/** Which place a fragment of the text names. Longest alias wins; overlapping shorter ones are dropped. */
export function resolvePlace(fragment: string): Resolved {
  const words = tokens(fragment);
  if (words.length === 0) return { kind: 'missing' };

  type Span = { start: number; end: number; ids: readonly string[] };
  const spans: Span[] = [];
  for (const alias of ALIASES) {
    const n = alias.words.length;
    for (let i = 0; i + n <= words.length; i++) {
      let hit = true;
      for (let j = 0; j < n; j++) if (words[i + j] !== alias.words[j]) { hit = false; break; }
      if (hit) spans.push({ start: i, end: i + n, ids: alias.ids });
    }
  }
  if (spans.length === 0) return { kind: 'unknown', text: words.join(' ') };

  const kept = spans.filter(
    (s) => !spans.some((o) => o !== s && o.start <= s.start && o.end >= s.end && o.end - o.start > s.end - s.start),
  );

  // The place every remaining name agrees on.
  let common = new Set(kept[0]!.ids);
  for (const s of kept.slice(1)) common = new Set([...common].filter((id) => s.ids.includes(id)));
  if (common.size === 1) return { kind: 'place', id: [...common][0]! };
  if (common.size > 1) return { kind: 'ambiguous', ids: [...common] };

  // "Hampton airport", "Sheraton airport": an airport-area hotel's name often carries the word.
  const all = new Set(kept.flatMap((s) => [...s.ids]));
  const hotels = [...all].filter((id) => id !== AIRPORT_ID);
  if (all.has(AIRPORT_ID) && hotels.length === 1 && placeFor(hotels[0]!)?.kind === 'hotel') {
    const p = placeFor(hotels[0]!);
    if (p?.kind === 'hotel' && p.hotel.zone === 'airport-area') return { kind: 'place', id: p.id };
  }
  return { kind: 'ambiguous', ids: [...all] };
}

// ── Dates and times ──────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Ymd = { y: number; m: number; d: number };

const pad = (n: number) => String(n).padStart(2, '0');
const ymdString = (v: Ymd) => `${v.y}-${pad(v.m)}-${pad(v.d)}`;
const ymdUtc = (v: Ymd) => Date.UTC(v.y, v.m - 1, v.d);
function fromUtc(ms: number): Ymd {
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** Today's date in Charlotte. */
function todayIn(now: Date): Ymd {
  const s = toLocalDateTimeInput(now, OPERATING_TIME_ZONE);
  return { y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)) };
}

function weekdayIndex(word: string): number {
  return WEEKDAYS.indexOf(word.slice(0, 3));
}

/** "Fri Nov 13, 6:00 AM" for a naive Charlotte `YYYY-MM-DDTHH:mm`. */
export function displayWhen(local: string): string {
  const y = Number(local.slice(0, 4));
  const m = Number(local.slice(5, 7));
  const d = Number(local.slice(8, 10));
  const h = Number(local.slice(11, 13));
  const mi = local.slice(14, 16);
  const wd = WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${wd} ${MONTH_NAMES[m - 1]} ${d}, ${h12}:${mi} ${h < 12 ? 'AM' : 'PM'}`;
}

type TimeFound = { kind: 'ok'; h: number; mi: number } | { kind: 'ambiguous'; hint?: string } | { kind: 'none' };
type DateFound = { kind: 'ok'; ymd: Ymd; sameWeekdayAsToday?: boolean } | { kind: 'ambiguous' } | { kind: 'none' };

/** Finds the time and blanks it out of the text, so "6" in "6am" is never read as anything else. */
function extractTime(text: string): { found: TimeFound; rest: string } {
  let rest = text;
  const hits: Array<{ h: number; mi: number } | 'ambiguous'> = [];
  let hint: string | undefined;

  rest = rest.replace(/\b(noon|midday)\b/g, () => {
    hits.push({ h: 12, mi: 0 });
    return ' ';
  });
  rest = rest.replace(/\bmidnight\b/g, () => {
    hits.push('ambiguous');
    return ' ';
  });
  rest = rest.replace(/\b(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?\s?m\b\.?/g, (_, hh: string, mm: string | undefined, ap: string) => {
    const h = Number(hh);
    if (h < 1 || h > 12) hits.push('ambiguous');
    else hits.push({ h: (h % 12) + (ap === 'p' ? 12 : 0), mi: mm ? Number(mm) : 0 });
    return ' ';
  });
  rest = rest.replace(/\b(\d{1,2}):([0-5]\d)\b/g, (_, hh: string, mm: string) => {
    const h = Number(hh);
    // 24-hour only when it cannot be the other half of the day: 18:00, 06:00, 00:30. "6:30" is a question.
    if (h <= 23 && (h >= 13 || hh.length === 2 && hh.startsWith('0'))) hits.push({ h, mi: Number(mm) });
    else {
      hits.push('ambiguous');
      hint = `${h}:${mm}`;
    }
    return ' ';
  });

  if (hits.length === 0) {
    // A bare hour ("Friday 6") is a question about AM or PM, not a guess.
    const bare = /(?:^|\s)(?:at\s+)?(1[0-2]|[1-9])(?=\s|$)/.exec(rest);
    if (bare) {
      rest = rest.replace(bare[0], ' ');
      return { found: { kind: 'ambiguous', hint: bare[1] }, rest };
    }
    return { found: { kind: 'none' }, rest };
  }
  const first = hits[0]!;
  const allSame = hits.every((x) => x !== 'ambiguous' && first !== 'ambiguous' && x.h === first.h && x.mi === first.mi);
  if (!allSame || first === 'ambiguous') return { found: { kind: 'ambiguous', hint }, rest };
  return { found: { kind: 'ok', h: first.h, mi: first.mi }, rest };
}

/** Finds the date (today, tomorrow, a weekday, M/D) and blanks it out of the text. */
function extractDate(text: string, now: Date): { found: DateFound; rest: string } {
  const today = todayIn(now);
  const todayMs = ymdUtc(today);
  const todayWd = new Date(todayMs).getUTCDay();
  const dates: Array<{ ymd: Ymd; sameWeekdayAsToday?: boolean } | 'ambiguous'> = [];
  let rest = text;

  rest = rest.replace(/\b(today|tonight|tonite|this (?:morning|afternoon|evening))\b/g, () => {
    dates.push({ ymd: today });
    return ' ';
  });
  rest = rest.replace(/\b(tomorrow|tomorow|tommorow|tommorrow|tmrw|tmr|tmw)\b/g, () => {
    dates.push({ ymd: fromUtc(todayMs + DAY_MS) });
    return ' ';
  });
  rest = rest.replace(
    /\b(this\s+|next\s+)?(mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/g,
    (_, qualifier: string | undefined, day: string) => {
      // "Next Friday" means this week's Friday to some people and next week's to others: ask.
      if (qualifier && qualifier.trim() === 'next') {
        dates.push('ambiguous');
        return ' ';
      }
      const wd = weekdayIndex(day);
      const ahead = (wd - todayWd + 7) % 7;
      dates.push({ ymd: fromUtc(todayMs + ahead * DAY_MS), sameWeekdayAsToday: ahead === 0 });
      return ' ';
    },
  );
  rest = rest.replace(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?\b/g, (_, mm: string, dd: string, yy: string | undefined) => {
    const m = Number(mm);
    const d = Number(dd);
    let y = yy ? Number(yy.length === 2 ? `20${yy}` : yy) : today.y;
    const valid = (yr: number) => {
      const dt = new Date(Date.UTC(yr, m - 1, d));
      return m >= 1 && m <= 12 && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    };
    if (!valid(y)) {
      dates.push('ambiguous');
      return ' ';
    }
    // No year and well behind us: next year's date ("1/5" sent in November). A date a few days
    // back stays in the past, so it is caught below as a past time and asked about.
    if (!yy && ymdUtc({ y, m, d }) < todayMs - 180 * DAY_MS) {
      y += 1;
      if (!valid(y)) {
        dates.push('ambiguous');
        return ' ';
      }
    }
    dates.push({ ymd: { y, m, d } });
    return ' ';
  });

  if (dates.length === 0) return { found: { kind: 'none' }, rest };
  if (dates.some((x) => x === 'ambiguous')) return { found: { kind: 'ambiguous' }, rest };
  const list = dates as Array<{ ymd: Ymd; sameWeekdayAsToday?: boolean }>;
  const key = ymdString(list[0]!.ymd);
  if (!list.every((x) => ymdString(x.ymd) === key)) return { found: { kind: 'ambiguous' }, rest };
  return { found: { kind: 'ok', ymd: list[0]!.ymd, sameWeekdayAsToday: list.some((x) => x.sameWeekdayAsToday) && list.length === 1 }, rest };
}

// ── The parser ───────────────────────────────────────────────────────────────────────────────

const EXAMPLE = 'e.g. "CLT from JW Marriott Fri 6am"';

function labelOf(id: PlaceId): string {
  return placeFor(id)?.label ?? id;
}

function listOr(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

function fail(reason: ParseFailReason, question: string, options?: string[]): ParseResult {
  return options ? { ok: false, reason, question, options } : { ok: false, reason, question };
}

function placeQuestion(r: Resolved, end: 'pickup' | 'dropoff'): ParseResult | null {
  if (r.kind === 'place') return null;
  if (r.kind === 'ambiguous') {
    return fail('ambiguous_place', `Which one: ${listOr(r.ids.map(labelOf))}?`, r.ids);
  }
  if (r.kind === 'unknown') {
    return fail(
      'unknown_place',
      // The rider's own words are NOT echoed back: a reply carries only text written here.
      "Sorry, I don't know that place. Which Charlotte hotel, or CLT airport?",
    );
  }
  return fail('missing_place', end === 'pickup' ? 'Where should we pick you up?' : 'Where are you going?');
}

/**
 * Read a text like "CLT from JW Marriott Uptown Friday 6am".
 *
 * Direction: "X from Y" is Y to X; "from Y to X"; "Y to X"; "to X from Y".
 */
/**
 * A reply to one of our questions ("friday", "JW", "am", "11/17") is read together with the text
 * that prompted it. A date or time in the reply replaces the one in the earlier text; anything
 * else is appended, so "CLT from Marriott" + "JW" reads as "CLT from Marriott JW" (the JW Marriott).
 */
export function followUpText(previous: string, reply: string, now: Date): string {
  const lower = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'");
  let base = lower(previous);
  const r = lower(reply);
  if (extractTime(r).found.kind !== 'none') base = extractTime(base).rest;
  if (extractDate(r, now).found.kind !== 'none') base = extractDate(base, now).rest;
  return `${base} ${r}`.replace(/\s+/g, ' ').trim();
}

export function parseTripText(body: string, now: Date): ParseResult {
  const raw = (body ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s*(->|=>|→|>)\s*/g, ' to ');
  if (!raw.trim()) return fail('empty', `Text your trip, ${EXAMPLE}.`);

  if (/\b(wheel\s?chair|wav)\b/.test(raw)) {
    return fail('wheelchair', 'For a wheelchair ride, please call us at (704) 941-8508.');
  }

  const t = extractTime(raw);
  const d = extractDate(t.rest, now);
  const words = normalize(d.rest).split(' ').filter(Boolean);

  // ── Direction ──
  const fromAt = words.flatMap((w, i) => (w === 'from' ? [i] : []));
  const toAt = words.flatMap((w, i) => (w === 'to' ? [i] : []));
  if (fromAt.length > 1 || toAt.length > 1) return fail('no_direction', `Where from, and where to? ${EXAMPLE}.`);

  const part = (a: number, b: number) => words.slice(a, b).join(' ');
  let pickupText: string;
  let dropoffText: string;
  const iFrom = fromAt[0];
  const iTo = toAt[0];
  if (iFrom !== undefined && iTo !== undefined) {
    if (iFrom < iTo) {
      // "[lead] from Y to X". Anything before "from" must not name a place.
      if (tokens(part(0, iFrom)).length) return fail('no_direction', `Where from, and where to? ${EXAMPLE}.`);
      pickupText = part(iFrom + 1, iTo);
      dropoffText = part(iTo + 1, words.length);
    } else {
      if (tokens(part(0, iTo)).length) return fail('no_direction', `Where from, and where to? ${EXAMPLE}.`);
      dropoffText = part(iTo + 1, iFrom);
      pickupText = part(iFrom + 1, words.length);
    }
  } else if (iFrom !== undefined) {
    dropoffText = part(0, iFrom); // "X from Y"
    pickupText = part(iFrom + 1, words.length);
  } else if (iTo !== undefined) {
    pickupText = part(0, iTo); // "Y to X"
    dropoffText = part(iTo + 1, words.length);
  } else {
    // No direction word at all. Name what was found and ask which way.
    const whole = resolvePlace(words.join(' '));
    if (whole.kind === 'ambiguous' && whole.ids.length === 2 && whole.ids.includes(AIRPORT_ID)) {
      const hotel = whole.ids.find((id) => id !== AIRPORT_ID)!;
      return fail('no_direction', `From ${labelOf(hotel)} to CLT airport, or from CLT airport to ${labelOf(hotel)}?`);
    }
    if (whole.kind === 'place') {
      return whole.id === AIRPORT_ID
        ? fail('missing_place', 'Which hotel, and are you going to or from CLT airport?')
        : fail('missing_place', `Going from ${labelOf(whole.id)} to CLT airport, or from CLT to the hotel?`);
    }
    const q = placeQuestion(whole, 'pickup');
    if (q && whole.kind !== 'missing') return q;
    return fail('missing_place', `Where from, and where to? ${EXAMPLE}.`);
  }

  // ── Places ──
  const pickup = resolvePlace(pickupText);
  const dropoff = resolvePlace(dropoffText);
  const pq = placeQuestion(pickup, 'pickup');
  if (pq) return pq;
  const dq = placeQuestion(dropoff, 'dropoff');
  if (dq) return dq;
  const pickupId = (pickup as { id: PlaceId }).id;
  const dropoffId = (dropoff as { id: PlaceId }).id;
  if (pickupId === dropoffId) return fail('same_place', 'Pickup and drop-off look the same. Where are you going?');

  // ── Date and time ──
  if (d.found.kind === 'ambiguous') return fail('ambiguous_date', 'Which date? Reply like 11/20.');
  if (d.found.kind === 'none') return fail('missing_date', 'What day? e.g. today, tomorrow, Fri or 11/20.');
  if (t.found.kind === 'ambiguous') {
    return fail('ambiguous_time', t.found.hint ? `Is that ${t.found.hint} AM or PM?` : 'What time? e.g. 6am or 6:30 pm.');
  }
  if (t.found.kind === 'none') return fail('missing_time', 'What pickup time? e.g. 6am or 6:30 pm.');

  const local = `${ymdString(d.found.ymd)}T${pad(t.found.h)}:${pad(t.found.mi)}`;
  const when = parseLocalDateTime(local);
  if (!when) return fail('ambiguous_date', 'Which date? Reply like 11/20.');
  if (when.getTime() <= now.getTime()) {
    if (d.found.sameWeekdayAsToday) {
      const next = fromUtc(ymdUtc(d.found.ymd) + 7 * DAY_MS);
      return fail('past_time', `That time today has passed. Did you mean ${displayWhen(`${ymdString(next)}T${local.slice(11)}`)}? Reply with the date, like ${next.m}/${next.d}.`);
    }
    return fail('past_time', `${displayWhen(local)} has passed. What day and time?`);
  }
  if (when.getTime() < now.getTime() + MIN_LEAD_TIME_MS) {
    return fail('too_soon', `We need ${MIN_LEAD_TIME_MS / 3_600_000} hours notice by text. For a sooner ride, call (704) 941-8508.`);
  }

  return { ok: true, pickup: pickupId, dropoff: dropoffId, local, display: displayWhen(local) };
}
