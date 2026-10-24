/**
 * Signed one-click unsubscribe links for marketing / outreach email.
 *
 * A link carries the address and an HMAC of it, so it cannot be forged for someone else's
 * address. The secret is UNSUBSCRIBE_SECRET (never printed or committed). With no secret
 * set, no link can be made, and therefore no marketing email can be sent.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

function mac(email: string, secret: string): string {
  return createHmac('sha256', secret).update(`unsubscribe:${email}`).digest('base64url').slice(0, 32);
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signUnsubscribe(email: string, secret = process.env.UNSUBSCRIBE_SECRET): string {
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set');
  const e = normaliseEmail(email);
  return `${b64(e)}.${mac(e, secret)}`;
}

/** The address a valid token was made for, or null. */
export function verifyUnsubscribe(token: string, secret = process.env.UNSUBSCRIBE_SECRET): string | null {
  if (!secret || typeof token !== 'string') return null;
  const [encoded, tag] = token.split('.');
  if (!encoded || !tag) return null;
  let email: string;
  try {
    email = normaliseEmail(unb64(encoded));
  } catch {
    return null;
  }
  const expected = Buffer.from(mac(email, secret));
  const given = Buffer.from(tag);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return email;
}

export function unsubscribeUrl(email: string, secret = process.env.UNSUBSCRIBE_SECRET): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tassytrucks.com').replace(/\/$/, '');
  return `${base}/unsubscribe?t=${signUnsubscribe(email, secret)}`;
}
