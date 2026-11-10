import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AFTER_TRIP_MS,
  bearerMatches,
  buildFamilyPhones,
  buildRideView,
  canShowMap,
  firstNameOnly,
  generateRideToken,
  hardCapExpiry,
  hashRideToken,
  isValidRideToken,
  loadRidePage,
  mintRideLink,
  normalizeUsPhone,
  pickupStreetOnly,
  rideRecipients,
  rideStatusFrom,
  rideTrackingEnabled,
  rideUrlFor,
  tokenIsLive,
  vehicleLabel,
  type DriverLocation,
  type RideEvent,
  type RideLinkStore,
  type RidePageResult,
  type RideTripRecord,
} from '../lib/ride-link';
import RideStatusView, { NeutralRidePage } from '../components/ride/RideStatusView';

// No database, no network, no texts: every test runs against the in-memory store below.

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const TRIP_ID = '62ff9131-fb62-415c-821d-a68e6521294d';
const DRIVER_ID = '0b7c8a52-6a39-4a8e-9a43-0d6d1b2b6f11';
const VEHICLE_ID = '5e2d1c7b-1f0e-4a77-8d6f-2a9a5b3c4d22';
const NOW = new Date('2026-11-10T18:00:00Z');
const RIDER_PHONE = '(704) 555-0142';
const DRIVER_PHONE = '980-555-0199';
const FAMILY_1 = '704-555-0177';
const FAMILY_2 = '+1 (828) 555-0123';

function trip(over: Partial<RideTripRecord> = {}): RideTripRecord {
  return {
    id: TRIP_ID,
    status: 'assigned',
    driverId: DRIVER_ID,
    vehicleId: VEHICLE_ID,
    pickupAddress: '1220 Tourmaline Rd, Apt 1910, Charlotte, NC 28202',
    requestedAt: '2026-11-10T20:00:00Z',
    scheduledFor: '2026-11-10T20:00:00Z',
    completedAt: null,
    contactPhone: RIDER_PHONE,
    contactSmsConsent: true,
    tripDetails: {
      sms_consent: true,
      sms_consent_at: '2026-11-09T12:00:00Z',
      sms_consent_v: 'v1',
      sms_consent_phone: RIDER_PHONE,
      family_phone_1: '+17045550177',
      family_phone_2: '+18285550123',
    },
    ...over,
  };
}

type TokenRow = { id: string; tripId: string; tokenHash: string; expiresAt: string; revokedAt: string | null };

/** In-memory RideLinkStore. Records every write, so "nothing was minted" is checkable. */
function memoryStore(opts: {
  trip?: RideTripRecord | null;
  events?: RideEvent[];
  location?: DriverLocation | null;
  failOn?: keyof RideLinkStore;
} = {}) {
  const tokens: TokenRow[] = [];
  let seq = 0;
  const tripRow = opts.trip === undefined ? trip() : opts.trip;
  const fail = (name: keyof RideLinkStore) => {
    if (opts.failOn === name) throw new Error('db down');
  };
  const store: RideLinkStore = {
    async getTrip(id) {
      fail('getTrip');
      return tripRow && tripRow.id === id ? tripRow : null;
    },
    async getDriverFirstName(id) {
      fail('getDriverFirstName');
      // The real store reads first_name only; this fake hands over a messy value to prove the view cleans it.
      return id === DRIVER_ID ? 'Darnell Washington' : null;
    },
    async getVehicle(id) {
      fail('getVehicle');
      return id === VEHICLE_ID ? { color: 'Silver', make: 'Toyota', model: 'Sienna' } : null;
    },
    async getEvents() {
      fail('getEvents');
      return opts.events ?? [];
    },
    async getDriverLocation() {
      fail('getDriverLocation');
      return opts.location ?? null;
    },
    async insertToken(row) {
      fail('insertToken');
      const id = `tok-${++seq}`;
      tokens.push({ id, ...row, revokedAt: null });
      return { id };
    },
    async revokeOtherTokens(tripId, keepId, at) {
      fail('revokeOtherTokens');
      for (const r of tokens) if (r.tripId === tripId && r.id !== keepId && !r.revokedAt) r.revokedAt = at;
    },
    async findTokenByHash(hash) {
      fail('findTokenByHash');
      const r = tokens.find((x) => x.tokenHash === hash);
      return r ? { id: r.id, tripId: r.tripId, expiresAt: r.expiresAt, revokedAt: r.revokedAt } : null;
    },
  };
  return { store, tokens };
}

function tokenOf(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1);
}

function render(result: RidePageResult): string {
  return renderToStaticMarkup(result.kind === 'ride' ? RideStatusView({ view: result.view }) : NeutralRidePage());
}

async function mintFor(store: RideLinkStore, now = NOW) {
  const r = await mintRideLink({ store, tripId: TRIP_ID, enabled: true, now });
  assert.equal(r.kind, 'minted');
  return r as Extract<typeof r, { kind: 'minted' }>;
}

const PHONE_LIKE = /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/;
const MONEY = /\$\s?\d|\d+\s?(usd|dollars)|cents|price|fare|pay\b|paid|tip/i;

/* ───────────────────────────────────────────────────────────── flag */

await t('the flag is OFF unless RIDE_TRACKING_LINK_ENABLED is exactly "true"', () => {
  const before = process.env.RIDE_TRACKING_LINK_ENABLED;
  for (const v of [undefined, '', '1', 'TRUE', 'yes', 'true ']) {
    if (v === undefined) delete process.env.RIDE_TRACKING_LINK_ENABLED; else process.env.RIDE_TRACKING_LINK_ENABLED = v;
    assert.equal(rideTrackingEnabled(), false, `"${v}" is off`);
  }
  process.env.RIDE_TRACKING_LINK_ENABLED = 'true';
  assert.equal(rideTrackingEnabled(), true);
  if (before === undefined) delete process.env.RIDE_TRACKING_LINK_ENABLED; else process.env.RIDE_TRACKING_LINK_ENABLED = before;
});

await t('with the flag off nothing is minted and the page is the neutral page', async () => {
  const { store, tokens } = memoryStore();
  assert.deepEqual(await mintRideLink({ store, tripId: TRIP_ID, enabled: false, now: NOW }), { kind: 'disabled' });
  assert.equal(tokens.length, 0);
  // A real, live token still shows nothing while the flag is off.
  const minted = await mintFor(store);
  assert.deepEqual(await loadRidePage({ store, token: tokenOf(minted.url), enabled: false, now: NOW }), { kind: 'neutral' });
});

/* ─────────────────────────────────────────────────────────── token */

await t('the token is 32 random bytes in base64url, and only its sha256 is stored', async () => {
  const a = generateRideToken();
  assert.equal(Buffer.from(a, 'base64url').length, 32);
  assert.ok(isValidRideToken(a));
  assert.notEqual(a, generateRideToken());
  assert.match(hashRideToken(a), /^[0-9a-f]{64}$/);
  const { store, tokens } = memoryStore();
  const minted = await mintFor(store);
  const raw = tokenOf(minted.url);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].tokenHash, hashRideToken(raw));
  assert.ok(!JSON.stringify(tokens).includes(raw), 'the raw token is never written');
});

await t('the URL carries no name, phone or trip number: just /ride/<token>', async () => {
  const { store } = memoryStore();
  const { url } = await mintFor(store);
  assert.match(url, /^https:\/\/[^/]+\/ride\/[A-Za-z0-9_-]{43}$/);
  assert.ok(!url.includes(TRIP_ID) && !/T-\d{8}/.test(url) && !/darnell|washington/i.test(url));
  assert.equal(rideUrlFor('x'.repeat(43)).endsWith('/ride/' + 'x'.repeat(43)), true);
});

await t('the internal endpoint secret is compared in constant time, and anything else is refused', () => {
  assert.equal(bearerMatches('Bearer s3cret', 's3cret'), true);
  for (const h of ['Bearer s3cre', 'Bearer s3cret ', 'bearer s3cret', 's3cret', '', null, undefined]) {
    assert.equal(bearerMatches(h as string | null, 's3cret'), false, String(h));
  }
  assert.equal(bearerMatches('Bearer ', ''), false, 'an unset secret never matches');
  const src = readFileSync('lib/ride-link.ts', 'utf8');
  assert.ok(/timingSafeEqual\(given, expected\)/.test(src));
});

/* ──────────────────────────────────── neutral page: expired = wrong */

await t('expired and wrong tokens show the same neutral page, with nothing that tells them apart', async () => {
  const { store } = memoryStore({ trip: trip({ status: 'completed', completedAt: '2026-11-10T21:00:00Z' }) });
  // Mint while the trip was still live, by pointing the store at an assigned trip first.
  const live = memoryStore();
  const minted = await mintFor(live.store);
  const realToken = tokenOf(minted.url);
  // Now the trip is completed and it is 2h01m later: expired.
  const completedStore: RideLinkStore = { ...live.store, getTrip: store.getTrip };
  const later = new Date(Date.parse('2026-11-10T21:00:00Z') + AFTER_TRIP_MS + 60_000);

  const expired = await loadRidePage({ store: completedStore, token: realToken, enabled: true, now: later });
  const wrong = await loadRidePage({ store: completedStore, token: generateRideToken(), enabled: true, now: later });
  const malformed = await loadRidePage({ store: completedStore, token: 'not-a-token', enabled: true, now: later });
  const pastCap = await loadRidePage({ store: live.store, token: realToken, enabled: true, now: new Date(Date.parse(minted.expiresAt) + 1) });

  for (const r of [expired, wrong, malformed, pastCap]) assert.deepEqual(r, { kind: 'neutral' });
  const html = new Set([expired, wrong, malformed, pastCap].map(render));
  assert.equal(html.size, 1, 'one identical page for every failure');
  const page = [...html][0];
  assert.ok(!/expired|invalid|wrong|not found|unknown/i.test(page), 'the page does not say WHY');

  // And the same token, still inside its window, does show the ride.
  const stillLive = await loadRidePage({ store: completedStore, token: realToken, enabled: true, now: new Date('2026-11-10T22:30:00Z') });
  assert.equal(stillLive.kind, 'ride');
});

await t('a revoked token, a cancelled or no-show trip and a database failure are the neutral page too', async () => {
  const { store } = memoryStore();
  const first = await mintFor(store);
  const second = await mintFor(store);
  assert.deepEqual(await loadRidePage({ store, token: tokenOf(first.url), enabled: true, now: NOW }), { kind: 'neutral' }, 're-minting revokes the old link');
  assert.equal((await loadRidePage({ store, token: tokenOf(second.url), enabled: true, now: NOW })).kind, 'ride');

  const cancelled: RideLinkStore = { ...store, getTrip: async () => trip({ status: 'cancelled' }) };
  assert.deepEqual(await loadRidePage({ store: cancelled, token: tokenOf(second.url), enabled: true, now: NOW }), { kind: 'neutral' });
  const noShow: RideLinkStore = { ...store, getEvents: async () => [{ event: 'no_show', at: '2026-11-10T20:10:00Z' }] };
  assert.deepEqual(await loadRidePage({ store: noShow, token: tokenOf(second.url), enabled: true, now: NOW }), { kind: 'neutral' });

  for (const failOn of ['findTokenByHash', 'getTrip', 'getEvents', 'getDriverFirstName', 'getVehicle'] as const) {
    const broken: RideLinkStore = { ...store, [failOn]: async () => { throw new Error('db down'); } };
    const origError = console.error;
    console.error = () => {};
    try {
      assert.deepEqual(await loadRidePage({ store: broken, token: tokenOf(second.url), enabled: true, now: NOW }), { kind: 'neutral' }, failOn);
    } finally {
      console.error = origError;
    }
  }
});

/* ─────────────────────────────────────────────── no pay, no phone */

await t('the page leaks no pay or phone data, no full name, no plate and no house number', async () => {
  // A trip row stuffed with everything the page must never show. The store maps only safe fields,
  // but this proves the view drops them even if they arrived.
  const loud = trip({
    tripDetails: { ...trip().tripDetails, quoted_cents: 8900, driver_pay_cents: 4200, agreed_cents: 8900 },
  });
  const { store } = memoryStore({ trip: loud, events: [{ event: 'en_route', at: '2026-11-10T19:30:00Z' }] });
  const minted = await mintFor(store);
  const result = await loadRidePage({ store, token: tokenOf(minted.url), enabled: true, now: NOW });
  assert.equal(result.kind, 'ride');
  const html = render(result);

  assert.ok(html.includes('Darnell'), 'first name is shown');
  assert.ok(html.includes('Silver Toyota Sienna'), 'vehicle color and type are shown');
  assert.ok(html.includes('Tourmaline Rd'), 'the pickup street is shown');
  assert.ok(html.includes('On the way'));

  assert.ok(!/Washington/.test(html), 'no last name');
  assert.ok(!PHONE_LIKE.test(html), 'no phone number of any shape');
  for (const p of [RIDER_PHONE, DRIVER_PHONE, FAMILY_1, FAMILY_2, '7045550142', '9805550199', '7045550177']) {
    assert.ok(!html.includes(p), p);
  }
  assert.ok(!MONEY.test(html), 'no price or pay wording');
  assert.ok(!/8900|4200|89\.00|42\.00/.test(html), 'no pay figures');
  assert.ok(!/1220|1910|Charlotte, NC|28202|\bNC\b|Apt/.test(html), 'no house number, unit, city, state or ZIP');
  assert.ok(!html.includes(TRIP_ID), 'no trip id');

  // The view object itself carries only the allowed keys.
  assert.deepEqual(Object.keys(result.view).sort(), ['driverFirstName', 'location', 'pickupStreet', 'scheduledLabel', 'showMap', 'status', 'statusLabel', 'vehicle']);

  // The real store never even reads the forbidden columns.
  const server = readFileSync('lib/ride-link.server.ts', 'utf8');
  assert.ok(/from\('drivers'\)\.select\('first_name'\)/.test(server), 'drivers: first_name only');
  assert.ok(/from\('vehicles'\)\.select\('color, make, model'\)/.test(server), 'vehicles: no plate');
  assert.ok(!/last_name'|'phone'|plate'/.test(server.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
});

await t('first name, vehicle and street are cleaned of anything that is not those things', () => {
  assert.equal(firstNameOnly('  Darnell  Washington '), 'Darnell');
  assert.equal(firstNameOnly('704-555-0142'), null, 'a phone typed into the name field is dropped');
  assert.equal(firstNameOnly("D'Andre"), "D'Andre");
  assert.equal(vehicleLabel({ color: 'Black', make: 'Ford', model: 'F-150' }), 'Black Ford F-150');
  assert.equal(vehicleLabel({ color: '7045550142', make: 'Honda', model: 'Odyssey' }), 'Honda Odyssey');
  assert.equal(vehicleLabel(null), null);

  assert.equal(pickupStreetOnly('1220 Tourmaline Rd, Apt 1910, Charlotte, NC 28202'), 'Tourmaline Rd');
  assert.equal(pickupStreetOnly('5501 Josh Birmingham Pkwy, Charlotte, NC 28208, USA'), 'Josh Birmingham Pkwy');
  assert.equal(pickupStreetOnly('12B Elm St #4'), 'Elm St');
  assert.equal(pickupStreetOnly('100-2 Main Street NC 28202'), 'Main Street');
  assert.equal(pickupStreetOnly('JW Marriott Charlotte, 600 S College St, Charlotte, NC'), 'JW Marriott Charlotte');
  assert.equal(pickupStreetOnly('123, Main St, Charlotte'), 'Main St');
  assert.equal(pickupStreetOnly(''), null);
  assert.equal(pickupStreetOnly(null), null);
});

/* ─────────────────────────────────────────────────── consent */

await t('no consent means nothing is sent and no recipient is returned', async () => {
  const cases: Array<[string, Partial<RideTripRecord>]> = [
    ['never opted in', { tripDetails: { family_phone_1: '+17045550177' } }],
    ['opted in = false', { tripDetails: { sms_consent: false, sms_consent_phone: RIDER_PHONE, family_phone_1: '+17045550177' } }],
    ['the contact phone changed since consent', { contactPhone: '704-555-0100' }],
    ['the consent column was turned off', { contactSmsConsent: false }],
    ['no trip details at all', { tripDetails: null }],
    ['consent recorded with no phone', { tripDetails: { sms_consent: true, family_phone_1: '+17045550177' } }],
  ];
  for (const [label, over] of cases) {
    const row = trip(over);
    assert.deepEqual(rideRecipients(row), [], label);
    const { store, tokens } = memoryStore({ trip: row });
    const r = await mintRideLink({ store, tripId: TRIP_ID, enabled: true, now: NOW });
    assert.deepEqual(r, { kind: 'no_recipients' }, label);
    assert.equal(tokens.length, 0, `${label}: no token minted`);
  }
  // The route turns no_recipients into exactly this, and sends nothing itself.
  const route = readFileSync('app/api/internal/ride-link/route.ts', 'utf8');
  assert.ok(/case 'no_recipients':\s*return NextResponse\.json\(\{ ok: true, url: null, recipients: \[\] \}/.test(route));
  assert.ok(!/twilio|fetch\(/i.test(route), 'the endpoint never sends a text itself');
});

await t('with consent: the rider, then up to two family numbers, de-duplicated, as +1 numbers', async () => {
  assert.deepEqual(rideRecipients(trip()), [
    { phone: '+17045550142', role: 'rider' },
    { phone: '+17045550177', role: 'family' },
    { phone: '+18285550123', role: 'family' },
  ]);
  const dup = trip({ tripDetails: { ...trip().tripDetails, family_phone_1: '+17045550142', family_phone_2: 'junk' } });
  assert.deepEqual(rideRecipients(dup), [{ phone: '+17045550142', role: 'rider' }]);
  const { store } = memoryStore();
  const minted = await mintFor(store);
  assert.equal(minted.recipients.length, 3);
});

await t('family numbers: validated, normalised, blanks and repeats dropped', () => {
  assert.deepEqual(buildFamilyPhones(FAMILY_1, FAMILY_2, RIDER_PHONE), {
    ok: true,
    values: { family_phone_1: '+17045550177', family_phone_2: '+18285550123' },
  });
  assert.deepEqual(buildFamilyPhones('', '  ', RIDER_PHONE), { ok: true, values: {} });
  assert.deepEqual(buildFamilyPhones(RIDER_PHONE, FAMILY_1, RIDER_PHONE), { ok: true, values: { family_phone_1: '+17045550177' } });
  assert.deepEqual(buildFamilyPhones(FAMILY_1, FAMILY_1, RIDER_PHONE), { ok: true, values: { family_phone_1: '+17045550177' } });
  const bad = buildFamilyPhones('12345', '011 44 20 7946 0958', RIDER_PHONE);
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys((bad as { errors: Record<string, string> }).errors).sort(), ['familyPhone1', 'familyPhone2']);
  assert.equal(normalizeUsPhone('1 (704) 555-0142'), '+17045550142');
  assert.equal(normalizeUsPhone('555-0142'), null);
  assert.equal(normalizeUsPhone(42 as unknown as string), null);
});

await t('the booking route stores family numbers only with the flag on and the text opt-in', () => {
  const route = readFileSync('app/api/trip-request/route.ts', 'utf8');
  assert.ok(/if \(rideTrackingEnabled\(\) && smsConsent\) \{/.test(route));
  assert.ok(/smsConsent \? \{ \.\.\.\(validatedDetails \?\? \{\}\), \.\.\.smsConsent, \.\.\.familyPhones \}/.test(route));
  const form = readFileSync('components/request/RequestForm.tsx', 'utf8');
  assert.ok(/const familyFieldsShown = rideTrackingEnabled && !facility && smsChecked;/.test(form));
  assert.ok(!/from '@\/lib\/ride-link'/.test(form), 'the client form does not import the server token module');
  for (const page of ['app/request/page.tsx', 'app/airport/page.tsx']) {
    assert.ok(/rideTrackingEnabled=\{rideTrackingEnabled\(\)\}/.test(readFileSync(page, 'utf8')), page);
  }
});

/* ─────────────────────────────────────────────────────── map */

await t('a completed trip hides the map, even with a driver location', async () => {
  const loc: DriverLocation = { lat: 35.2271, lng: -80.8431, at: '2026-11-10T19:55:00Z' };
  assert.equal(canShowMap('completed', loc), false);
  assert.equal(canShowMap('in_progress', loc), false);
  assert.equal(canShowMap('assigned', loc), false);
  assert.equal(canShowMap('on_the_way', loc), true);
  assert.equal(canShowMap('arrived', loc), true);
  assert.equal(canShowMap('on_the_way', null), false, 'no location, no map (which is every trip today)');

  const completedEvents: RideEvent[] = [
    { event: 'en_route', at: '2026-11-10T19:30:00Z' },
    { event: 'dropped_off', at: '2026-11-10T20:40:00Z' },
  ];
  const live = memoryStore({ location: loc });
  const minted = await mintFor(live.store);
  const store: RideLinkStore = { ...live.store, getEvents: async () => completedEvents };
  const result = await loadRidePage({ store, token: tokenOf(minted.url), enabled: true, now: new Date('2026-11-10T21:00:00Z') });
  assert.equal(result.kind, 'ride');
  if (result.kind !== 'ride') return;
  assert.equal(result.view.status, 'completed');
  assert.equal(result.view.showMap, false);
  assert.equal(result.view.location, null);
  const html = render(result);
  assert.ok(!html.includes('ride-map') && !/maps/i.test(html), 'no map markup');
  assert.ok(!html.includes('Tourmaline'), 'no pickup street after completion');

  // The same trip while on the way, with a location, does draw it.
  const onWay: RideLinkStore = { ...live.store, getEvents: async () => [completedEvents[0]] };
  const shown = await loadRidePage({ store: onWay, token: tokenOf(minted.url), enabled: true, now: NOW });
  assert.ok(shown.kind === 'ride' && shown.view.showMap && render(shown).includes('data-testid="ride-map"'));
});

/* ─────────────────────────────────────────────────── status, expiry */

await t('status comes from the latest event, falling back to trip_requests.status', () => {
  const at = (event: string, iso: string) => ({ event, at: iso });
  const base = { status: 'assigned', completedAt: null };
  assert.equal(rideStatusFrom(base, []), 'assigned');
  assert.equal(rideStatusFrom({ status: 'confirmed', completedAt: null }, []), 'none');
  assert.equal(rideStatusFrom(base, [at('assigned', '2026-11-10T18:00:00Z'), at('en_route', '2026-11-10T19:00:00Z')]), 'on_the_way');
  assert.equal(rideStatusFrom(base, [at('arrived', '2026-11-10T19:50:00Z'), at('note', '2026-11-10T19:55:00Z')]), 'arrived', 'a note does not move the ride');
  assert.equal(rideStatusFrom(base, [at('picked_up', '2026-11-10T20:00:00Z')]), 'in_progress');
  assert.equal(rideStatusFrom(base, [at('dropped_off', '2026-11-10T20:40:00Z')]), 'completed');
  assert.equal(rideStatusFrom(base, [at('completed', '2026-11-10T20:41:00Z')]), 'completed');
  assert.equal(rideStatusFrom(base, [at('cancelled', '2026-11-10T19:00:00Z')]), 'inactive');
  assert.equal(rideStatusFrom(base, [at('no_show', '2026-11-10T20:15:00Z')]), 'inactive');
  assert.equal(rideStatusFrom(base, [at('assigned', '2026-11-10T18:00:00Z'), at('unassigned', '2026-11-10T18:30:00Z')]), 'none');
  assert.equal(rideStatusFrom({ status: 'cancelled', completedAt: null }, [at('en_route', '2026-11-10T19:00:00Z')]), 'inactive');
  assert.equal(rideStatusFrom({ status: 'assigned', completedAt: '2026-11-10T20:40:00Z' }, [at('en_route', '2026-11-10T19:00:00Z')]), 'completed');
});

await t('expiry: 2h after the trip ends; until then valid, but never past pickup + 24h', () => {
  const cap = hardCapExpiry({ scheduledFor: '2026-11-10T20:00:00Z', requestedAt: null }, NOW);
  assert.equal(cap.toISOString(), '2026-11-11T20:00:00.000Z');
  // Minted long after the pickup: still at least 2h of life.
  const late = hardCapExpiry({ scheduledFor: '2026-11-01T20:00:00Z', requestedAt: null }, NOW);
  assert.equal(late.toISOString(), '2026-11-10T20:00:00.000Z');
  // Falls back to requested_at.
  assert.equal(hardCapExpiry({ scheduledFor: null, requestedAt: '2026-11-10T20:00:00Z' }, NOW).toISOString(), cap.toISOString());

  const tok = { expiresAt: cap.toISOString(), revokedAt: null };
  const end = Date.parse('2026-11-10T20:40:00Z');
  assert.equal(tokenIsLive(tok, null, new Date('2026-11-11T19:59:00Z')), true, 'not ended: valid up to the cap');
  assert.equal(tokenIsLive(tok, null, new Date('2026-11-11T20:00:00Z')), false, 'the cap is hard');
  assert.equal(tokenIsLive(tok, end, new Date(end + AFTER_TRIP_MS - 1)), true);
  assert.equal(tokenIsLive(tok, end, new Date(end + AFTER_TRIP_MS)), false);
  assert.equal(tokenIsLive({ ...tok, revokedAt: NOW.toISOString() }, null, NOW), false);
});

await t('a cancelled, completed or unknown trip gets no link', async () => {
  for (const row of [trip({ status: 'cancelled' }), trip({ status: 'completed' }), trip({ completedAt: '2026-11-10T17:00:00Z' })]) {
    const { store, tokens } = memoryStore({ trip: row });
    assert.deepEqual(await mintRideLink({ store, tripId: TRIP_ID, enabled: true, now: NOW }), { kind: 'not_active' });
    assert.equal(tokens.length, 0);
  }
  const { store } = memoryStore({ trip: null });
  assert.deepEqual(await mintRideLink({ store, tripId: TRIP_ID, enabled: true, now: NOW }), { kind: 'not_found' });
});

await t('the arrival estimate is the scheduled pickup in Charlotte time, labelled as scheduled', () => {
  const view = buildRideView({
    status: 'assigned',
    driverFirstName: 'Darnell',
    vehicle: null,
    pickupAddress: null,
    scheduledFor: '2026-11-10T20:00:00Z',
    requestedAt: '2026-11-10T19:00:00Z',
  });
  assert.equal(view.scheduledLabel, 'Tue, Nov 10, 3:00 PM');
  const html = renderToStaticMarkup(RideStatusView({ view }));
  assert.ok(html.includes('Scheduled pickup time') && html.includes('not a live estimate'));
  assert.equal(buildRideView({ ...view, status: 'in_progress', vehicle: null, pickupAddress: null, scheduledFor: null, requestedAt: '2026-11-10T20:00:00Z', driverFirstName: null }).scheduledLabel, null);
});

/* ─────────────────────────────────────────────── the endpoint door */

await t('POST /api/internal/ride-link: empty 404 with the flag off, 401 on a bad secret, 400 on a bad body', async () => {
  // Every case below returns before the database is touched.
  const saved = { flag: process.env.RIDE_TRACKING_LINK_ENABLED, secret: process.env.INTERNAL_NOTIFY_SECRET };
  process.env.INTERNAL_NOTIFY_SECRET = 'test-secret-do-not-use';
  const { POST } = await import('../app/api/internal/ride-link/route');
  const call = (auth: string | null, body: string) =>
    POST(new Request('http://localhost/api/internal/ride-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
      body,
    }));
  try {
    delete process.env.RIDE_TRACKING_LINK_ENABLED;
    const off = await call('Bearer test-secret-do-not-use', JSON.stringify({ tripId: TRIP_ID }));
    assert.equal(off.status, 404);
    assert.equal(await off.text(), '', 'nothing at all while the flag is off');

    process.env.RIDE_TRACKING_LINK_ENABLED = 'true';
    assert.equal((await call(null, JSON.stringify({ tripId: TRIP_ID }))).status, 401);
    assert.equal((await call('Bearer wrong', JSON.stringify({ tripId: TRIP_ID }))).status, 401);
    assert.equal((await call('Bearer test-secret-do-not-use', JSON.stringify({ tripId: 'T-20261110-0001' }))).status, 400);
    assert.equal((await call('Bearer test-secret-do-not-use', 'not json')).status, 400);
  } finally {
    if (saved.flag === undefined) delete process.env.RIDE_TRACKING_LINK_ENABLED; else process.env.RIDE_TRACKING_LINK_ENABLED = saved.flag;
    if (saved.secret === undefined) delete process.env.INTERNAL_NOTIFY_SECRET; else process.env.INTERNAL_NOTIFY_SECRET = saved.secret;
  }
});

await t('the migration is additive, server-only and stores a hash', () => {
  const sql = readFileSync('supabase/migrations/20261110T0200_ride_tracking_tokens.sql', 'utf8');
  assert.ok(/create table if not exists public\.ride_tracking_tokens/.test(sql));
  assert.ok(/references public\.trip_requests \(id\) on delete cascade/.test(sql));
  assert.ok(/create unique index if not exists ride_tracking_tokens_token_hash_key/.test(sql));
  assert.ok(/enable row level security/.test(sql));
  assert.ok(!/create policy/i.test(sql), 'no policies: service role only');
  assert.ok(!/\btoken\s+text\b/.test(sql), 'no raw token column');
});

console.log(`\n${n} ride-link tests passed`);
