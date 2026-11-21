import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLT_TERMINAL } from '../lib/hotel-zones';
import { haversineMiles } from '../lib/quote';
import { AIRPORT_PRICING_SNAP_RADIUS_M, pricingPoint } from '../lib/road-distance';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const TERMINAL = { lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng };
// The pin that caused the Nov 21 mispricing: a Places pin for "5501 Josh
// Birmingham Pkwy" on the airport's north edge. Google measured the drive
// from Pruitt St to this pin at 2.8 miles ($109 Concierge) while the same
// ride to the terminal pin measured 6.5 miles ($119).
const NEAR_EDGE_PIN = { lat: 35.2301254, lng: -80.9335469 };
// The other airport pin seen in the Nov 21 rows (~1,110 m from the centre).
const PARKWAY_PIN = { lat: 35.2250704, lng: -80.9480529 };
// Listed hotels near the airport — a hotel point must NEVER snap, or a
// hotel ride could price as a zero-length terminal run on the normal card
// whenever the flat hotel price does not apply.
const SHERATON_AIRPORT = { lat: 35.2375077, lng: -80.9226235 }; // ~3,695 m out
const HAMPTON_AIRPORT = { lat: 35.2384032, lng: -80.9387362 }; // ~2,819 m out — the nearest listed hotel
const PRUITT = { lat: 35.2263648, lng: -80.89841 }; // the campaign's Charlotte pickup, ~5,167 m out

const metresFromTerminal = (p: { lat: number; lng: number }) =>
  haversineMiles(p, TERMINAL) * 1609.344;

t('the snap circle threads the measured gap: every airport pin inside, every listed hotel outside', () => {
  assert.equal(AIRPORT_PRICING_SNAP_RADIUS_M, 2600);
  // Why CLT_TERMINAL.radiusMeters (2,000, the hotel match circle) cannot be
  // the snap radius: the airport's own address pin sits outside it.
  assert.ok(metresFromTerminal(NEAR_EDGE_PIN) > CLT_TERMINAL.radiusMeters);
  assert.ok(metresFromTerminal(NEAR_EDGE_PIN) < AIRPORT_PRICING_SNAP_RADIUS_M);
  assert.ok(metresFromTerminal(HAMPTON_AIRPORT) > AIRPORT_PRICING_SNAP_RADIUS_M);
  assert.ok(metresFromTerminal(SHERATON_AIRPORT) > AIRPORT_PRICING_SNAP_RADIUS_M);
});

t('the near-edge airport pin snaps to the canonical terminal point', () => {
  assert.deepEqual(pricingPoint(NEAR_EDGE_PIN), TERMINAL);
  assert.deepEqual(pricingPoint(PARKWAY_PIN), TERMINAL);
});

t('the terminal point itself is unchanged', () => {
  assert.deepEqual(pricingPoint(TERMINAL), TERMINAL);
});

t('airport-area hotel points do NOT snap', () => {
  assert.equal(pricingPoint(SHERATON_AIRPORT), SHERATON_AIRPORT);
  assert.equal(pricingPoint(HAMPTON_AIRPORT), HAMPTON_AIRPORT);
});

t('an ordinary Charlotte point does NOT snap', () => {
  assert.equal(pricingPoint(PRUITT), PRUITT);
});

t('no point at all passes through unchanged — typed-address behaviour is untouched', () => {
  assert.equal(pricingPoint(null), null);
  assert.equal(pricingPoint(undefined), undefined);
});

t('wiring: /api/distance snaps the two ends and never the stops', () => {
  const route = readFileSync(new URL('../app/api/distance/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes("pricingPoint, roadDistance, roadDistanceVia } from '@/lib/road-distance'"));
  assert.ok(route.includes('pricingPoint(fromRaw)'));
  assert.ok(route.includes('pricingPoint(toRaw)'));
  // The stop points flow into the Via calls raw.
  assert.ok(route.includes('roadDistanceVia(from, stop, to)'));
  assert.ok(route.includes('roadDistanceVia(to, returnStop, from)'));
});

t('wiring: the booking route measures and estimates on pricing points, stores and checks on raw pins', () => {
  const route = readFileSync(new URL('../app/api/trip-request/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('const pickupPricingPoint = pricingPoint(pickupPoint);'));
  assert.ok(route.includes('const dropoffPricingPoint = pricingPoint(dropoffPoint);'));
  assert.ok(route.includes('roadDistance(pickupPricingPoint, dropoffPricingPoint)'));
  assert.ok(route.includes('roadDistanceVia(pickupPricingPoint, stopPoint, dropoffPricingPoint)'));
  // The estimate's straight-line fallback prices to the terminal too.
  assert.ok(route.includes('pickup: pickupPricingPoint,'));
  assert.ok(route.includes('dropoff: dropoffPricingPoint,'));
  // The hotel check still reads the RAW points (radius-based already).
  assert.ok(route.includes('pickup: pickupPoint,'));
  assert.ok(route.includes('dropoff: dropoffPoint,'));
  // The stored row still carries the rider's actual pins.
  assert.ok(route.includes('pickup_lat: data.pickupLat ?? null'));
  assert.ok(route.includes('dropoff_lat: data.dropoffLat ?? null'));
  // The service-area measurement still resolves from the raw pickup point.
  assert.ok(route.includes('resolvePoint(pickupPoint, data.pickupAddress)'));
});

t('wiring: the form snaps the distance lookup and its local estimate, and nothing else', () => {
  const form = readFileSync(new URL('../components/request/RequestForm.tsx', import.meta.url), 'utf8');
  assert.ok(form.includes("import { pricingPoint } from '@/lib/road-distance';"));
  assert.ok(form.includes('pickup: pricingPoint({ lat: pickupLat, lng: pickupLng })'));
  assert.ok(form.includes('dropoff: pricingPoint({ lat: dropoffLat, lng: dropoffLng })'));
  assert.ok(form.includes('pickup: pickupPricingPoint ?? pickupPlace,'));
  assert.ok(form.includes('dropoff: dropoffPricingPoint ?? dropoffPlace,'));
});

console.log(`${n} passed`);
