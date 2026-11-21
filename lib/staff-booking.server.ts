import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseStaffMarker, STAFF_MARKER_MAX_AGE_SECONDS } from '@/lib/staff-booking';

/**
 * Server half of the staff booking marker (lib/staff-booking.ts carries the
 * design). Mirrors lib/ops-bridge.ts deliberately: HMAC-SHA256, a key derived
 * from the base secret under a purpose domain — so a signature made for the
 * ops bridge can never be replayed as a staff marker, or the reverse — and a
 * timestamp inside the signed string.
 *
 * THE SECRET. STAFF_BOOKING_SECRET when set; otherwise INTERNAL_NOTIFY_SECRET,
 * which is already configured in BOTH Vercel projects for the ops bridge, so
 * the exemption works with no new configuration. No secret configured means
 * no marker ever verifies: the exemption fails closed and every booking is
 * judged by the public rules.
 *
 * Signed string:  v1.<issued seconds>.staff-lead
 * Marker:         v1.<issued seconds>.<hex hmac-sha256>
 * The ops repo mints with the identical construction when it builds its
 * staff links; the two sides share the format, never code.
 */

const DOMAIN = 'tassy-staff-lead-v1';
const SIGNED_PURPOSE = 'staff-lead';
const FUTURE_TOLERANCE_SECONDS = 300;

function staffKeyMaterial(): string | null {
  return process.env.STAFF_BOOKING_SECRET || process.env.INTERNAL_NOTIFY_SECRET || null;
}

function derivedKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(DOMAIN).digest();
}

function mac(secret: string, issuedSeconds: number): Buffer {
  return createHmac('sha256', derivedKey(secret)).update(`v1.${issuedSeconds}.${SIGNED_PURPOSE}`).digest();
}

/** Mint a marker for a staff link. Null when no secret is configured. */
export function mintStaffMarker(nowSeconds: number = Math.floor(Date.now() / 1000)): string | null {
  const key = staffKeyMaterial();
  if (!key) return null;
  return `v1.${nowSeconds}.${mac(key, nowSeconds).toString('hex')}`;
}

/** Full verification: shape, window, and signature, in constant time. */
export function verifyStaffMarker(
  marker: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const key = staffKeyMaterial();
  if (!key) return false;
  const parsed = parseStaffMarker(marker);
  if (!parsed) return false;
  const ageSeconds = nowSeconds - parsed.issuedSeconds;
  if (ageSeconds < -FUTURE_TOLERANCE_SECONDS || ageSeconds > STAFF_MARKER_MAX_AGE_SECONDS) return false;
  const expected = mac(key, parsed.issuedSeconds);
  const given = Buffer.from(parsed.signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The route's gate, run on the raw body BEFORE the schema parses it: a
 * staffMarker that does not verify is deleted, so downstream the booking is
 * indistinguishable from a public one — 4-hour lead and all. A verified
 * marker is left in place for the schema's lead check to honour.
 */
export function sanitizeStaffMarker(raw: Record<string, unknown>): void {
  if (!('staffMarker' in raw)) return;
  const marker = typeof raw.staffMarker === 'string' ? raw.staffMarker : null;
  if (!verifyStaffMarker(marker)) delete raw.staffMarker;
}
