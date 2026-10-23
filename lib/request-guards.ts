/**
 * Cheap guards for the public JSON endpoints, kept in one place so the route and its test agree.
 */

/**
 * The largest request body /api/trip-request will read, in characters. A real booking is a few
 * kilobytes (the longest free-text fields are capped at 500 characters each); this leaves room for
 * every optional block and still refuses a megabyte of padding before it is parsed or stored.
 */
export const MAX_REQUEST_BODY_CHARS = 64 * 1024;

/**
 * True when any string anywhere in the parsed body holds a NUL character. Postgres refuses a NUL
 * in text, so the insert failed and the customer was told "we could not save your request" (a 500)
 * for something only a hand-built request can contain. It is rejected up front as a plain 400.
 */
export function containsNul(value: unknown, depth = 0): boolean {
  if (typeof value === 'string') return value.includes('\u0000');
  if (depth > 12 || value === null || typeof value !== 'object') return false;
  const items = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  return items.some((v) => containsNul(v, depth + 1));
}
