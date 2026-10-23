/**
 * Which suggestions to show for what has been typed in the breed field.
 *
 * A word-start match, not a plain prefix: "bull" finds "French Bulldog" and "Bull
 * Terrier", "pit" finds "American Pit Bull Terrier". Every typed word has to start
 * some word of the breed, so "french b" narrows to "French Bulldog" and ignores
 * "French Spaniel". Names that START with the typed text come first, because that
 * is what the person is most likely typing; the list's own order (mixed-breed
 * catchalls on top, then A to Z) is kept inside each group.
 *
 * Pure, with no React and no DOM, so scripts/test-breed-match.ts can pin it.
 */

/** Cap on rows shown. One letter matches a few hundred breeds; nobody scrolls that. */
export const MAX_BREED_SUGGESTIONS = 50;

/** Lower case, accents folded, everything that is not a letter or digit treated as a gap. */
function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function matchBreeds(
  query: string,
  breeds: readonly string[],
  limit: number = MAX_BREED_SUGGESTIONS,
): string[] {
  const typed = words(query);
  if (typed.length === 0) return [];

  const starts: string[] = [];
  const inside: string[] = [];
  for (const breed of breeds) {
    const name = words(breed);
    const hit = typed.every((t) => name.some((w) => w.startsWith(t)));
    if (!hit) continue;
    // "Starts with the typed text" = the first breed word starts with the first typed
    // word, so typing "bull" puts "Bull Terrier" and "Bulldog" ahead of "French Bulldog".
    (name[0].startsWith(typed[0]) ? starts : inside).push(breed);
  }
  return [...starts, ...inside].slice(0, limit);
}
