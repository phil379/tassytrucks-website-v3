import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimateTrip, haversineMiles } from '../lib/quote';

/**
 * Block D1 — ONE DISTANCE ON SCREEN.
 *
 * The booking form used to print the straight-line estimate first ("about
 * 8.6 miles") and swap in Google's measured drive when /api/distance landed
 * ("7.8 miles driving") — two distances for one route, at the same price.
 * The form now holds the panel until the lookup for the current pair has
 * settled (components/request/RequestForm.tsx, distancePending), so the only
 * figure a customer ever sees is the one the displayed price was computed
 * from.
 *
 * These tests pin the engine half of that contract, on the Nov 15 Winnie
 * test route (Bank of America Stadium to Charlotte Douglas): the two states
 * DO print different miles and DO price identically — which is why the fix
 * is in the form's display timing and not in the engine. lib/quote.ts is
 * unchanged by Block D1; if a future change moves any number below, the
 * display contract needs re-review, not a quiet test edit.
 */

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

// The Nov 15 test route, as picked from Google's list.
const PICKUP = { lat: 35.2258, lng: -80.8528 };
const DROPOFF = { lat: 35.2144, lng: -80.9473 };
// A Wednesday midday: no weekend, holiday or after-hours surcharge in play.
const WHEN = '2026-11-18T12:00';

t("the measured state prints Google's miles and one firm price", () => {
  const q = estimateTrip({
    serviceLine: 'winnie',
    pickup: PICKUP,
    dropoff: DROPOFF,
    roadMiles: 7.8,
    requestedAt: WHEN,
  });
  assert.equal(q?.kind, 'estimate');
  if (q?.kind !== 'estimate') return;
  assert.equal(q.miles, 7.8);
  assert.equal(q.distanceMeasured, true);
  assert.equal(q.lowCents, 7900);
  assert.equal(q.highCents, 7900);
});

t('the fallback state prints the middle straight-line estimate', () => {
  const q = estimateTrip({
    serviceLine: 'winnie',
    pickup: PICKUP,
    dropoff: DROPOFF,
    roadMiles: null,
    requestedAt: WHEN,
  });
  assert.equal(q?.kind, 'estimate');
  if (q?.kind !== 'estimate') return;
  assert.equal(q.distanceMeasured, false);
  // The middle of the calibrated spread (ROAD_FACTOR_MID in lib/quote.ts).
  assert.equal(q.miles, Math.round(haversineMiles(PICKUP, DROPOFF) * 1.36 * 10) / 10);
});

t('the two states disagree on miles and agree to the cent on price', () => {
  const measured = estimateTrip({
    serviceLine: 'winnie',
    pickup: PICKUP,
    dropoff: DROPOFF,
    roadMiles: 7.8,
    requestedAt: WHEN,
  });
  const fallback = estimateTrip({
    serviceLine: 'winnie',
    pickup: PICKUP,
    dropoff: DROPOFF,
    roadMiles: null,
    requestedAt: WHEN,
  });
  assert.equal(measured?.kind, 'estimate');
  assert.equal(fallback?.kind, 'estimate');
  if (measured?.kind !== 'estimate' || fallback?.kind !== 'estimate') return;
  assert.notEqual(measured.miles, fallback.miles);
  assert.equal(measured.lowCents, fallback.lowCents);
  assert.equal(measured.highCents, fallback.highCents);
});

t('the form holds the panel while the lookup for the current pair is unsettled', () => {
  const src = readFileSync(
    new URL('../components/request/RequestForm.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(src.includes('const distancePending'));
  assert.ok(
    src.includes('if (distancePending && !isQuoteOnly(service, mobility)) return null;'),
  );
  assert.ok(src.includes('data-testid="distance-pending"'));
});

t('the server prices the stored trip with the same engine and the same measured miles', () => {
  const src = readFileSync(
    new URL('../app/api/trip-request/route.ts', import.meta.url),
    'utf8',
  );
  assert.ok(src.includes('await roadDistance('));
  assert.ok(src.includes('estimateTrip({'));
  assert.ok(src.includes('roadMiles: measured?.miles ?? null'));
});

console.log(`${n} passed`);
