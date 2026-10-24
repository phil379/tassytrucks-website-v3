/**
 * Server-only: the reference number given to a privacy request (kept apart from
 * lib/privacy-requests.ts because that file is also imported by the browser form).
 */
import { randomBytes } from 'crypto';

/** PR-XXXXXXXX, no characters that are easy to misread on the phone. */
export function newReference(bytes: Buffer = randomBytes(8)): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `PR-${out}`;
}
