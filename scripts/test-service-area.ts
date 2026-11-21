import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  OUT_OF_AREA_MARKER,
  OUT_OF_AREA_MESSAGE,
  SERVICE_AREA_CENTER,
  SERVICE_AREA_RADIUS_MILES,
  isOutOfAreaNote,
  isOutOfAreaPickup,
  outOfAreaNote,
  serviceAreaMiles,
} from '../lib/service-area';
import { NEEDS_PRICE_MARKER, needsPriceNote } from '../lib/price-fallback';
import { buildRequesterText } from '../lib/notifications';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

// Points, straight-line from Uptown (35.2271, -80.8431).
const UPTOWN = { lat: 35.2271, lng: -80.8431 };
const PRUITT = { lat: 35.2263648, lng: -80.89841 }; // the campaign's Charlotte pickup, ~3 mi
const CONCORD = { lat: 35.4195, lng: -80.5795 }; // ~19 mi — in area, and priceable on the card
const RALEIGH = { lat: 35.7796, lng: -78.6382 }; // 100 Fayetteville St — the breaker's pickup, ~140 mi
const NORTH_39 = { lat: 35.2271 + 39 / 69, lng: -80.8431 }; // ~39 mi due north — just inside
const NORTH_41 = { lat: 35.2271 + 41 / 69, lng: -80.8431 }; // ~41 mi due north — just outside

t('the anchor, the ring and the customer sentence are exactly what was agreed', () => {
  assert.deepEqual(SERVICE_AREA_CENTER, { lat: 35.2271, lng: -80.8431 });
  assert.equal(SERVICE_AREA_RADIUS_MILES, 40);
  assert.equal(
    OUT_OF_AREA_MESSAGE,
    'This pickup is outside our Charlotte service area, so this is not a confirmed booking. We will call you with a quote.',
  );
  assert.equal(OUT_OF_AREA_MARKER, '[OUT OF AREA]');
});

t('inside the ring: Charlotte pickups are not flagged', () => {
  assert.equal(isOutOfAreaPickup(UPTOWN), false);
  assert.equal(isOutOfAreaPickup(PRUITT), false);
  assert.equal(isOutOfAreaPickup(CONCORD), false);
  assert.equal(isOutOfAreaPickup(NORTH_39), false);
});

t('outside the ring: a far pickup is flagged', () => {
  assert.equal(isOutOfAreaPickup(RALEIGH), true);
  assert.equal(isOutOfAreaPickup(NORTH_41), true);
  const miles = serviceAreaMiles(RALEIGH);
  assert.ok(miles !== null && miles > 120 && miles < 140, `Raleigh measured ${miles}`);
});

t('no coordinates at all: not flagged, no distance — today\u2019s behaviour exactly', () => {
  assert.equal(isOutOfAreaPickup(null), false);
  assert.equal(isOutOfAreaPickup(undefined), false);
  assert.equal(serviceAreaMiles(null), null);
  assert.equal(serviceAreaMiles(undefined), null);
});

t('the stored note carries the marker, the distance and the instruction', () => {
  const note = outOfAreaNote(serviceAreaMiles(RALEIGH));
  assert.ok(note.startsWith(OUT_OF_AREA_MARKER));
  assert.ok(note.includes('miles from Uptown Charlotte'));
  assert.ok(note.includes('Call the customer with a quote'));
  assert.ok(note.includes('not confirmed'));
  assert.ok(isOutOfAreaNote(note));
  // The needs-price note is a different flag and must not read as this one.
  assert.equal(isOutOfAreaNote(needsPriceNote({ pickup: true, dropoff: false })), false);
  assert.equal(isOutOfAreaNote(null), false);
  assert.equal(isOutOfAreaNote(undefined), false);
  // And this marker must not break the needs-price prefix check when both apply:
  // the route stores the unpriced note first (pinned in the wiring test below).
  assert.ok(needsPriceNote({ pickup: true, dropoff: true }).startsWith(NEEDS_PRICE_MARKER));
});

const AT = new Date('2026-11-21T15:00:00Z');
const baseArgs = {
  firstName: 'Sam',
  serviceLine: 'care',
  requestedAt: '2026-11-22T10:00:00.000Z',
  reference: 'T-20261120-0012',
  at: AT,
};
const firmPrice = { text: '$59', exact: true };

t('the booking-received email: in-area wording is byte-identical with and without the flag present-but-false', () => {
  const plain = buildRequesterText({ ...baseArgs, price: firmPrice });
  const flaggedFalse = buildRequesterText({ ...baseArgs, price: firmPrice, outOfArea: false });
  assert.equal(flaggedFalse, plain);
  assert.ok(plain.includes('Your price: $59'));
  assert.ok(!plain.includes(OUT_OF_AREA_MESSAGE));
});

t('the booking-received email: out of area replaces the price wording with the quote promise', () => {
  const text = buildRequesterText({ ...baseArgs, price: firmPrice, outOfArea: true });
  assert.ok(text.includes(OUT_OF_AREA_MESSAGE));
  assert.ok(!text.includes('Your price'));
  assert.ok(!text.includes('$59'));
  // The closing promise still holds: nothing booked or charged before agreement.
  assert.ok(text.includes('Nothing is booked and nothing is charged until you agree to the price.'));
});

t('the booking-received email: out of area also replaces the price-pending wording', () => {
  const text = buildRequesterText({ ...baseArgs, price: null, priceUnavailable: true, outOfArea: true });
  assert.ok(text.includes(OUT_OF_AREA_MESSAGE));
  assert.ok(!text.includes('A dispatcher will confirm your price'));
});

t('wiring: the route measures the pickup, stores the marker and answers with the flag', () => {
  const route = readFileSync(new URL('../app/api/trip-request/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes("from '@/lib/service-area'"));
  assert.ok(route.includes('isOutOfAreaPickup(pickupResolvedPoint)'));
  // Facility bookings are never measured.
  assert.ok(route.includes('!wantsFacilityBooking && isOutOfAreaPickup'));
  // The marker lands in internal_notes, after the unpriced note.
  assert.ok(route.includes('internal_notes: internalNotes'));
  assert.ok(route.includes('[unpricedNote, outOfArea ? outOfAreaNote(outOfAreaMiles) : null]'));
  // The flag reaches the notifications and the JSON the form renders from.
  assert.ok(route.includes('priceUnavailable, outOfArea)'));
  assert.ok(route.includes('priceUnavailable, outOfArea }'));
});

t('wiring: the confirmation screen and the emails render the one agreed sentence', () => {
  const form = readFileSync(new URL('../components/request/RequestForm.tsx', import.meta.url), 'utf8');
  assert.ok(form.includes("from '@/lib/service-area'"));
  assert.ok(form.includes('data-testid="out-of-area"'));
  assert.ok(form.includes('json.outOfArea === true'));
  // Out of area is checked BEFORE the price block, so a priced trip still shows it.
  assert.ok(form.indexOf('receipt?.outOfArea') < form.indexOf('receipt?.price ?'));

  const notif = readFileSync(new URL('../lib/notifications.ts', import.meta.url), 'utf8');
  assert.ok(notif.includes("from './service-area'"));
  assert.ok(notif.includes('OUT_OF_AREA_MESSAGE'));
  assert.ok(notif.includes('OUT_OF_AREA_MARKER'));
});

console.log(`${n} passed`);
