/**
 * Colors of the three small label groups on the hero day map (components/CharlotteDayMap.tsx):
 * the hour ticks ("4 AM", "4 PM", "8 PM"), the place line ("Airport · golf · top addresses")
 * and the hours line ("4–8 AM · eve").
 *
 * They measured 2.2 to 3.6:1 against the card, under the 4.5:1 WCAG AA needs for small text.
 * Each is now the SAME hue and saturation as before, just lighter (the card is dark, so lighter is
 * what adds contrast), by the least that clears 4.5:1 on the worst background with a little room.
 * The test in scripts/test-day-map-contrast.ts computes the ratio, so a later edit cannot undo it.
 *
 *   ticks  #4B535E -> #7A8595
 *   place  #5A626D -> #7B8592
 *   hours  #6B7380 -> #7C8592
 */
export const DAY_MAP_BG = {
  /** Top of the card's gradient: the LIGHTER end, so the harder one for light text. */
  cardTop: '#181C22',
  cardBottom: '#13161B',
  /** The legend cell behind "where" and "when": normal, and highlighted while its line is running. */
  legendCell: '#13161B',
  legendCellOn: '#181C22',
} as const;

export const DAY_MAP_LABEL = {
  ticks: '#7A8595',
  where: '#7B8592',
  when: '#7C8592',
} as const;
