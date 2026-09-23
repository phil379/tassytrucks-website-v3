import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Shared-password gate for /ops.
 *
 * This is deliberately not real auth — the brief says so. It keeps the queue off
 * the open internet; it does not identify who made a change. Two properties are
 * still worth getting right:
 *   1. the cookie stores an HMAC, never the password itself, so a leaked cookie
 *      does not hand over the password;
 *   2. the comparison is constant-time, so the gate does not leak the password
 *      one character at a time.
 * If /ops ever needs to answer "who changed this row", replace this file.
 */

export const OPS_COOKIE = 'ops_session';

function expectedToken(password: string): string {
  return createHmac('sha256', password).update('tassy-ops-queue-v1').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** True when the supplied password matches OPS_PASSWORD. */
export function passwordMatches(candidate: string): boolean {
  const actual = process.env.OPS_PASSWORD;
  if (!actual) return false;
  return safeEqual(expectedToken(candidate), expectedToken(actual));
}

/** The opaque value to store in the cookie once a password has been accepted. */
export function sessionToken(): string {
  const actual = process.env.OPS_PASSWORD;
  if (!actual) throw new Error('OPS_PASSWORD is not set');
  return expectedToken(actual);
}

/** True when the request carries a valid ops cookie. */
export function isOpsAuthed(): boolean {
  const actual = process.env.OPS_PASSWORD;
  if (!actual) return false;

  const cookie = cookies().get(OPS_COOKIE)?.value;
  if (!cookie) return false;

  return safeEqual(cookie, expectedToken(actual));
}
