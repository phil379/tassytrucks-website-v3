import {
  CARE,
  RECOVERY,
  CONCIERGE,
  WINNIE,
  CARE_WAV,
  SURCHARGES,
  ESCORT_CENTS,
  bandLabel,
  overBandLabel,
  roundTripCents,
  dollars,
  type Card,
} from '@/lib/quote';

/**
 * The published price table, as DATA — every number derived from lib/quote.ts.
 *
 * WHY THIS FILE EXISTS. On 2026-11-18 a facility tester (Marianne, Friend 9)
 * finished the whole signup flow without ever seeing a price, and asked how
 * we charge — per mile, per contract, per passenger? The answer (per trip,
 * flat by distance band) was published on /pricing but never shown inside
 * the facility flow. This builder feeds the shared PriceTable component so
 * the partners page, the signup page and the facility wizard all show the
 * same numbers the booking form quotes.
 *
 * THE RULE (the RateTable rule, applied to data): nothing here takes a
 * number. Every figure comes from a card or a constant in lib/quote.ts, so
 * a reprice there changes every surface on the next build, and the golden
 * test (scripts/test-price-table.ts) fails if a figure here ever stops
 * matching the engine. Scholar is deliberately absent: it is a monthly
 * plan (lib/school-plans.ts), not a per-trip price, and it is deferred.
 */

export type PriceBandRow = {
  /** "Up to 5 miles" / "6 – 10 miles", from the card's own bands. */
  band: string;
  oneWayCents: number;
  oneWay: string;
  roundTripCents: number;
  /** "Included" when the card's fare already IS the round trip (Recovery). */
  roundTrip: string;
};

export type PriceLineData = {
  key: 'care' | 'recovery' | 'concierge' | 'winnie' | 'wav';
  label: string;
  note: string;
  fromCents: number;
  from: string;
  rows: PriceBandRow[];
  /** The rung past the card ("Over 30 miles") — a person quotes it. */
  overBand: string;
};

export type PriceModifier = {
  label: string;
  /** "+$20", formatted from the engine value. */
  amount: string;
  cents: number;
  note: string;
};

export type PriceTableData = {
  lines: PriceLineData[];
  wav: PriceLineData;
  modifiers: PriceModifier[];
  /** The cheapest entry band across the four per-trip cards. */
  floorCents: number;
  floor: string;
};

function lineData(key: PriceLineData['key'], card: Card, note: string): PriceLineData {
  const rows: PriceBandRow[] = card.bands.map((band, i) => {
    const rt = roundTripCents(card, band.cents);
    return {
      band: bandLabel(card.bands, i),
      oneWayCents: band.cents,
      oneWay: dollars(band.cents),
      roundTripCents: rt,
      roundTrip: card.returnFactor === 1 ? 'Included' : dollars(rt),
    };
  });
  const wait =
    card.waitIncludedMin > 0 ? ` · ${card.waitIncludedMin} min wait included` : '';
  return {
    key,
    label: card.label,
    note: `${note}${wait}`,
    fromCents: card.bands[0].cents,
    from: dollars(card.bands[0].cents),
    rows,
    overBand: overBandLabel(card.bands),
  };
}

export function buildPriceTable(): PriceTableData {
  const lines = [
    lineData('care', CARE, 'One way'),
    lineData('recovery', RECOVERY, 'Round trip — the ride home is already in the fare'),
    lineData('concierge', CONCIERGE, 'One way'),
    lineData('winnie', WINNIE, 'One way — your pet rides, you do not have to'),
  ];
  const wav = lineData(
    'wav',
    CARE_WAV,
    'Wheelchair rides on any line, in a ramp-equipped partner vehicle',
  );
  const modifiers: PriceModifier[] = [
    {
      label: 'Weekend',
      cents: SURCHARGES.weekend,
      amount: `+${dollars(SURCHARGES.weekend)}`,
      note: 'Saturday or Sunday. Charged once per trip.',
    },
    {
      label: 'After hours',
      cents: SURCHARGES.afterHours,
      amount: `+${dollars(SURCHARGES.afterHours)}`,
      note: 'Pickup before 6:00 AM or at/after 8:00 PM. Never charged on Tassy Concierge.',
    },
    {
      label: 'Holiday',
      cents: SURCHARGES.holiday,
      amount: `+${dollars(SURCHARGES.holiday)}`,
      note: 'Six major holidays. Charged instead of the weekend charge, never on top of it.',
    },
    {
      label: 'Extra passenger — Tassy Care',
      cents: CARE.perExtra,
      amount: `+${dollars(CARE.perExtra)}`,
      note: 'Each passenger beyond the first. The adult required to ride with a minor patient is not charged as an extra passenger. On Recovery and Concierge, companions ride at no charge.',
    },
    {
      label: 'Extra pet — Winnie Ride',
      cents: WINNIE.perExtra,
      amount: `+${dollars(WINNIE.perExtra)}`,
      note: 'Each pet beyond the first.',
    },
    {
      label: 'Tassy Escort — Recovery',
      cents: ESCORT_CENTS,
      amount: `+${dollars(ESCORT_CENTS)}`,
      note: 'A trained escort rides along and stays through the handoff.',
    },
  ];
  const floorCents = Math.min(...lines.map((l) => l.fromCents));
  return { lines, wav, modifiers, floorCents, floor: dollars(floorCents) };
}

/** The Care entry fare, formatted — for the booking form's side panel. */
export function careFrom(): string {
  return dollars(CARE.bands[0].cents);
}

/** One Winnie band's round-trip fare, formatted ("$106"). */
export function winnieRoundTrip(bandIndex: number): string {
  return dollars(roundTripCents(WINNIE, WINNIE.bands[bandIndex].cents));
}

/** A span of Winnie bands' round-trip fares ("$142–160"), the site's range style. */
export function winnieRoundTripRange(fromIndex: number, toIndex: number): string {
  const lo = roundTripCents(WINNIE, WINNIE.bands[fromIndex].cents);
  const hi = roundTripCents(WINNIE, WINNIE.bands[toIndex].cents);
  return `${dollars(lo)}–${dollars(hi).replace('$', '')}`;
}
