import { createHash, randomBytes } from 'node:crypto';
import { BUSINESS } from '@/lib/business';
import type { HotelQuote, HotelQuoteInput } from '@/lib/hotel-price';
import { estimateTrip, formatRange, formatUsd } from '@/lib/quote';
import { followUpText, parseTripText, placeFor, type ParseResult } from '@/lib/text-to-book-parse';
import { isRequestable, type ServiceLine } from '@/lib/trip-request';
import { parseFormBody, validTwilioSignature } from '@/lib/twilio-signature';

/**
 * TEXT-TO-BOOK. Someone texts "CLT from JW Marriott Uptown Friday 6am" and gets back a price and a
 * booking link. NO BOOKING IS MADE BY TEXT: the rider confirms and pays on the web page.
 *
 * THE SWITCH. TEXT_TO_BOOK_MODE = off | dry_run | live, default off; anything else is off.
 *   off      the webhook stores nothing and answers an empty TwiML <Response/> (after the signature check).
 *   dry_run  works out the reply, logs it (console and the conversation table), answers an empty <Response/>.
 *   live     answers <Response><Message>...</Message></Response>. That TwiML IS the send: there is no
 *            Twilio REST client in this repo and nothing here calls Twilio.
 * No real person gets a text until Twilio carrier registration (A2P 10DLC) is approved and Phil sets live.
 *
 * Every dependency (store, clock, quote, rate limiter) is passed in, so the tests touch no database
 * and no network. The production wiring is lib/text-to-book-db.server.ts.
 */

export type TextToBookMode = 'off' | 'dry_run' | 'live';

export function textToBookMode(value: string | null | undefined): TextToBookMode {
  const v = (value ?? '').trim();
  return v === 'dry_run' || v === 'live' ? v : 'off';
}

/** The service lines text-to-book may offer: a text like this is Concierge. Each must be live (isRequestable). */
export const TEXT_TO_BOOK_SERVICE_LINES: readonly ServiceLine[] = ['concierge'];

export const INBOUND_PER_HOUR = 5;
export const HOUR_MS = 60 * 60 * 1000;

// ── Keywords (carrier rules): whole message, any case ──────────────────────────────────────────

export const STOP_WORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'] as const;
export const START_WORDS = ['START', 'UNSTOP', 'YES'] as const;
export const HELP_WORDS = ['HELP', 'INFO'] as const;

export type Keyword = 'stop' | 'start' | 'help' | null;

export function keywordOf(body: string | null | undefined): Keyword {
  const w = (body ?? '').trim().replace(/[.!]+$/, '').toUpperCase();
  if ((STOP_WORDS as readonly string[]).includes(w)) return 'stop';
  if ((START_WORDS as readonly string[]).includes(w)) return 'start';
  if ((HELP_WORDS as readonly string[]).includes(w)) return 'help';
  return null;
}

export const STOP_REPLY = `${BUSINESS.tradeName}: You are unsubscribed and will get no more texts from us. Reply START to resubscribe.`;
export const START_REPLY = `${BUSINESS.tradeName}: You are resubscribed. Text a trip like "CLT from JW Marriott Fri 6am" for a price. Reply HELP for help, STOP to opt out.`;
/**
 * HELP is answered ALWAYS, even after STOP (Phil, 2026-11-12, per carrier rules): business name,
 * phone, and how to restart. It sends no offer and no link, so it is safe for an opted-out number.
 */
export const HELP_REPLY = `${BUSINESS.tradeName}: Text a trip like "CLT from JW Marriott Fri 6am" for a price and booking link. Help: call ${BUSINESS.phoneDisplay}. Reply STOP to opt out, START to restart. Msg & data rates may apply.`;

// ── Phone numbers ──────────────────────────────────────────────────────────────────────────────

/** "+17045551234" from Twilio's From, or null. A bare 10-digit US number gets +1. */
export function e164(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  const digits = s.replace(/\D/g, '');
  if (s.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** sha256 of the pepper and the E.164 number. The number itself is never stored. */
export function phoneHash(phone: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${phone}`, 'utf8').digest('hex');
}

export function newLinkToken(): string {
  return randomBytes(12).toString('base64url');
}

/** A link token as newLinkToken makes it (16 url-safe characters). Anything else is ignored. */
export function isLinkToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16}$/.test(value);
}

// ── Store ──────────────────────────────────────────────────────────────────────────────────────

export type MessageRow = {
  phone_hash: string;
  phone_last4: string;
  direction: 'in' | 'out';
  body: string | null;
  parse_result: Record<string, unknown> | null;
  reply_body: string | null;
  mode: TextToBookMode;
  link_token: string | null;
};

export type TextToBookStore = {
  /** THROWS when it cannot tell. The caller then sends nothing (fail closed). */
  isOptedOut(phoneHash: string): Promise<boolean>;
  /** Throws on failure. */
  setOptOut(phoneHash: string, at: Date): Promise<void>;
  /** Throws on failure. */
  clearOptOut(phoneHash: string, at: Date): Promise<void>;
  /** Best effort; must not throw. */
  logMessages(rows: MessageRow[]): Promise<void>;
  /**
   * The latest inbound row from this number since `since`, for reading a reply to our question.
   * Best effort: null when there is none or the lookup fails.
   */
  lastInbound(phoneHash: string, since: Date): Promise<Pick<MessageRow, 'body' | 'parse_result'> | null>;
};

/** A reply within this long of our question is read together with the text that prompted it. */
export const FOLLOW_UP_MS = 15 * 60 * 1000;

// ── Replies ────────────────────────────────────────────────────────────────────────────────────

export type QuoteFns = {
  /** hotelQuoteServer in production (reads the intro state from the database). */
  hotelQuote: (input: HotelQuoteInput) => Promise<HotelQuote | null>;
};

export type Reply = { text: string; linkToken: string | null; detail: Record<string, unknown> };

function bookingLink(base: string, parse: Extract<ParseResult, { ok: true }> | null, token: string, hotelTrip: { slug: string; fromAirport: boolean } | null): string {
  const when = parse ? `&when=${parse.local}` : '';
  // Never a name or a phone number in the URL: a hotel slug, a direction, a time and a random token.
  if (hotelTrip) {
    return `${base}/airport?hotel=${encodeURIComponent(hotelTrip.slug)}${hotelTrip.fromAirport ? '&dir=from' : ''}${when}&ttb=${token}`;
  }
  return `${base}/request?service=concierge${when}&ttb=${token}`;
}

/**
 * The reply to a trip text. Prices come ONLY from the server quote engine: the hotel price
 * (hotelQuoteServer) for a hotel and CLT trip, else estimateTrip. Never from a model.
 */
export async function tripReply(
  body: string,
  now: Date,
  quotes: QuoteFns,
  siteBase: string,
  token: string,
): Promise<Reply> {
  const parse = parseTripText(body, now);
  if (!parse.ok) {
    // A place we cannot price: one question plus the general booking page.
    const withLink = parse.reason === 'unknown_place';
    const text = withLink ? `${parse.question} Other addresses: ${bookingLink(siteBase, null, token, null)}` : parse.question;
    return { text, linkToken: withLink ? token : null, detail: { parse } };
  }

  const service = TEXT_TO_BOOK_SERVICE_LINES.find((s) => isRequestable(s));
  const pickup = placeFor(parse.pickup)!;
  const dropoff = placeFor(parse.dropoff)!;
  const route = `${pickup.label} to ${dropoff.label}`;
  if (!service) {
    return { text: `Please book at ${bookingLink(siteBase, parse, token, null)} or call ${BUSINESS.phoneDisplay}.`, linkToken: token, detail: { parse, priced: false } };
  }

  const hotel =
    pickup.kind !== dropoff.kind
      ? await quotes.hotelQuote({ serviceLine: service, pickup, dropoff, now })
      : null;
  if (hotel) {
    const link = bookingLink(siteBase, parse, token, { slug: hotel.slug, fromAirport: hotel.direction === 'from-airport' });
    return {
      text: `${route}, ${parse.display}: ${formatUsd(hotel.oneWayChargedCents)} flat, one way, Tassy Concierge. Book and pay here: ${link} Reply STOP to opt out.`,
      linkToken: token,
      detail: { parse, priced: true, source: 'hotel', chargedCents: hotel.oneWayChargedCents, slug: hotel.slug, introApplied: hotel.introApplied },
    };
  }

  // Not a listed hotel and CLT trip (hotel to hotel): the normal engine, from known coordinates.
  const est = estimateTrip({ serviceLine: service, pickup, dropoff, requestedAt: parse.local });
  const link = bookingLink(siteBase, parse, token, null);
  if (est?.kind === 'estimate') {
    return {
      text: `${route}, ${parse.display}: est. ${formatRange(est)} one way, Tassy Concierge. Request it here and we confirm the final price: ${link} Reply STOP to opt out.`,
      linkToken: token,
      detail: { parse, priced: true, source: 'estimate', lowCents: est.lowCents, highCents: est.highCents },
    };
  }
  return { text: `${route}, ${parse.display}: please book at ${link} for a price.`, linkToken: token, detail: { parse, priced: false } };
}

// ── The webhook ────────────────────────────────────────────────────────────────────────────────

export type InboundRequest = {
  /** The full public URL Twilio signed (TEXT_TO_BOOK_WEBHOOK_URL, or rebuilt from the request). */
  url: string;
  signature: string | null;
  rawBody: string;
};

export type InboundEnv = {
  mode: string | undefined;
  authToken: string | undefined;
  pepper: string | undefined;
  siteBase: string;
};

export type InboundDeps = {
  env: InboundEnv;
  store: TextToBookStore;
  now: () => Date;
  quotes: QuoteFns;
  /** lib/rate-limit.ts in production. */
  rateLimit: (key: string) => { ok: boolean };
  newToken?: () => string;
  log?: (line: string) => void;
};

export type InboundResult = { status: number; body: string; contentType: string; reply: string | null };

const XML = 'text/xml; charset=utf-8';
export const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

function xmlEscape(s: string): string {
  // Element text: only &, < and > need escaping.
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function messageTwiml(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(text)}</Message></Response>`;
}

const empty = (): InboundResult => ({ status: 200, body: EMPTY_TWIML, contentType: XML, reply: null });

export async function handleInbound(req: InboundRequest, deps: InboundDeps): Promise<InboundResult> {
  const log = deps.log ?? ((line: string) => console.log(line));
  const params = parseFormBody(req.rawBody);

  // 1. Signature. Missing token, missing header or a wrong signature: 403, nothing read further.
  if (!validTwilioSignature(deps.env.authToken, req.url, params, req.signature)) {
    if (!deps.env.authToken) log('[text-to-book] refused: TWILIO_AUTH_TOKEN is not set');
    return { status: 403, body: 'Forbidden', contentType: 'text/plain; charset=utf-8', reply: null };
  }

  // 2. The switch.
  const mode = textToBookMode(deps.env.mode);
  if (mode === 'off') return empty();

  const get = (k: string) => params.find(([name]) => name === k)?.[1] ?? '';
  const phone = e164(get('From'));
  const body = get('Body').slice(0, 1600);
  if (!phone) return empty();
  if (!deps.env.pepper) {
    log('[text-to-book] no reply: TEXT_TO_BOOK_PHONE_PEPPER is not set');
    return empty();
  }
  const hash = phoneHash(phone, deps.env.pepper);
  const last4 = phone.slice(-4);
  const now = deps.now();
  const keyword = keywordOf(body);

  const row = (direction: 'in' | 'out', text: string | null, parse: Record<string, unknown> | null, reply: string | null, token: string | null): MessageRow => ({
    phone_hash: hash,
    phone_last4: last4,
    direction,
    body: text,
    parse_result: parse,
    reply_body: reply,
    mode,
    link_token: token,
  });

  const finish = async (reply: string | null, parse: Record<string, unknown>, token: string | null): Promise<InboundResult> => {
    const rows = [row('in', body, parse, reply, null)];
    if (reply !== null) rows.push(row('out', reply, null, null, token));
    await deps.store.logMessages(rows);
    if (reply === null) return empty();
    if (mode === 'dry_run') {
      log(`[text-to-book] dry_run, not sent, to ***${last4}: ${reply}`);
      return empty();
    }
    return { status: 200, body: messageTwiml(reply), contentType: XML, reply };
  };

  // 3. STOP is honoured before anything else, rate limit included. Confirmed once, then silence.
  if (keyword === 'stop') {
    let already: boolean | null = null;
    try {
      already = await deps.store.isOptedOut(hash);
    } catch (err) {
      log(`[text-to-book] opt-out lookup failed for ***${last4}: ${String(err)}`);
    }
    if (already === true) return finish(null, { keyword, alreadyOptedOut: true }, null);
    try {
      await deps.store.setOptOut(hash, now);
    } catch (err) {
      // Nothing recorded, so nothing is promised. Twilio's own opt-out handling still applies in live.
      log(`[text-to-book] opt-out NOT recorded for ***${last4}: ${String(err)}`);
      return finish(null, { keyword, recorded: false }, null);
    }
    return finish(already === false ? STOP_REPLY : null, { keyword, recorded: true }, null);
  }

  // 4. Rate limit: 5 inbound per hour per number. Over it: no reply, logged.
  if (!deps.rateLimit(`text-to-book:${hash}`).ok) {
    log(`[text-to-book] rate limited ***${last4}`);
    return finish(null, { rateLimited: true }, null);
  }

  // 5. HELP is answered always, even after STOP and even if the opt-out lookup fails: it carries only
  //    the business name, phone and STOP/START instructions (Phil, 2026-11-12).
  if (keyword === 'help') return finish(HELP_REPLY, { keyword }, null);

  // 6. Opted out? A failed lookup sends NOTHING (fail closed).
  let optedOut: boolean;
  try {
    optedOut = await deps.store.isOptedOut(hash);
  } catch (err) {
    log(`[text-to-book] no reply: opt-out lookup failed for ***${last4}: ${String(err)}`);
    return finish(null, { optOutLookupFailed: true }, null);
  }

  if (keyword === 'start') {
    try {
      await deps.store.clearOptOut(hash, now);
    } catch (err) {
      log(`[text-to-book] opt-in NOT recorded for ***${last4}: ${String(err)}`);
      return finish(null, { keyword, recorded: false }, null);
    }
    // ONE confirmation, only when this actually re-subscribes a number that had sent STOP. A
    // repeated START/YES (or a "yes" from someone who never opted out) gets no extra text.
    return finish(optedOut ? START_REPLY : null, { keyword, recorded: true, resubscribed: optedOut }, null);
  }
  if (optedOut) return finish(null, { optedOut: true }, null);

  // 7. A trip.
  const token = (deps.newToken ?? newLinkToken)();
  let reply: Reply;
  try {
    // An answer to our last question ("friday", "JW", "am") is read with the text that prompted it.
    let tripText = body;
    let merged: string | null = null;
    if (!parseTripText(body, now).ok) {
      const prev = await deps.store.lastInbound(hash, new Date(now.getTime() - FOLLOW_UP_MS)).catch(() => null);
      const prevParse = prev?.parse_result?.parse as { ok?: boolean } | undefined;
      if (prev && prevParse && prevParse.ok === false) {
        const prevText = typeof prev.parse_result?.merged === 'string' ? prev.parse_result.merged : prev.body ?? '';
        merged = followUpText(prevText, body, now);
        tripText = merged;
      }
    }
    reply = await tripReply(tripText, now, deps.quotes, deps.env.siteBase, token);
    if (merged !== null) reply.detail.merged = merged;
  } catch (err) {
    log(`[text-to-book] no reply: quote failed for ***${last4}: ${String(err)}`);
    return finish(null, { quoteFailed: true }, null);
  }
  return finish(reply.text, reply.detail, reply.linkToken);
}
