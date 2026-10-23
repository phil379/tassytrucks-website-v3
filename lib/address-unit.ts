/**
 * Apartment / unit / suite, kept OUT of the address text.
 *
 * "1220 Tourmaline Rd, Apt 1910" is two things: a building, which a map can find, and a
 * door inside it, which only the driver needs. Typed into one box they fight: the
 * suggestion list matches on the whole string, nothing matches, the visitor gives up
 * and types the address by hand, and a typed address has no coordinates and so no price.
 * So the form asks for the unit in its own field, and the address field is left
 * to be picked from the suggestions.
 *
 * The matching and the price use the address WITHOUT the unit. What is stored and sent
 * to dispatch is the address WITH it, because the driver has to find the door.
 */

export const UNIT_MAX = 40;

/** Already says what it is ("Apt 4B", "Unit 12", "Suite 300", "#7", "Floor 2"). */
const NAMED = /^(apt|apartment|unit|ste|suite|bldg|building|fl|floor|rm|room|lot)\b/i;

/**
 * Tidies what was typed into the unit field. "1910" becomes "Unit 1910"; "Apt 1910",
 * "#1910" and "Suite 300" are left as written. Null when nothing was typed.
 */
export function normalizeUnit(raw: string | null | undefined): string | null {
  const cleaned = String(raw ?? '')
    .replace(/[,\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, UNIT_MAX);
  if (!cleaned) return null;
  return cleaned.startsWith('#') || NAMED.test(cleaned) ? cleaned : `Unit ${cleaned}`;
}

/** The address as dispatch should read it: the picked address, then the door. */
export function withUnit(address: string, unit: string | null | undefined): string {
  const u = normalizeUnit(unit);
  return u ? `${address}, ${u}` : address;
}
