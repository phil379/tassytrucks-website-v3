import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Twilio webhook signature (X-Twilio-Signature), checked without the twilio package.
 *
 * Twilio signs a webhook POST like this:
 *   1. take the full public URL Twilio called, exactly as set in the console (scheme, host, path,
 *      query string);
 *   2. sort the POST parameters by name (plain code-point order) and append each name followed by
 *      its value, with no separators;
 *   3. HMAC-SHA1 that string with the account's Auth Token, then base64 it.
 *
 * SERVER ONLY: it needs the Auth Token.
 */

export type FormParams = ReadonlyArray<readonly [string, string]>;

/** The signature Twilio would send for this URL and these POST params. */
export function twilioSignature(authToken: string, url: string, params: FormParams): string {
  const sorted = [...params].sort(([ak, av], [bk, bv]) =>
    ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0,
  );
  let data = url;
  for (const [k, v] of sorted) data += k + v;
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
}

/**
 * True only when a token is set, a signature header is present, and it matches. Constant-time
 * compare. Every other case is false: a missing token REFUSES every request rather than accepting
 * them unsigned.
 */
export function validTwilioSignature(
  authToken: string | null | undefined,
  url: string,
  params: FormParams,
  header: string | null | undefined,
): boolean {
  if (!authToken || !header) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params), 'utf8');
  const given = Buffer.from(header.trim(), 'utf8');
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

/** The application/x-www-form-urlencoded body as ordered [name, value] pairs. */
export function parseFormBody(raw: string): Array<[string, string]> {
  return [...new URLSearchParams(raw).entries()];
}
