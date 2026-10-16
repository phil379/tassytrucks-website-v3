import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed server-to-server call from the TassyOps dispatch board to this site.
 *
 * The board already authenticates staff with their real ops login. This proves the request came
 * from the ops server, not from the internet. It reuses INTERNAL_NOTIFY_SECRET (already set in both
 * projects) but derives a separate key from it, so a signature made for one purpose can never be
 * replayed as the other.
 *
 * Signed string:  v1.<timestamp seconds>.<raw body>
 * Header:         x-tassy-ops-signature: t=<timestamp>,v1=<hex hmac-sha256>
 * Same code lives in the ops repo (src/lib/ops-bridge.ts); both carry the same test vector.
 */

export const BRIDGE_HEADER = 'x-tassy-ops-signature';
export const BRIDGE_MAX_AGE_SECONDS = 300;
const DOMAIN = 'tassy-ops-confirm-v1';

function derivedKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(DOMAIN).digest();
}

export function signBridgeBody(secret: string, body: string, nowSeconds: number): string {
  const mac = createHmac('sha256', derivedKey(secret))
    .update(`v1.${nowSeconds}.${body}`)
    .digest('hex');
  return `t=${nowSeconds},v1=${mac}`;
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'missing' | 'malformed' | 'expired' | 'bad_signature' };

export function verifyBridgeSignature(
  secret: string,
  body: string,
  header: string | null | undefined,
  nowSeconds: number,
  maxAgeSeconds: number = BRIDGE_MAX_AGE_SECONDS,
): VerifyResult {
  if (!header) return { ok: false, reason: 'missing' };
  const m = /^t=(\d{1,12}),v1=([0-9a-f]{64})$/.exec(header.trim());
  if (!m) return { ok: false, reason: 'malformed' };
  const ts = Number(m[1]);
  if (Math.abs(nowSeconds - ts) > maxAgeSeconds) return { ok: false, reason: 'expired' };
  const expected = createHmac('sha256', derivedKey(secret)).update(`v1.${ts}.${body}`).digest();
  const given = Buffer.from(m[2], 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad_signature' };
  }
  return { ok: true };
}
