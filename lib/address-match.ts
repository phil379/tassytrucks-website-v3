/**
 * Deciding whether an address a visitor TYPED is one of Google's suggestions (Muse item 24,
 * 2026-11-13). Pure, so the rule has unit tests instead of living inside a component.
 *
 * The first version of this rule demanded the city inside the typed text. "2513 Pruitt St" on
 * its own could therefore never match, and the rider saw "pick your address" for an address
 * they had typed correctly. The rule now is:
 *
 *   - the suggestion is a street address (starts with a number) and the typed text starts with it;
 *   - if a city was typed, it must be that suggestion's city;
 *   - if no city was typed, take the Charlotte match - or the only North Carolina match there is.
 *
 * A partial ("Pruitt St", "2513 Pru", "Charlotte") still matches nothing, and the form says so
 * in words. Nothing is ever guessed from a fragment.
 */

export type MatchCandidate = { mainText: string; secondaryText: string };

/** "Street" and "St", "North" and "N": the same word to a rider, and to this rule. */
const WORDS: Record<string, string> = {
  street: 'st', avenue: 'ave', av: 'ave', road: 'rd', drive: 'dr', boulevard: 'blvd', lane: 'ln',
  court: 'ct', place: 'pl', circle: 'cir', parkway: 'pkwy', highway: 'hwy', terrace: 'ter',
  trail: 'trl', north: 'n', south: 's', east: 'e', west: 'w',
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => WORDS[w] ?? w)
    .join('');

/** "Apt 200", "Unit 4B", "Suite 12", "#3" typed inside the address box. */
const UNIT = /[\s,]+(?:(?:apt|apartment|unit|suite|ste)\.?\s*#?\s*|#\s*)([a-z0-9-]{1,8})\b/i;

/** The street part Google can match, and the unit that goes in its own box. */
export function splitUnit(typed: string): { street: string; unit: string } {
  const m = UNIT.exec(typed);
  if (!m) return { street: typed.trim(), unit: '' };
  const street = (typed.slice(0, m.index) + typed.slice(m.index + m[0].length)).replace(/\s+,/g, ',').trim();
  return { street, unit: m[0].replace(/^[\s,]+/, '').trim() };
}

/** Index of the suggestion that IS the typed address, or -1. */
export function pickTypedMatch(typed: string, candidates: MatchCandidate[]): number {
  const t = norm(splitUnit(typed).street);
  if (!t) return -1;

  const based: { i: number; city: string; rest: string; nc: boolean }[] = [];
  candidates.forEach((c, i) => {
    const main = norm(c.mainText);
    if (!/^\d/.test(c.mainText.trim()) || main.length < 5 || !t.startsWith(main)) return;
    based.push({
      i,
      city: norm(c.secondaryText.split(',')[0] ?? ''),
      rest: t.slice(main.length),
      nc: /\bNC\b/.test(c.secondaryText),
    });
  });

  // The city was typed: it has to be this suggestion's city.
  const withCity = based.find((b) => b.city.length > 0 && b.rest.includes(b.city));
  if (withCity) return withCity.i;

  // No city typed. Only a bare street address qualifies, optionally with "NC" and a ZIP.
  const bare = based.filter((b) => /^(nc)?(\d{5})?$/.test(b.rest));
  const charlotte = bare.find((b) => b.city === 'charlotte');
  if (charlotte) return charlotte.i;
  const inState = bare.filter((b) => b.nc);
  return inState.length === 1 ? inState[0]!.i : -1;
}

/**
 * Whether the "tap your address in the list" line belongs under an address
 * field (Muse item 25, completed 2026-11-16). Pure, for the same reason as
 * the match rule above.
 *
 * The line used to depend on how many suggestions happened to come back: it
 * showed after a failed blur match, or while at least one suggestion was
 * still loaded. That left typed, unpicked text with no instruction exactly
 * when the rider needed it most — a vague "Charlotte" whose loaded list had
 * been replaced by the blur lookup, or a fragment Google answers with no
 * suggestions at all. The form then sits unpriced and reads as broken.
 *
 * The rule now asks only what matters: suggestions are working, the visitor
 * typed a query long enough to search (or left the field unmatched), and
 * nothing is picked. How many suggestions came back is not the question.
 * While the list itself is open, the same instruction rides on top of it
 * instead (TAP_HINT_OPEN in the component), so this returns false then.
 */
export function shouldShowPickHint(input: {
  listOpen: boolean;
  hasResolved: boolean;
  suggestionsReady: boolean;
  needsPick: boolean;
  typed: boolean;
  text: string;
  minQueryLength: number;
}): boolean {
  if (input.listOpen || input.hasResolved || !input.suggestionsReady) return false;
  if (input.needsPick) return true;
  return input.typed && input.text.trim().length >= input.minQueryLength;
}
