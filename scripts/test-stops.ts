import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STOP_FEE_CENTS,
  STOP_INCLUDED_WAIT_MINUTES,
  STOP_TERMS_LINE,
  STOP_WAIT_BLOCK_CENTS,
  STOP_WAIT_BLOCK_MINUTES,
  stopAvailable,
  stopFeeLine,
} from '../lib/stops';
import { estimateTrip, haversineMiles } from '../lib/quote';
import { tripRequestSchema } from '../lib/trip-request';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const A = { lat: 35.2271, lng: -80.8431 }; // pickup (Uptown)
const B = { lat: 35.3, lng: -80.7 }; // destination
const S = { lat: 35.16, lng: -80.87 }; // a stop point well off the direct line
const AT = '2026-10-21T10:00'; // a Wednesday morning: no surcharge

type Est = NonNullable<ReturnType<typeof estimateTrip>>;
function priced(r: ReturnType<typeof estimateTrip>): Est & { kind: 'estimate' } {
  assert.ok(r && r.kind === 'estimate', `expected an estimate, got ${JSON.stringify(r)}`);
  return r as Est & { kind: 'estimate' };
}

// ── The settled constants (Phil, 2026-11-19) ────────────────────────────────
t('stop constants are the settled policy numbers', () => {
  assert.equal(STOP_FEE_CENTS, 1000);
  assert.equal(STOP_INCLUDED_WAIT_MINUTES, 15);
  assert.equal(STOP_WAIT_BLOCK_CENTS, 1000);
  assert.equal(STOP_WAIT_BLOCK_MINUTES, 15);
});

t('stops ride on care, recovery, concierge and winnie (incl. the pet alias) — never scholar', () => {
  for (const line of ['care', 'recovery', 'concierge', 'winnie', 'pet']) {
    assert.equal(stopAvailable(line), true, line);
  }
  for (const line of ['scholar', 'guardian', 'wellness']) {
    assert.equal(stopAvailable(line), false, line);
  }
});

t('the customer copy derives from the constants, so it cannot drift', () => {
  assert.equal(
    STOP_TERMS_LINE,
    '$10 per stop, 15 minutes of waiting included — after that, $10 per 15 minutes, billed after the ride.',
  );
  assert.equal(stopFeeLine('single', STOP_FEE_CENTS), 'Stop fee (15 min waiting included) — $10');
  assert.equal(stopFeeLine('outbound', STOP_FEE_CENTS), 'Stop fee on the way there (15 min waiting included) — $10');
  assert.equal(stopFeeLine('return', STOP_FEE_CENTS), 'Stop fee on the way back (15 min waiting included) — $10');
});

// ── No-stop bookings price EXACTLY as before (byte-identical totals) ────────
t('no-stop totals are unchanged, every shape', () => {
  const base = { pickup: A, dropoff: B, requestedAt: AT };
  assert.equal(priced(estimateTrip({ ...base, serviceLine: 'care', roadMiles: 6 })).lowCents, 5900);
  assert.equal(priced(estimateTrip({ ...base, serviceLine: 'care', roadMiles: 6, returnTrip: true })).lowCents, 11800);
  assert.equal(priced(estimateTrip({ ...base, serviceLine: 'concierge', roadMiles: 6, returnTrip: true })).lowCents, 19800);
  assert.equal(priced(estimateTrip({ ...base, serviceLine: 'recovery', roadMiles: 6, returnTrip: true })).lowCents, 14900);
  assert.equal(priced(estimateTrip({ ...base, serviceLine: 'winnie', roadMiles: 8 })).lowCents, 7900);
  // Winnie round trip: band x 1.8, rounded — the leg decomposition must agree to the cent.
  assert.equal(priced(estimateTrip({ ...base, serviceLine: 'winnie', roadMiles: 8, returnTrip: true })).lowCents, 14200);
  // Care WAV round trip: same 1.8 rule on the WAV card.
  assert.equal(
    priced(estimateTrip({ ...base, serviceLine: 'care', mobility: 'wheelchair', roadMiles: 8, returnTrip: true })).lowCents,
    23200,
  );
  const noStop = priced(estimateTrip({ ...base, serviceLine: 'care', roadMiles: 6 }));
  assert.equal(noStop.stopFeeCents, 0);
  assert.equal(noStop.returnStopFeeCents, 0);
});

// ── One-way stop: band on the through-stop route + the fee, as its own line ─
t('care one-way with a stop: band(summed route miles) + $10 stop fee', () => {
  const r = priced(
    estimateTrip({
      serviceLine: 'care',
      pickup: A,
      dropoff: B,
      stop: S,
      stopAddress: '3425 Park Rd, Charlotte, NC 28209',
      roadMiles: 6, // the measured pickup -> stop -> dropoff route
      requestedAt: AT,
    }),
  );
  assert.equal(r.lowCents, 5900 + 1000);
  assert.equal(r.highCents, r.lowCents);
  assert.equal(r.stopFeeCents, 1000);
  assert.equal(r.returnStopFeeCents, 0);
});

// ── Leg placement on round trips (Phil's correction, 2026-11-19) ───────────
t('care round trip, RETURN-leg stop only: outbound prices exactly as today, return prices through its stop + $10', () => {
  const r = priced(
    estimateTrip({
      serviceLine: 'care',
      pickup: A,
      dropoff: B,
      roadMiles: 6, // outbound, direct
      returnStop: S,
      returnStopAddress: '3425 Park Rd, Charlotte, NC 28209',
      returnRoadMiles: 13, // dropoff -> stop -> pickup
      returnTrip: true,
      requestedAt: AT,
    }),
  );
  // Outbound band(6 mi) $59 + return band(13 mi) $89 + the one stop fee.
  assert.equal(r.lowCents, 5900 + 8900 + 1000);
  assert.equal(r.stopFeeCents, 0);
  assert.equal(r.returnStopFeeCents, 1000);
});

t('care round trip, OUTBOUND stop only: the way back prices the direct route, not the detour', () => {
  const r = priced(
    estimateTrip({
      serviceLine: 'care',
      pickup: A,
      dropoff: B,
      stop: S,
      stopAddress: '3425 Park Rd, Charlotte, NC 28209',
      roadMiles: 13, // outbound through the stop
      returnRoadMiles: 6, // the direct way back, measured as itself
      returnTrip: true,
      requestedAt: AT,
    }),
  );
  assert.equal(r.lowCents, 8900 + 5900 + 1000);
  assert.equal(r.stopFeeCents, 1000);
  assert.equal(r.returnStopFeeCents, 0);
});

t('care round trip, stops on BOTH legs: two routes, two $10 fees', () => {
  const r = priced(
    estimateTrip({
      serviceLine: 'care',
      pickup: A,
      dropoff: B,
      stop: S,
      stopAddress: '3425 Park Rd, Charlotte, NC 28209',
      roadMiles: 13,
      returnStop: S,
      returnStopAddress: '901 Providence Rd, Charlotte, NC 28207',
      returnRoadMiles: 13,
      returnTrip: true,
      requestedAt: AT,
    }),
  );
  assert.equal(r.lowCents, 8900 + 8900 + 2000);
  assert.equal(r.stopFeeCents, 1000);
  assert.equal(r.returnStopFeeCents, 1000);
});

t('recovery round trip (band IS the round trip): a stop on either leg bands the longer route + $10', () => {
  const back = priced(
    estimateTrip({
      serviceLine: 'recovery',
      pickup: A,
      dropoff: B,
      roadMiles: 6,
      returnStop: S,
      returnStopAddress: '3425 Park Rd, Charlotte, NC 28209',
      returnRoadMiles: 13,
      returnTrip: true,
      requestedAt: AT,
    }),
  );
  assert.equal(back.lowCents, 19500 + 1000); // band(13 mi), not band(6 mi) + band(13 mi)
  const there = priced(
    estimateTrip({
      serviceLine: 'recovery',
      pickup: A,
      dropoff: B,
      stop: S,
      stopAddress: '3425 Park Rd, Charlotte, NC 28209',
      roadMiles: 13,
      returnRoadMiles: 6,
      returnTrip: true,
      requestedAt: AT,
    }),
  );
  assert.equal(there.lowCents, 19500 + 1000);
});

t('winnie round trip, return-leg stop: 1.8 decomposition on the return band + $10, extra-pet logic untouched', () => {
  const r = priced(
    estimateTrip({
      serviceLine: 'winnie',
      pickup: A,
      dropoff: B,
      roadMiles: 8, // band $79
      returnStop: S,
      returnStopAddress: '3900 Colony Rd, Charlotte, NC 28211',
      returnRoadMiles: 12, // band $89
      returnTrip: true,
      requestedAt: AT,
    }),
  );
  // legs = 7900 + round(8900 x 0.8) = 15020 -> rounded to $150, plus the fee.
  assert.equal(r.lowCents, 15000 + 1000);
  assert.equal(r.returnStopFeeCents, 1000);

  const oneWay = priced(
    estimateTrip({
      serviceLine: 'winnie',
      pickup: A,
      dropoff: B,
      stop: S,
      stopAddress: '3900 Colony Rd, Charlotte, NC 28211',
      roadMiles: 8,
      passengers: 2, // two pets: the second still pays the per-pet extra
      requestedAt: AT,
    }),
  );
  assert.equal(oneWay.lowCents, 7900 + 1500 + 1000);
  assert.equal(oneWay.stopFeeCents, 1000);
});

t('care WAV round trip, return-leg stop: the 1.8 rule applies per leg + $10', () => {
  const r = priced(
    estimateTrip({
      serviceLine: 'care',
      mobility: 'wheelchair',
      pickup: A,
      dropoff: B,
      roadMiles: 8, // WAV band $129
      returnStop: S,
      returnStopAddress: '3425 Park Rd, Charlotte, NC 28209',
      returnRoadMiles: 12, // WAV band $155
      returnTrip: true,
      requestedAt: AT,
    }),
  );
  // legs = 12900 + round(15500 x 0.8) = 25300, plus the fee.
  assert.equal(r.lowCents, 25300 + 1000);
});

// ── Fallbacks ────────────────────────────────────────────────────────────────
t('straight-line fallback routes THROUGH the stop when nothing was measured', () => {
  const direct = priced(estimateTrip({ serviceLine: 'care', pickup: A, dropoff: B, requestedAt: AT }));
  const via = priced(
    estimateTrip({
      serviceLine: 'care',
      pickup: A,
      dropoff: B,
      stop: S,
      stopAddress: '3425 Park Rd, Charlotte, NC 28209',
      requestedAt: AT,
    }),
  );
  const straightVia = haversineMiles(A, S) + haversineMiles(S, B);
  assert.ok(straightVia > haversineMiles(A, B), 'the stop point is a real detour in this fixture');
  assert.ok(via.miles > direct.miles, 'the priced route goes through the stop');
  assert.equal(via.stopFeeCents, 1000);
  assert.ok(via.lowCents >= direct.lowCents + 1000 - 2500, 'fee present, band never wildly under the direct price');
});

t('a stop that cannot be placed at all is quote-only, never a silent direct price', () => {
  const r = estimateTrip({
    serviceLine: 'care',
    pickup: A,
    dropoff: B,
    pickupAddress: '100 N Tryon St, Charlotte, NC 28202',
    dropoffAddress: '1000 Blythe Blvd, Charlotte, NC 28203',
    stopAddress: '123 Nowhere Lane', // no picked point, no ZIP
    requestedAt: AT,
  });
  assert.ok(r && r.kind === 'quote-only' && r.reason === 'unlocated', JSON.stringify(r));
});

t('a return stop past the last band is quote-only, like any long leg', () => {
  const r = estimateTrip({
    serviceLine: 'care',
    pickup: A,
    dropoff: B,
    roadMiles: 6,
    returnStop: S,
    returnStopAddress: '3425 Park Rd, Charlotte, NC 28209',
    returnRoadMiles: 45,
    returnTrip: true,
    requestedAt: AT,
  });
  assert.ok(r && r.kind === 'quote-only' && r.reason === 'beyond-bands', JSON.stringify(r));
});

// ── Schema: the API enforces the same rules as the form ─────────────────────
const when = new Date(Date.now() + 3 * 86_400_000);
const p2 = (x: number) => String(x).padStart(2, '0');
const requestedAt = `${when.getFullYear()}-${p2(when.getMonth() + 1)}-${p2(when.getDate())}T10:00`;
const returnAt = `${when.getFullYear()}-${p2(when.getMonth() + 1)}-${p2(when.getDate())}T14:00`;
const base = {
  serviceLine: 'care',
  pickupAddress: '100 N Tryon St, Charlotte, NC 28202',
  dropoffAddress: '1000 Blythe Blvd, Charlotte, NC 28203',
  requestedAt,
  contactFirstName: 'QA',
  contactLastName: 'Probe',
  contactPhone: '7045550100',
  contactEmail: 'qa@example.com',
};
const parse = (extra: Record<string, unknown>) => tripRequestSchema.safeParse({ ...base, ...extra });
const issueOn = (r: ReturnType<typeof parse>, path: string) =>
  !r.success && r.error.issues.some((i) => i.path.join('.') === path);

t('schema: a valid stop on either leg passes, on care and on winnie', () => {
  assert.ok(parse({ stopAddress: '3425 Park Rd, Charlotte, NC 28209' }).success);
  assert.ok(
    parse({ returnTrip: true, returnAt, returnStopAddress: '3425 Park Rd, Charlotte, NC 28209' }).success,
  );
  assert.ok(
    parse({
      returnTrip: true,
      returnAt,
      stopAddress: '901 Providence Rd, Charlotte, NC 28207',
      returnStopAddress: '3425 Park Rd, Charlotte, NC 28209',
    }).success,
  );
  assert.ok(parse({ serviceLine: 'winnie', stopAddress: '3900 Colony Rd, Charlotte, NC 28211' }).success);
});

t('schema: a stop that IS one of the trip ends is a field error on that stop', () => {
  assert.ok(issueOn(parse({ stopAddress: '100 n tryon st, charlotte, nc 28202' }), 'stopAddress'));
  assert.ok(issueOn(parse({ stopAddress: '1000 Blythe Blvd, Charlotte, NC 28203' }), 'stopAddress'));
  assert.ok(
    issueOn(parse({ returnTrip: true, returnAt, returnStopAddress: '100 N Tryon St, Charlotte, NC 28202' }), 'returnStopAddress'),
  );
  assert.ok(
    issueOn(parse({ returnTrip: true, returnAt, returnStopAddress: '1000 Blythe Blvd, Charlotte, NC 28203' }), 'returnStopAddress'),
  );
  // Same place by coordinates, different typed text: still the same place.
  assert.ok(
    issueOn(
      parse({
        pickupLat: 35.2271,
        pickupLng: -80.8431,
        stopAddress: 'Some other wording, Charlotte, NC 28202',
        stopLat: 35.2271,
        stopLng: -80.8431,
      }),
      'stopAddress',
    ),
  );
});

t('schema: a return stop needs a round trip, and stops never ride on scholar', () => {
  assert.ok(issueOn(parse({ returnStopAddress: '3425 Park Rd, Charlotte, NC 28209' }), 'returnStopAddress'));
  assert.ok(issueOn(parse({ serviceLine: 'scholar', stopAddress: '3425 Park Rd, Charlotte, NC 28209' }), 'stopAddress'));
});

// ── The public policy surface derives from the constants ────────────────────
t('/refunds stop copy derives from lib/stops — no hand-typed stop numbers', () => {
  const src = readFileSync(new URL('../app/refunds/page.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes("from '@/lib/stops'"), 'the refunds page imports the stops module');
  assert.ok(src.includes('stopFeeText()'), 'the fee comes from the constants');
  assert.ok(src.includes('STOP_INCLUDED_WAIT_MINUTES'), 'the included wait comes from the constants');
  assert.ok(!/costs\s+\$10\s+per stop/.test(src), 'no hand-typed stop fee on the page');
});

console.log(`\n${n} stop tests passed`);
