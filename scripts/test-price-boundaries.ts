import assert from 'node:assert/strict';
import {
  CARE, CARE_WAV, CONCIERGE, RECOVERY, SURCHARGES, TREATMENT_DAY, WINNIE,
  dollars, estimateTrip, holidayName, roundTripCents, type Card,
} from '../lib/quote';
import type { ServiceLine } from '../lib/trip-request';

// These tests exercise the published Care WAV card, so the switch (lib/wav.ts) is on for them.
// scripts/test-wav-switch.ts covers the off state.
process.env.NEXT_PUBLIC_WAV_LIVE = 'true';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const A = { lat: 35.2271, lng: -80.8431 };
const B = { lat: 35.3, lng: -80.7 };
const AT = '2026-10-21T10:00'; // a Wednesday morning: no surcharge

type Opts = { mobility?: string; returnTrip?: boolean; requestedAt?: string; treatmentDay?: boolean; escort?: boolean; passengers?: number };
function est(line: ServiceLine, roadMiles: number, o: Opts = {}) {
  return estimateTrip({ serviceLine: line, pickup: A, dropoff: B, roadMiles, requestedAt: AT, ...o });
}
/** One number for a measured distance, or the reason there is none. */
function cents(line: ServiceLine, roadMiles: number, o: Opts = {}): number | string {
  const r = est(line, roadMiles, o);
  if (!r) return 'null';
  if (r.kind !== 'estimate') return `quote-only:${r.reason}`;
  assert.equal(r.lowCents, r.highCents, 'a measured distance is one price, never a range');
  return r.lowCents;
}
const table = (card: Card) => card.bands.map((b) => [b.upToMiles, b.cents / 100]);

// ── The cards, written out. The same literal tables are asserted in the ops repo
// (src/lib/pricing/published-care-edges.test.ts), so repricing one repo alone fails a test.
t('Care card', () => {
  assert.deepEqual(table(CARE), [[3, 49], [7, 59], [12, 74], [17, 89], [22, 109], [30, 129]]);
  assert.deepEqual([CARE.returnFactor, CARE.returnFloor, CARE.waitIncludedMin, CARE.waitOverage, CARE.perExtra], [2, 0, 15, 2000, 1000]);
});
t('Care WAV card: 0-5 mi $109, 6-10 mi $129, then $155 / $185 / $225 at 15 / 20 / 30 mi', () => {
  assert.deepEqual(table(CARE_WAV), [[5, 109], [10, 129], [15, 155], [20, 185], [30, 225]]);
  assert.deepEqual([CARE_WAV.returnFactor, CARE_WAV.returnFloor, CARE_WAV.waitIncludedMin, CARE_WAV.waitOverage, CARE_WAV.perExtra], [1.8, 18000, 20, 3000, 0]);
});
t('Recovery, Concierge, Winnie and Treatment Day cards', () => {
  assert.deepEqual(table(RECOVERY), [[3, 129], [7, 149], [12, 169], [17, 195], [22, 225], [30, 259]]);
  assert.deepEqual(table(CONCIERGE), [[3, 89], [7, 99], [12, 109], [17, 129], [22, 155], [30, 185]]);
  assert.deepEqual(table(WINNIE), [[5, 59], [10, 79], [15, 89], [20, 99], [25, 109]]);
  assert.deepEqual(table(TREATMENT_DAY), [[3, 109], [7, 129], [12, 159], [17, 189], [22, 229], [30, 269]]);
  assert.deepEqual([WINNIE.returnFactor, WINNIE.returnFloor, WINNIE.waitIncludedMin, WINNIE.perExtra], [1.8, 10600, 15, 1500]);
  assert.deepEqual([RECOVERY.returnFactor, CONCIERGE.returnFactor, TREATMENT_DAY.returnFactor], [1, 2, 1]);
  assert.deepEqual({ ...SURCHARGES }, { afterHours: 2500, weekend: 2000, holiday: 4500 });
});

// ── Distance boundaries, every line.
const LINES: [ServiceLine, Opts][] = [
  ['care', {}], ['care', { mobility: 'wheelchair' }], ['recovery', {}], ['concierge', {}], ['winnie', {}], ['pet', {}],
];
const EDGE_MILES = [0.01, 0.1, 2.99, 3, 3.01, 4.99, 5, 5.01, 6.99, 7, 7.01, 9.99, 10, 10.01, 11.99, 12, 12.01, 15, 16.99, 17, 17.01, 20, 21.99, 22, 22.01, 25, 25.01, 30, 30.01, 31, 150];

t('every line, every boundary: a whole-dollar price, or a person quotes it past the last rung; never null, NaN or negative', () => {
  for (const [line, o] of LINES) {
    const card = line === 'care' && o.mobility === 'wheelchair' ? CARE_WAV : line === 'recovery' ? RECOVERY : line === 'concierge' ? CONCIERGE : line === 'care' ? CARE : WINNIE;
    const last = card.bands[card.bands.length - 1]!.upToMiles;
    for (const m of EDGE_MILES) {
      const c = cents(line, m, o);
      if (m > last) {
        assert.equal(c, 'quote-only:beyond-bands', `${line} ${o.mobility ?? ''} ${m} mi`);
      } else {
        assert.equal(typeof c, 'number', `${line} ${o.mobility ?? ''} ${m} mi`);
        assert.ok(Number.isInteger(c) && (c as number) > 0 && (c as number) % 100 === 0, `${line} ${m} mi -> ${c}`);
        // The edge itself belongs to the rung it closes.
        const band = card.bands.find((b) => m <= b.upToMiles)!;
        assert.equal(c, band.cents, `${line} ${o.mobility ?? ''} ${m} mi`);
      }
    }
  }
});

t('a longer trip never costs less (0.1 mi steps to the end of each card, one way and round trip)', () => {
  for (const [line, o] of LINES) {
    for (const returnTrip of [false, true]) {
      let prev = 0;
      for (let i = 1; i <= 1000; i++) {
        const m = i / 10;
        const c = cents(line, m, { ...o, returnTrip });
        if (typeof c === 'string') {
          assert.equal(c, 'quote-only:beyond-bands');
          continue;
        }
        assert.ok(c >= prev, `${line} ${o.mobility ?? ''} returnTrip=${returnTrip}: ${m} mi costs $${c / 100} after $${prev / 100}`);
        prev = c;
      }
    }
  }
});

t('Winnie: the five rungs and the quote-only edge', () => {
  assert.deepEqual([0.1, 5, 5.01, 10, 10.01, 15, 15.01, 20, 20.01, 25].map((m) => cents('winnie', m)), [5900, 5900, 7900, 7900, 8900, 8900, 9900, 9900, 10900, 10900]);
  assert.equal(cents('winnie', 25.01), 'quote-only:beyond-bands');
  assert.equal(cents('winnie', 30), 'quote-only:beyond-bands');
  assert.equal(cents('winnie', 30.01), 'quote-only:beyond-bands');
  assert.equal(cents('winnie', 500), 'quote-only:beyond-bands');
});

t('Care WAV edges: 5 mi is $109, 5.01 is $129, 10 is $129, 10.01 is $155', () => {
  assert.deepEqual([4.99, 5, 5.01, 9.99, 10, 10.01, 15, 15.01, 20, 20.01, 30].map((m) => cents('care', m, { mobility: 'wheelchair' })), [10900, 10900, 12900, 12900, 12900, 15500, 15500, 18500, 18500, 22500, 22500]);
});

t('wheelchair on Concierge prices on the WAV card one way; wheelchair on Recovery is a forced round trip on the WAV card (1.8x)', () => {
  assert.equal(cents('concierge', 4, { mobility: 'wheelchair' }), 10900);
  // Recovery with a wheelchair is always a round trip (PR 49): 1.8 x the $109 rung = $196.
  assert.equal(cents('recovery', 4, { mobility: 'wheelchair' }), 19600);
});

// ── Unusable distances fall back to the straight line between the two points; they never throw
// and never produce NaN. (A measured distance must be finite and above zero to count.)
t('a bad measured distance is ignored, not priced: 0, negative, NaN, Infinity', () => {
  const viaStraightLine = est('care', NaN);
  assert.ok(viaStraightLine && viaStraightLine.kind === 'estimate');
  for (const bad of [0, -3, NaN, Infinity, -Infinity]) {
    const r = estimateTrip({ serviceLine: 'care', pickup: A, dropoff: B, roadMiles: bad, requestedAt: AT });
    assert.ok(r && r.kind === 'estimate', `roadMiles ${bad}`);
    if (r.kind === 'estimate') {
      assert.ok(Number.isFinite(r.lowCents) && Number.isFinite(r.highCents) && r.lowCents > 0 && r.highCents >= r.lowCents);
      assert.ok(Number.isFinite(r.miles) && r.miles > 0);
    }
  }
  // No measurement of any kind: null (the caller must say a dispatcher will price it).
  assert.equal(estimateTrip({ serviceLine: 'care', requestedAt: AT, roadMiles: null }), null);
  assert.equal(estimateTrip({ serviceLine: 'care', pickup: A, requestedAt: AT, roadMiles: null }), null);
});

// ── Return trips, round trips, waiting, after hours.
t('return trips: factor, floor, and the card that is already a round trip', () => {
  assert.equal(cents('care', 2, { returnTrip: true }), 9800); // 2 x 49
  assert.equal(cents('care', 12, { returnTrip: true }), 14800); // 2 x 74
  assert.equal(cents('concierge', 2, { returnTrip: true }), 17800); // two full legs
  assert.equal(cents('winnie', 4, { returnTrip: true }), 10600); // 1.8 x 59 = 106.2 -> $106
  assert.equal(cents('winnie', 8, { returnTrip: true }), 14200); // 1.8 x 79 = 142.2
  assert.equal(cents('care', 4, { mobility: 'wheelchair', returnTrip: true }), 19600); // 1.8 x 109 = 196.2
  assert.equal(cents('care', 8, { mobility: 'wheelchair', returnTrip: true }), 23200);
  // Recovery and Treatment Day are already a round trip: ticking the box changes nothing.
  assert.equal(cents('recovery', 2, { returnTrip: true }), cents('recovery', 2));
  assert.equal(cents('care', 2, { treatmentDay: true, returnTrip: true }), 10900);
  assert.equal(cents('care', 2, { treatmentDay: true }), 10900);
  // The floor on a card is a floor: it cannot make a round trip cheaper than the factor says.
  assert.equal(roundTripCents({ ...CARE_WAV, returnFloor: 25000 }, 10900), 25000);
});

t('the /pricing page round-trip column shows what the booking form charges, for every rung of every card', () => {
  const cases: [ServiceLine, Card, Opts][] = [['care', CARE, {}], ['care', CARE_WAV, { mobility: 'wheelchair' }], ['concierge', CONCIERGE, {}], ['winnie', WINNIE, {}], ['recovery', RECOVERY, {}]];
  for (const [line, card, o] of cases) {
    for (const band of card.bands) {
      const shown = dollars(roundTripCents(card, band.cents));
      const charged = cents(line, band.upToMiles, { ...o, returnTrip: true });
      assert.equal(typeof charged, 'number');
      assert.equal(shown, `$${(charged as number) / 100}`, `${card.label} up to ${band.upToMiles} mi`);
    }
  }
});

t('wait time: included minutes per card, and Winnie round trips include 20', () => {
  const w = (line: ServiceLine, o: Opts = {}) => {
    const r = est(line, 4, o);
    assert.ok(r && r.kind === 'estimate');
    return (r as { waitIncludedMin: number }).waitIncludedMin;
  };
  assert.equal(w('care'), 15);
  assert.equal(w('care', { mobility: 'wheelchair' }), 20);
  assert.equal(w('recovery'), 20);
  assert.equal(w('concierge'), 0);
  assert.equal(w('winnie'), 15);
  assert.equal(w('winnie', { returnTrip: true }), 20);
});

t('after hours, weekend and holiday: charged once, on top, never doubled by a return trip', () => {
  assert.equal(cents('care', 2, { requestedAt: '2026-10-21T21:00' }), 4900 + 2500);
  assert.equal(cents('care', 2, { requestedAt: '2026-10-21T21:00', returnTrip: true }), 9800 + 2500);
  assert.equal(cents('care', 2, { requestedAt: '2026-10-24T10:00' }), 4900 + 2000);
  assert.equal(cents('care', 2, { requestedAt: '2026-10-25T22:00' }), 4900 + 2500 + 2000);
  assert.equal(cents('care', 2, { requestedAt: '2026-11-26T10:00' }), 4900 + 4500); // Thanksgiving replaces the weekend charge
  assert.equal(cents('care', 2, { requestedAt: '2026-12-25T21:30' }), 4900 + 2500 + 4500);
  assert.equal(cents('care', 2, { requestedAt: '2026-10-21T06:00' }), 4900); // 6:00 is day
  assert.equal(cents('care', 2, { requestedAt: '2026-10-21T20:00' }), 4900 + 2500); // 20:00 is night
  assert.equal(cents('care', 2, { requestedAt: '2026-10-21T05:59' }), 4900 + 2500);
  // Concierge carries no early or late charge.
  assert.equal(cents('concierge', 2, { requestedAt: '2026-10-21T04:40' }), 8900);
  assert.equal(holidayName(2026, 11, 26), 'Thanksgiving Day');
  assert.equal(holidayName(2026, 11, 27), null);
});

t('extra passengers are charged per head on Care and Winnie, free on Recovery and Concierge', () => {
  assert.equal(cents('care', 2, { passengers: 3 }), 4900 + 2000);
  assert.equal(cents('winnie', 2, { passengers: 2 }), 5900 + 1500);
  assert.equal(cents('recovery', 2, { passengers: 4 }), 12900);
  assert.equal(cents('concierge', 2, { passengers: 6 }), 8900);
  // Not doubled on a return trip.
  assert.equal(cents('care', 2, { passengers: 2, returnTrip: true }), 9800 + 1000);
});

t('Escort is $45 once, on Recovery only', () => {
  assert.equal(cents('recovery', 2, { escort: true }), 12900 + 4500);
  assert.equal(cents('care', 2, { escort: true }), 4900);
  assert.equal(cents('winnie', 2, { escort: true }), 5900);
});

t('lines a person quotes: Scholar never gets a number', () => {
  const r = estimateTrip({ serviceLine: 'scholar', pickup: A, dropoff: B, roadMiles: 5, requestedAt: AT });
  assert.ok(r && r.kind === 'quote-only' && r.reason === 'quoted-line');
});

t('a ZIP-only trip is flagged inexact and may be a range; a picked trip is exact and one price', () => {
  const zip = estimateTrip({ serviceLine: 'care', pickupAddress: '100 N Tryon St, Charlotte, NC 28202', dropoffAddress: '1000 Blythe Blvd, Charlotte, NC 28203', requestedAt: AT });
  assert.ok(zip && zip.kind === 'estimate' && zip.exact === false && zip.highCents >= zip.lowCents);
  const picked = estimateTrip({ serviceLine: 'care', pickup: A, dropoff: B, roadMiles: 6, requestedAt: AT });
  assert.ok(picked && picked.kind === 'estimate' && picked.exact === true && picked.lowCents === picked.highCents);
  // Typed text with no ZIP and nothing picked: no price at all.
  assert.equal(estimateTrip({ serviceLine: 'care', pickupAddress: '1220 Tourmaline Rd, Apt 1910', dropoffAddress: 'the vet', requestedAt: AT }), null);
});

console.log(`${n} passed`);
