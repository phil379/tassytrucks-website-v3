// Text-to-book: parser, pricing, keywords, signature, modes and rate limit. No database, no network:
// the store, the clock and the quote are injected, and global.fetch is stubbed to fail loudly.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hotelBySlug, hotelQuote, type HotelQuoteInput } from '../lib/hotel-price';
import { CLT_TERMINAL, HOTEL_ZONES } from '../lib/hotel-zones';
import { formatUsd } from '../lib/quote';
import { __resetRateLimits, rateLimit } from '../lib/rate-limit';
import { HOTEL_TEXT_ALIASES, parseTripText, resolvePlace } from '../lib/text-to-book-parse';
import {
  EMPTY_TWIML,
  HELP_REPLY,
  HOUR_MS,
  INBOUND_PER_HOUR,
  START_REPLY,
  STOP_REPLY,
  TEXT_TO_BOOK_SERVICE_LINES,
  handleInbound,
  keywordOf,
  textToBookMode,
  tripReply,
  type InboundDeps,
  type MessageRow,
  type TextToBookStore,
} from '../lib/text-to-book';
import { SERVICE_VALUES, UNAVAILABLE_SERVICE_LINES, isRequestable } from '../lib/trip-request';

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

// ── No network, ever ──
const fetchCalls: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: unknown) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String((input as { url?: string })?.url ?? input);
  fetchCalls.push(url);
  throw new Error(`network call in a unit test: ${url}`);
}) as typeof fetch;

// Tue Nov 10 2026, 10:00 AM in Charlotte.
const NOW = new Date('2026-11-10T15:00:00Z');
const TOKEN = 'test-twilio-auth-token';
const URL_SIGNED = 'https://www.tassytrucks.com/api/sms/inbound';
const SITE = 'https://www.tassytrucks.com';
const PHONE = '+17045550123';
const CLT = { lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng };
const at = (slug: string) => {
  const h = hotelBySlug(slug)!;
  return { lat: h.lat, lng: h.lng };
};

/** Twilio's scheme, written out here independently of lib/twilio-signature.ts. */
function sign(url: string, params: Record<string, string>, token = TOKEN): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  return createHmac('sha1', token).update(data).digest('base64');
}

const clock = { now: NOW_MS() };
function NOW_MS() {
  return Date.parse('2026-11-10T15:00:00Z');
}

function memoryStore(opts: { failLookup?: boolean } = {}) {
  const optOuts = new Map<string, boolean>();
  const rows: MessageRow[] = [];
  let calls = 0;
  const store: TextToBookStore = {
    async isOptedOut(h) {
      calls++;
      if (opts.failLookup) throw new Error('relation "text_opt_outs" does not exist');
      return optOuts.get(h) === true;
    },
    async setOptOut(h) {
      calls++;
      optOuts.set(h, true);
    },
    async clearOptOut(h) {
      calls++;
      optOuts.set(h, false);
    },
    async logMessages(r) {
      calls++;
      rows.push(...r.map((x) => ({ ...x, at: clock.now })));
    },
    async lastInbound(h, since) {
      calls++;
      const hit = [...rows].reverse().find((x) => x.phone_hash === h && x.direction === 'in' && (x as { at?: number }).at! >= since.getTime());
      return hit ? { body: hit.body, parse_result: hit.parse_result } : null;
    },
  };
  return { store, rows, optOuts, calls: () => calls };
}

// The hotel price as the web page works it out, with the intro state fixed (no database).
const INTRO = { introRidesUsed: 0, introFirstBookingAt: null };
const injectedHotelQuote = async (input: HotelQuoteInput) => hotelQuote({ ...input, ...INTRO });

const replies: string[] = [];

function deps(over: Partial<InboundDeps> & { mode?: string; authToken?: string | undefined } = {}): InboundDeps {
  const { mode: _mode, authToken: _token, ...rest } = over;
  const mode = 'mode' in over ? over.mode : 'live';
  const authToken = 'authToken' in over ? over.authToken : TOKEN;
  return {
    env: { mode, authToken, pepper: 'test-pepper', siteBase: SITE },
    store: memoryStore().store,
    now: () => NOW,
    quotes: { hotelQuote: injectedHotelQuote },
    rateLimit: () => ({ ok: true }),
    newToken: () => 'AAAAAAAAAAAAAAAA',
    log: () => {},
    ...rest,
  };
}

async function text(body: string, d: InboundDeps, from = PHONE) {
  const params = { From: from, To: '+17049418508', Body: body, MessageSid: 'SM0000', AccountSid: 'AC0000' };
  const res = await handleInbound({ url: URL_SIGNED, signature: sign(URL_SIGNED, params), rawBody: new URLSearchParams(params).toString() }, d);
  if (res.reply) replies.push(res.reply);
  return res;
}

const messageOf = (twiml: string) => /<Message>([\s\S]*)<\/Message>/.exec(twiml)?.[1] ?? null;

// ── Parser ──

await t('the owner\'s example parses: "CLT from JW Marriott Uptown Friday 6am" is JW to CLT, Fri Nov 13, 6:00 AM', () => {
  const p = parseTripText('CLT from JW Marriott Uptown Friday 6am', NOW);
  assert.ok(p.ok, JSON.stringify(p));
  assert.equal(p.pickup, 'jw');
  assert.equal(p.dropoff, 'clt');
  assert.equal(p.local, '2026-11-13T06:00');
  assert.equal(p.display, 'Fri Nov 13, 6:00 AM');
});

await t('directions: "X from Y", "from Y to X", "Y to X", "to X from Y", and an arrow', () => {
  const cases: Array<[string, string, string]> = [
    ['airport from Omni tomorrow 5:30 pm', 'omni', 'clt'],
    ['from CLT to the Westin tomorrow noon', 'clt', 'westin'],
    ["Ivey's to Charlotte airport tomorrow 18:00", 'iveys', 'clt'],
    ['need a ride to CLT from Grand Bohemian tomorrow 7am', 'bohemian', 'clt'],
    ['JW -> CLT tomorrow 6am', 'jw', 'clt'],
    ['Hampton airport to CLT tomorrow 9am', 'hampton-airport', 'clt'],
    ['CLT to Hilton Garden Inn tomorrow 9am', 'clt', 'hgi-airport'],
    ['Sheraton Charlotte Airport Hotel to airport tomorrow 9am', 'sheraton-airport', 'clt'],
  ];
  for (const [body, pickup, dropoff] of cases) {
    const p = parseTripText(body, NOW);
    assert.ok(p.ok, `${body}: ${JSON.stringify(p)}`);
    assert.equal(p.pickup, pickup, body);
    assert.equal(p.dropoff, dropoff, body);
  }
});

await t('dates: today, tomorrow, weekday names (next occurrence, Charlotte time) and M/D', () => {
  const day = (body: string) => {
    const p = parseTripText(`JW to CLT ${body}`, NOW);
    assert.ok(p.ok, `${body}: ${JSON.stringify(p)}`);
    return p.local;
  };
  assert.equal(day('today 6pm'), '2026-11-10T18:00');
  assert.equal(day('tomorrow 6am'), '2026-11-11T06:00');
  assert.equal(day('wed 6am'), '2026-11-11T06:00');
  assert.equal(day('Monday 6am'), '2026-11-16T06:00');
  assert.equal(day('tuesday 6pm'), '2026-11-10T18:00', 'today\'s weekday, later today');
  assert.equal(day('11/20 6:30 pm'), '2026-11-20T18:30');
  assert.equal(day('1/5 6am'), '2027-01-05T06:00', 'a January date sent in November is next year');
  assert.equal(day('Fri 11/13 6am'), '2026-11-13T06:00', 'a weekday and a date that agree');
  // Late evening UTC is still the same day in Charlotte: "today" must follow America/New_York.
  const late = new Date('2026-11-11T02:00:00Z'); // Tue 9:00 PM in Charlotte
  const p = parseTripText('JW to CLT tomorrow 6am', late);
  assert.ok(p.ok);
  assert.equal(p.local, '2026-11-11T06:00');
});

await t('times: 6am, 6:30 pm, 18:00, noon, 6 a.m.', () => {
  const time = (body: string) => {
    const p = parseTripText(`JW to CLT tomorrow ${body}`, NOW);
    assert.ok(p.ok, `${body}: ${JSON.stringify(p)}`);
    return p.local.slice(11);
  };
  assert.equal(time('6am'), '06:00');
  assert.equal(time('6:30 pm'), '18:30');
  assert.equal(time('18:00'), '18:00');
  assert.equal(time('noon'), '12:00');
  assert.equal(time('6 a.m.'), '06:00');
  assert.equal(time('12am'), '00:00');
  assert.equal(time('12pm'), '12:00');
});

await t('not confident means ONE question, never a guess', () => {
  const cases: Array<[string, string]> = [
    ['hello', 'missing_place'],
    ['CLT from the Ritz tomorrow 6am', 'unknown_place'],
    ['CLT from Hilton tomorrow 6am', 'ambiguous_place'],
    ['CLT from Marriott tomorrow 6am', 'ambiguous_place'],
    ['CLT from JW 6am', 'missing_date'],
    ['CLT from JW tomorrow', 'missing_time'],
    ['CLT from JW tomorrow 6', 'ambiguous_time'],
    ['CLT from JW tomorrow 6:30', 'ambiguous_time'],
    ['CLT from JW next friday 6am', 'ambiguous_date'],
    ['CLT from JW Fri 11/14 6am', 'ambiguous_date'],
    ['CLT from JW today 6am', 'past_time'],
    ['CLT from JW tuesday 6am', 'past_time'],
    ['CLT from JW 11/3 6am', 'past_time'],
    ['CLT from JW today 11am', 'too_soon'],
    ['JW CLT tomorrow 6am', 'no_direction'],
    ['CLT from CLT tomorrow 6am', 'same_place'],
    ['JW to CLT tomorrow 6am wheelchair', 'wheelchair'],
  ];
  for (const [body, reason] of cases) {
    const p = parseTripText(body, NOW);
    assert.equal(p.ok, false, `${body} should not parse`);
    if (p.ok) continue;
    assert.equal(p.reason, reason, `${body}: ${p.reason} / ${p.question}`);
    assert.ok(p.question.length > 0 && p.question.length <= 160, p.question);
    assert.ok(!/\$\d/.test(p.question), `no price in a question: ${p.question}`);
    if (reason !== 'too_soon' && reason !== 'wheelchair') assert.equal((p.question.match(/\?/g) ?? []).length, 1, `one question: ${p.question}`);
  }
});

await t('an ambiguous hotel names the choices; the hotel alias list only names real hotels', () => {
  const r = resolvePlace('hilton');
  assert.equal(r.kind, 'ambiguous');
  assert.deepEqual([...(r as { ids: string[] }).ids].sort(), ['hilton-airport', 'hilton-uptown']);
  const slugs = new Set(HOTEL_ZONES.map((h) => h.slug));
  for (const slug of Object.keys(HOTEL_TEXT_ALIASES)) assert.ok(slugs.has(slug), slug);
  for (const [alias, slug] of [['JW Marriott', 'jw'], ['JW', 'jw'], ['Westin', 'westin'], ['Omni', 'omni'], ["Ivey's", 'iveys'], ['Hilton Uptown', 'hilton-uptown'], ['CLT', 'clt'], ['Charlotte airport', 'clt'], ['airport', 'clt']]) {
    const p = resolvePlace(alias!);
    assert.deepEqual(p, { kind: 'place', id: slug }, alias);
  }
  for (const h of HOTEL_ZONES) assert.deepEqual(resolvePlace(h.label), { kind: 'place', id: h.slug }, h.label);
});

// ── Pricing ──

await t('a hotel text returns the same price as the web quote (hotelQuote, same coordinates and intro state)', async () => {
  for (const intro of [{ introRidesUsed: 0, introFirstBookingAt: null }, { introRidesUsed: 99, introFirstBookingAt: null }]) {
    for (const h of HOTEL_ZONES) {
      const web = hotelQuote({ serviceLine: 'concierge', pickup: at(h.slug), dropoff: CLT, now: NOW, ...intro })!;
      assert.ok(web, h.slug);
      const r = await tripReply(`CLT from ${h.label} Friday 6am`, NOW, { hotelQuote: async (i) => hotelQuote({ ...i, ...intro }) }, SITE, 'AAAAAAAAAAAAAAAA');
      replies.push(r.text);
      assert.ok(r.text.includes(`${formatUsd(web.chargedCents)} flat`), `${h.slug}: ${r.text}`);
      assert.equal(r.detail.chargedCents, web.chargedCents);
      // Every other dollar amount in the reply is the same one.
      assert.deepEqual([...new Set(r.text.match(/\$\d+/g))], [formatUsd(web.chargedCents)]);
    }
  }
  // Uptown during the intro is the intro price; the reply says the server's number, not a typed one.
  const res = await text('CLT from JW Marriott Uptown Friday 6am', deps());
  const msg = messageOf(res.body)!;
  const web = hotelQuote({ serviceLine: 'concierge', pickup: at('jw'), dropoff: CLT, now: NOW, ...INTRO })!;
  assert.ok(msg.includes(formatUsd(web.chargedCents)), msg);
  assert.ok(msg.includes('Fri Nov 13, 6:00 AM'), msg);
  assert.ok(msg.includes(`${SITE}/airport?hotel=jw&amp;when=2026-11-13T06:00&amp;ttb=AAAAAAAAAAAAAAAA`), msg);
});

await t('airport to hotel links with dir=from; a hotel-to-hotel trip uses estimateTrip and the /request page', async () => {
  const r = await tripReply('from CLT to the Omni tomorrow 9pm', NOW, { hotelQuote: injectedHotelQuote }, SITE, 'BBBBBBBBBBBBBBBB');
  replies.push(r.text);
  assert.ok(r.text.includes('/airport?hotel=omni&dir=from&when=2026-11-11T21:00&ttb=BBBBBBBBBBBBBBBB'), r.text);
  let hotelCalls = 0;
  const r2 = await tripReply('JW to AC SouthPark tomorrow 9am', NOW, { hotelQuote: async (i) => { hotelCalls++; return injectedHotelQuote(i); } }, SITE, 'CCCCCCCCCCCCCCCC');
  replies.push(r2.text);
  assert.equal(hotelCalls, 0, 'not a hotel and CLT trip');
  assert.equal(r2.detail.source, 'estimate');
  assert.ok(/est\. \$\d+/.test(r2.text), r2.text);
  assert.ok(r2.text.includes(`${SITE}/request?service=concierge&when=2026-11-11T09:00&ttb=CCCCCCCCCCCCCCCC`), r2.text);
});

await t('replies are short and the link never carries a phone number or a name', async () => {
  for (const h of HOTEL_ZONES) {
    const r = await tripReply(`from CLT to ${h.label} 11/20 6:30 pm`, NOW, { hotelQuote: injectedHotelQuote }, SITE, 'DDDDDDDDDDDDDDDD');
    replies.push(r.text);
    assert.ok(r.text.length <= 320, `${r.text.length}: ${r.text}`);
    const link = /https:\/\/\S+/.exec(r.text)![0];
    assert.ok(!/\d{7,}/.test(link.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, '')), link);
    assert.ok(!/name|phone|from=|to=/i.test(link), link);
  }
});

await t('only live service lines: text-to-book offers Concierge, which is requestable, and nothing retired', async () => {
  assert.ok(TEXT_TO_BOOK_SERVICE_LINES.length > 0);
  for (const s of TEXT_TO_BOOK_SERVICE_LINES) {
    assert.ok(isRequestable(s), s);
    assert.ok(SERVICE_VALUES.includes(s), s);
    assert.ok(!UNAVAILABLE_SERVICE_LINES.includes(s), s);
  }
  let seen = '';
  await tripReply('JW to CLT tomorrow 6am', NOW, { hotelQuote: async (i) => { seen = i.serviceLine; return injectedHotelQuote(i); } }, SITE, 'EEEEEEEEEEEEEEEE');
  assert.equal(seen, 'concierge');
  for (const retired of ['Guardian', 'Wellness', 'Winnie', 'Scholar', 'Recovery']) {
    for (const r of replies) assert.ok(!r.includes(retired), `${retired} in ${r}`);
  }
});

// ── Webhook: signature ──

await t('unsigned, badly signed, or no TWILIO_AUTH_TOKEN: 403; a correctly signed request is accepted', async () => {
  const params = { From: PHONE, Body: 'HELP' };
  const rawBody = new URLSearchParams(params).toString();
  const s = memoryStore();
  const d = deps({ store: s.store });
  const missing = await handleInbound({ url: URL_SIGNED, signature: null, rawBody }, d);
  assert.equal(missing.status, 403);
  const wrong = await handleInbound({ url: URL_SIGNED, signature: sign(URL_SIGNED, params, 'another-token'), rawBody }, d);
  assert.equal(wrong.status, 403);
  const tampered = await handleInbound({ url: URL_SIGNED, signature: sign(URL_SIGNED, params), rawBody: new URLSearchParams({ ...params, Body: 'STOP' }).toString() }, d);
  assert.equal(tampered.status, 403, 'a changed body fails');
  const otherUrl = await handleInbound({ url: 'https://evil.example/api/sms/inbound', signature: sign(URL_SIGNED, params), rawBody }, d);
  assert.equal(otherUrl.status, 403, 'a different URL fails');
  const noToken = await handleInbound({ url: URL_SIGNED, signature: sign(URL_SIGNED, params), rawBody }, deps({ store: s.store, authToken: undefined }));
  assert.equal(noToken.status, 403);
  assert.equal(s.calls(), 0, 'nothing read or stored for a refused request');
  const ok = await handleInbound({ url: URL_SIGNED, signature: sign(URL_SIGNED, params), rawBody }, d);
  assert.equal(ok.status, 200);
  assert.equal(messageOf(ok.body), HELP_REPLY.replace(/&/g, '&amp;'));
});

await t('the route itself: 403 unsigned, empty TwiML when signed and the mode is unset (off), nodejs and force-dynamic', async () => {
  const saved = { ...process.env };
  process.env.TWILIO_AUTH_TOKEN = TOKEN;
  process.env.TEXT_TO_BOOK_WEBHOOK_URL = URL_SIGNED;
  delete process.env.TEXT_TO_BOOK_MODE;
  try {
    const route = await import('../app/api/sms/inbound/route');
    assert.equal(route.runtime, 'nodejs');
    assert.equal(route.dynamic, 'force-dynamic');
    const params = { From: PHONE, Body: 'CLT from JW Friday 6am' };
    const body = new URLSearchParams(params).toString();
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };
    const unsigned = await route.POST(new Request('http://internal.host/api/sms/inbound', { method: 'POST', headers, body }));
    assert.equal(unsigned.status, 403);
    const signed = await route.POST(new Request('http://internal.host/api/sms/inbound', { method: 'POST', headers: { ...headers, 'x-twilio-signature': sign(URL_SIGNED, params) }, body }));
    assert.equal(signed.status, 200);
    assert.equal(await signed.text(), EMPTY_TWIML);
    delete process.env.TWILIO_AUTH_TOKEN;
    const noToken = await route.POST(new Request('http://internal.host/api/sms/inbound', { method: 'POST', headers: { ...headers, 'x-twilio-signature': sign(URL_SIGNED, params) }, body }));
    assert.equal(noToken.status, 403);
  } finally {
    for (const k of ['TWILIO_AUTH_TOKEN', 'TEXT_TO_BOOK_WEBHOOK_URL', 'TEXT_TO_BOOK_MODE']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
  assert.equal(fetchCalls.length, 0, 'the route made no network call in off mode');
});

// ── Modes ──

await t('the mode switch: only "dry_run" and "live" turn it on; unset or anything else is off', () => {
  assert.equal(textToBookMode(undefined), 'off');
  for (const v of ['', 'on', 'true', 'LIVE', 'Dry_Run', 'dry-run', 'off']) assert.equal(textToBookMode(v), 'off', v);
  assert.equal(textToBookMode('dry_run'), 'dry_run');
  assert.equal(textToBookMode('live'), 'live');
});

await t('off mode does nothing: no store call, empty <Response/>', async () => {
  for (const mode of [undefined, 'off', 'nonsense']) {
    const s = memoryStore();
    const res = await text('CLT from JW Friday 6am', deps({ mode: mode as string, store: s.store }));
    assert.equal(res.status, 200);
    assert.equal(res.body, EMPTY_TWIML);
    assert.equal(s.calls(), 0);
    const stop = await text('STOP', deps({ mode: mode as string, store: s.store }));
    assert.equal(stop.body, EMPTY_TWIML);
    assert.equal(s.calls(), 0, 'not even STOP is stored while off');
  }
});

await t('dry_run never sends: no <Message>, no fetch to api.twilio.com, the would-be reply is logged', async () => {
  fetchCalls.length = 0;
  const s = memoryStore();
  const logs: string[] = [];
  const d = deps({ mode: 'dry_run', store: s.store, log: (l) => logs.push(l) });
  for (const body of ['CLT from JW Marriott Uptown Friday 6am', 'HELP', 'hello', 'STOP']) {
    const res = await text(body, d, '+17045550999');
    assert.equal(res.body, EMPTY_TWIML, body);
    assert.ok(!res.body.includes('<Message>'), body);
    assert.equal(res.reply, null);
  }
  assert.equal(fetchCalls.filter((u) => u.includes('twilio')).length, 0);
  assert.equal(fetchCalls.length, 0);
  const out = s.rows.filter((r) => r.direction === 'out');
  assert.equal(out.length, 4);
  assert.ok(out.every((r) => r.mode === 'dry_run'));
  assert.ok(out[0]!.body!.includes('Fri Nov 13, 6:00 AM'));
  assert.ok(logs.some((l) => l.includes('dry_run') && l.includes('Fri Nov 13')));
  // The number is stored only as a hash plus the last 4 digits; never in a log line.
  assert.ok(s.rows.every((r) => r.phone_last4 === '0999' && /^[0-9a-f]{64}$/.test(r.phone_hash)));
  assert.ok(!JSON.stringify(s.rows).includes('7045550999'));
  assert.ok(!logs.join('\n').includes('7045550999'));
  // The source has no outbound Twilio call to make.
  for (const f of ['lib/text-to-book.ts', 'lib/text-to-book-db.server.ts', 'lib/twilio-signature.ts', 'app/api/sms/inbound/route.ts']) {
    const src = readFileSync(join(fileURLToPath(new URL('..', import.meta.url)), f), 'utf8');
    assert.ok(!/api\.twilio\.com|from ['"]twilio['"]|require\(['"]twilio['"]\)/.test(src), f);
  }
});

await t('live mode replies with TwiML <Message>, escaped', async () => {
  const res = await text('HELP', deps());
  assert.ok(res.body.startsWith('<?xml'));
  assert.ok(res.body.includes('<Response><Message>'));
  assert.ok(res.body.includes('Msg &amp; data'));
  assert.equal(res.reply, HELP_REPLY);
});

// ── Keywords ──

await t('STOP suppresses every later reply; START re-enables; STOP is confirmed only once', async () => {
  const s = memoryStore();
  const d = deps({ store: s.store });
  const before = await text('CLT from JW Friday 6am', d);
  assert.ok(messageOf(before.body));
  const stop = await text('stop', d);
  assert.equal(stop.reply, STOP_REPLY);
  for (const body of ['CLT from JW Friday 6am', 'STOP', 'Stop', 'hello']) {
    const res = await text(body, d);
    assert.equal(res.reply, null, body);
    assert.equal(res.body, EMPTY_TWIML, body);
  }
  // HELP is still answered after STOP (Phil, 2026-11-12), and says how to restart.
  for (const body of ['HELP', 'info']) {
    const res = await text(body, d);
    assert.equal(res.reply, HELP_REPLY, body);
    assert.ok(res.reply!.includes('START to restart'));
  }
  const start = await text('Start', d);
  assert.equal(start.reply, START_REPLY);
  // One confirmation only: a second START or a YES changes nothing and sends nothing.
  assert.equal((await text('START', d)).reply, null);
  assert.equal((await text('yes', d)).reply, null);
  const after = await text('CLT from JW Friday 6am', deps({ store: s.store }));
  assert.ok(messageOf(after.body)?.includes('Fri Nov 13'));
  // Every STOP word, any case, whole message only.
  for (const w of ['STOP', 'stopall', 'Unsubscribe', 'CANCEL', 'end', 'Quit']) assert.equal(keywordOf(w), 'stop', w);
  for (const w of ['start', 'UNSTOP', 'yes']) assert.equal(keywordOf(w), 'start', w);
  for (const w of ['help', 'INFO']) assert.equal(keywordOf(w), 'help', w);
  for (const w of ['please stop at the westin', 'cancel my ride friday', 'help me book']) assert.equal(keywordOf(w), null, w);
});

await t('fail closed: if the opt-out lookup fails (table missing), nothing is sent', async () => {
  const s = memoryStore({ failLookup: true });
  for (const body of ['CLT from JW Friday 6am', 'START', 'STOP']) {
    const res = await text(body, deps({ store: s.store }));
    assert.equal(res.reply, null, body);
    assert.equal(res.body, EMPTY_TWIML, body);
  }
  // HELP needs no opt-out lookup and is always answered.
  assert.equal((await text('HELP', deps({ store: s.store }))).reply, HELP_REPLY);
  // No pepper configured: also nothing sent.
  const noPepper = deps();
  noPepper.env.pepper = undefined;
  assert.equal((await text('HELP', noPepper)).reply, null);
});

await t('HELP reply: business name, (704) 941-8508, "Reply STOP to opt out, START to restart"', async () => {
  const res = await text('help', deps());
  assert.ok(res.reply!.includes('START to restart'));
  assert.ok(res.reply!.includes('Tassy Transportation'));
  assert.ok(res.reply!.includes('(704) 941-8508'));
  assert.ok(res.reply!.includes('Reply STOP to opt out'));
  assert.ok(res.reply!.length <= 320);
});

await t('rate limit: the 6th message in an hour gets no reply (lib/rate-limit.ts)', async () => {
  __resetRateLimits();
  const s = memoryStore();
  const logs: string[] = [];
  const d = deps({ store: s.store, rateLimit: (k) => rateLimit(k, INBOUND_PER_HOUR, HOUR_MS), log: (l) => logs.push(l) });
  for (let i = 1; i <= 5; i++) assert.ok((await text('CLT from JW Friday 6am', d, '+17045550555')).reply, `message ${i}`);
  const sixth = await text('CLT from JW Friday 6am', d, '+17045550555');
  assert.equal(sixth.reply, null);
  assert.equal(sixth.body, EMPTY_TWIML);
  assert.ok(logs.some((l) => l.includes('rate limited')));
  assert.equal(s.rows.at(-1)!.parse_result?.rateLimited, true, 'logged');
  assert.ok((await text('CLT from JW Friday 6am', d, '+17045550556')).reply, 'another number is not limited');
  __resetRateLimits();
});

await t('an answer to our question is read with the text that prompted it (within 15 minutes, same number)', async () => {
  const s = memoryStore();
  clock.now = NOW_MS();
  const d = deps({ store: s.store, now: () => new Date(clock.now) });
  assert.equal((await text('CLT from JW Marriott 6am', d)).reply, 'What day? e.g. today, tomorrow, Fri or 11/20.');
  clock.now += 60_000;
  const priced = await text('friday', d);
  assert.ok(priced.reply?.includes('Fri Nov 13, 6:00 AM') && priced.reply.includes('$'), priced.reply ?? '');

  assert.ok((await text('CLT from Marriott tomorrow 6am', d)).reply?.startsWith('Which one'));
  clock.now += 60_000;
  assert.ok((await text('JW', d)).reply?.includes('JW Marriott Charlotte to CLT airport, Wed Nov 11, 6:00 AM'));

  assert.equal((await text('westin to clt tmrw 6', d)).reply, 'Is that 6 AM or PM?');
  clock.now += 60_000;
  assert.ok((await text('pm', d)).reply?.includes('Wed Nov 11, 6:00 PM'));

  // A date in the answer replaces the one that had passed.
  assert.ok((await text('CLT from JW tuesday 6am', d)).reply?.includes('Did you mean'));
  clock.now += 60_000;
  assert.ok((await text('11/17', d)).reply?.includes('Tue Nov 17, 6:00 AM'));

  // Too late, or another number: read on its own.
  assert.ok((await text('CLT from JW Marriott 6am', d)).reply?.startsWith('What day'));
  clock.now += 16 * 60_000;
  assert.ok(!(await text('friday', d)).reply?.includes('$'));
  clock.now += 16 * 60_000;
  assert.ok((await text('CLT from JW Marriott 6am', d)).reply?.startsWith('What day'));
  assert.ok(!(await text('friday', d, '+17045550777')).reply?.includes('$'));
  clock.now = NOW_MS();
});

// ── Copy ──

await t('replies never contain insurance or licensing claims (or any banned / unbuilt claim)', async () => {
  const all = [...replies, STOP_REPLY, START_REPLY, HELP_REPLY];
  const unparsed = ['hello', 'CLT from the Ritz tomorrow 6am', 'CLT from Hilton tomorrow 6am', 'CLT from JW today 11am', 'JW CLT tomorrow 6am', 'JW to CLT wheelchair'];
  for (const body of unparsed) all.push((await tripReply(body, NOW, { hotelQuote: injectedHotelQuote }, SITE, 'FFFFFFFFFFFFFFFF')).text);
  assert.ok(all.length > 30);
  const CLAIMS = /insur|licen[cs]|bonded|certified|accredited|fmcsa|usdot|\bdot\b|background[\s-]check|ada[\s-]compliant/i;
  const root = fileURLToPath(new URL('..', import.meta.url));
  const banned = readdirSync(join(root, 'scripts/banned-claims')).map((f) => JSON.parse(readFileSync(join(root, 'scripts/banned-claims', f), 'utf8')) as { pattern: string; flags?: string });
  const unbuilt = (JSON.parse(readFileSync(join(root, 'scripts/unbuilt-claims.json'), 'utf8')) as { claims: { pattern: string }[] }).claims;
  for (const r of all) {
    assert.ok(!CLAIMS.test(r), r);
    for (const b of banned) assert.ok(!new RegExp(b.pattern, b.flags ?? '').test(r), r);
    for (const u of unbuilt) assert.ok(!new RegExp(u.pattern, 'i').test(r), r);
    assert.ok(r.length <= 320, `${r.length}: ${r}`);
  }
});


// ── Mode off is inert for visitors (Phil, 2026-11-13) ──

await t('mode off: a ?when= link does NOT pre-fill the pickup time; mode on does', async () => {
  const { prefillWhen } = await import('../lib/text-link-prefill');
  assert.equal(prefillWhen('2026-11-13T06:00', false), '', 'off: ignored');
  assert.equal(prefillWhen('2026-11-13T06:00', true), '2026-11-13T06:00', 'on: applied');
  assert.equal(prefillWhen('6am friday', true), '', 'on: only the exact shape');
  assert.equal(prefillWhen(null, true), '');
  const { textToBookActive } = await import('../lib/text-to-book');
  for (const v of [undefined, null, '', 'off', 'OFF', 'Live', 'dry-run', 'true']) assert.equal(textToBookActive(v as string | undefined), false, String(v));
  for (const v of ['dry_run', 'live']) assert.equal(textToBookActive(v), true, v);
  // The form only prefills through prefillWhen(…, textLinkPrefill), and the prop defaults to false.
  const form = readFileSync(join(fileURLToPath(new URL('..', import.meta.url)), 'components/request/RequestForm.tsx'), 'utf8');
  assert.ok(/textLinkPrefill = false,/.test(form), 'prop defaults to off');
  assert.ok(/useState\(\(\) => prefillWhen\(searchParams\.get\('when'\), textLinkPrefill\)\)/.test(form));
  assert.ok(!/searchParams\.get\('when'\)(?![^\n]*prefillWhen)/.test(form.replace(/useState\(\(\) => prefillWhen\(searchParams\.get\('when'\), textLinkPrefill\)\)/, '')), 'no other ?when= read');
});

await t('mode off: a ?ttb= link makes NO database call; mode on records link_opened_at', async () => {
  const { markTextLinkOpened } = await import('../lib/text-to-book-db.server');
  const calls: string[] = [];
  const fakeDb = () => {
    calls.push('db');
    const chain: Record<string, unknown> = {};
    chain.from = (table: string) => { calls.push(`from:${table}`); return chain; };
    chain.update = (row: Record<string, unknown>) => { calls.push(`update:${Object.keys(row).join(',')}`); return chain; };
    chain.eq = () => chain;
    chain.is = () => Promise.resolve({ error: null });
    return chain as unknown as ReturnType<typeof import('../lib/supabase-admin').supabaseAdmin>;
  };
  const token = 'a'.repeat(16); // a valid link token (16 url-safe characters)
  for (const mode of [undefined, null, '', 'off', 'LIVE']) {
    await markTextLinkOpened(token, new Date(), { mode: mode as string | null, db: fakeDb });
  }
  assert.equal(calls.length, 0, 'off: the database is never touched');
  await markTextLinkOpened(token, new Date(), { mode: 'dry_run', db: fakeDb });
  assert.ok(calls.includes('from:text_to_book_messages') && calls.includes('update:link_opened_at'), `on: ${calls.join(' ')}`);
  // Both landing pages gate the call AND the prefill on the same switch.
  for (const page of ['app/airport/page.tsx', 'app/request/page.tsx']) {
    const src = readFileSync(join(fileURLToPath(new URL('..', import.meta.url)), page), 'utf8');
    assert.ok(/const textLinks = textToBookActive\(\);\n\s*if \(textLinks\) await markTextLinkOpened\(searchParams\.ttb\);/.test(src), page);
    assert.ok(/textLinkPrefill=\{textLinks\}/.test(src), `${page} passes the switch to the form`);
  }
});

globalThis.fetch = realFetch;
assert.equal(fetchCalls.length, 0, 'no network call was attempted');
console.log(`\n${n} text-to-book tests passed`);
