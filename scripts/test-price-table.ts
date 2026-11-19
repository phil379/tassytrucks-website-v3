// Golden tests for lib/price-table.ts. Run: bun run scripts/test-price-table.ts
//
// The price table the facility flow shows is DERIVED from lib/quote.ts.
// These tests are the derivation's leash: if someone hand-types a price
// into lib/price-table.ts (or a reprice lands in the engine and the table
// stops following), this file fails. Every expected value below is read
// from the engine itself, never typed here either.
import assert from 'node:assert/strict';
import {
  CARE, RECOVERY, CONCIERGE, WINNIE, CARE_WAV,
  SURCHARGES, ESCORT_CENTS,
  bandLabel, overBandLabel, roundTripCents, dollars,
  type Card,
} from '../lib/quote';
import { buildPriceTable, careFrom, winnieRoundTrip, winnieRoundTripRange } from '../lib/price-table';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };

const data = buildPriceTable();
const CARDS: Record<string, Card> = {
  care: CARE, recovery: RECOVERY, concierge: CONCIERGE, winnie: WINNIE, wav: CARE_WAV,
};

t('every line, every band: the table equals the engine, one way and round trip', () => {
  for (const line of [...data.lines, data.wav]) {
    const card = CARDS[line.key];
    assert.ok(card, `no card for ${line.key}`);
    assert.equal(line.label, card.label);
    assert.equal(line.fromCents, card.bands[0].cents);
    assert.equal(line.from, dollars(card.bands[0].cents));
    assert.equal(line.rows.length, card.bands.length);
    assert.equal(line.overBand, overBandLabel(card.bands));
    line.rows.forEach((row, i) => {
      assert.equal(row.band, bandLabel(card.bands, i), `${line.key} band ${i} label`);
      assert.equal(row.oneWayCents, card.bands[i].cents, `${line.key} band ${i} one way`);
      assert.equal(row.oneWay, dollars(card.bands[i].cents));
      assert.equal(row.roundTripCents, roundTripCents(card, card.bands[i].cents), `${line.key} band ${i} round trip`);
      assert.equal(
        row.roundTrip,
        card.returnFactor === 1 ? 'Included' : dollars(roundTripCents(card, card.bands[i].cents)),
      );
    });
  }
});

t('the four per-trip lines are present, in order; Scholar is not a per-trip line', () => {
  assert.deepEqual(data.lines.map((l) => l.key), ['care', 'recovery', 'concierge', 'winnie']);
  assert.equal(data.wav.key, 'wav');
});

t('the floor is the cheapest entry band across the four cards', () => {
  const expected = Math.min(CARE.bands[0].cents, RECOVERY.bands[0].cents, CONCIERGE.bands[0].cents, WINNIE.bands[0].cents);
  assert.equal(data.floorCents, expected);
  assert.equal(data.floor, dollars(expected));
});

t('every modifier equals its engine value', () => {
  const byLabel = new Map(data.modifiers.map((m) => [m.label, m]));
  const expectMod = (label: string, cents: number) => {
    const m = byLabel.get(label);
    assert.ok(m, `missing modifier ${label}`);
    assert.equal(m.cents, cents, label);
    assert.equal(m.amount, `+${dollars(cents)}`, label);
  };
  expectMod('Weekend', SURCHARGES.weekend);
  expectMod('After hours', SURCHARGES.afterHours);
  expectMod('Holiday', SURCHARGES.holiday);
  expectMod('Extra passenger — Tassy Care', CARE.perExtra);
  expectMod('Extra pet — Winnie Ride', WINNIE.perExtra);
  expectMod('Tassy Escort — Recovery', ESCORT_CENTS);
  assert.equal(data.modifiers.length, 6);
});

t('the WAV card is the wheelchair card, with its own round-trip rule', () => {
  assert.equal(data.wav.fromCents, CARE_WAV.bands[0].cents);
  for (const [i, row] of data.wav.rows.entries()) {
    assert.equal(row.roundTripCents, Math.max(Math.round(CARE_WAV.bands[i].cents * 1.8), CARE_WAV.returnFloor));
  }
});

t('panel and Winnie-page helpers derive from the cards', () => {
  assert.equal(careFrom(), dollars(CARE.bands[0].cents));
  assert.equal(winnieRoundTrip(0), dollars(roundTripCents(WINNIE, WINNIE.bands[0].cents)));
  assert.equal(
    winnieRoundTripRange(1, 2),
    `${dollars(roundTripCents(WINNIE, WINNIE.bands[1].cents))}–${dollars(roundTripCents(WINNIE, WINNIE.bands[2].cents)).replace('$', '')}`,
  );
  assert.equal(
    winnieRoundTripRange(3, 4),
    `${dollars(roundTripCents(WINNIE, WINNIE.bands[3].cents))}–${dollars(roundTripCents(WINNIE, WINNIE.bands[4].cents)).replace('$', '')}`,
  );
});

console.log(`${n} passed`);
