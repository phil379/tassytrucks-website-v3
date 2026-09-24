import { randomInt } from 'crypto';

/**
 * Confirmation codes.
 *
 * A booking reference is read aloud down a phone line, by a caregiver standing
 * in a hospital corridor, to an operator who is driving. Everything here serves
 * that one moment.
 *
 * The request reference (`shortRef`, the first 8 characters of the row's uuid)
 * is NOT this. That is an internal handle for an unconfirmed enquiry. A
 * confirmation code is issued only when a price has been agreed and the trip is
 * actually booked, so the customer can tell the two apart — "we have your
 * request, ref 5eb742cc" is a very different sentence from "you're booked,
 * TT-4K7M2Q".
 */

/**
 * No 0/O, no 1/I/L, no 2/Z, no 5/S, no 8/B, no U (heard as "you").
 * What survives is a set where no two characters are confusable by ear or eye.
 */
const ALPHABET = '34679ACDEFGHJKMNPQRTVWXY';
const CODE_LENGTH = 6;

/** e.g. "TT-4K7M2Q". Uppercase, hyphen after the brand, never ambiguous. */
export function generateConfirmationCode(): string {
  let out = '';
  // randomInt, not Math.random: a guessable booking code lets a stranger look up
  // someone else's trip, which is their name, their address and their hospital.
  for (let i = 0; i < CODE_LENGTH; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return `TT-${out}`;
}

/** Accepts what a human types: lowercase, spaces, a missing hyphen. */
export function normalizeConfirmationCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('TT') ? cleaned.slice(2) : cleaned;
  return `TT-${body}`;
}

export function isValidConfirmationCode(raw: string): boolean {
  const m = /^TT-([A-Z0-9]{6})$/.exec(normalizeConfirmationCode(raw));
  if (!m) return false;
  return [...m[1]!].every((c) => ALPHABET.includes(c));
}

/**
 * Collisions are possible, so the column is UNIQUE and the caller retries.
 * 24^6 = 191 million codes; at 10,000 bookings the chance of any collision is
 * about 0.03%. Retrying three times makes it not worth thinking about again.
 */
export const CONFIRMATION_CODE_SPACE = ALPHABET.length ** CODE_LENGTH;
