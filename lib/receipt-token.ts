import { randomBytes } from 'crypto';
import type { supabaseAdmin } from '@/lib/supabase-admin';
import { TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';

/**
 * The private address of a trip's receipt: /r/<token>.
 *
 * The token is the only thing protecting the page, so it is random (18 bytes = 144 bits, 24 URL-safe
 * characters), never derived from the trip number, confirmation code or any other guessable value.
 * The page also refuses to show anything until Stripe has said the trip is paid.
 */

const TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;

export function generateReceiptToken(): string {
  return randomBytes(18).toString('base64url');
}

export function isValidReceiptToken(value: string): boolean {
  return TOKEN_RE.test(value);
}

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app').replace(/\/+$/, '');
}

export function receiptUrlFor(token: string): string {
  return `${siteBase()}/r/${token}`;
}

/** The address a customer is given to pay: /pay/<token>. Same private token as the receipt. */
export function payPageUrlFor(token: string): string {
  return `${siteBase()}/pay/${token}`;
}

export function brandLogoUrl(): string {
  return `${siteBase()}/brand/logo-master.png`;
}

/**
 * Make sure a trip has a receipt token and return it. Safe to call twice at once: the update only
 * lands on a row that has no token yet, and the row is re-read afterwards so both callers agree.
 * Best effort by design: returns null rather than throwing, because a missing receipt link must never
 * block a confirmation or undo a recorded payment.
 */
export async function ensureReceiptToken(
  db: ReturnType<typeof supabaseAdmin>,
  tripId: string,
  existing: string | null | undefined,
): Promise<string | null> {
  if (existing && isValidReceiptToken(existing)) return existing;
  try {
    await db
      .from(TRIP_REQUESTS_TABLE)
      .update({ receipt_token: generateReceiptToken() })
      .eq('id', tripId)
      .is('receipt_token', null);
    const { data } = await db
      .from(TRIP_REQUESTS_TABLE)
      .select('receipt_token')
      .eq('id', tripId)
      .maybeSingle();
    const token = (data as { receipt_token?: string | null } | null)?.receipt_token ?? null;
    return token && isValidReceiptToken(token) ? token : null;
  } catch (e) {
    console.error('[receipt] could not issue a receipt token:', (e as Error).message);
    return null;
  }
}
