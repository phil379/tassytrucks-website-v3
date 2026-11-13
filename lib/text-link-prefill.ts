/**
 * The `?when=YYYY-MM-DDTHH:mm` pickup-time prefill on the booking form, used by text-to-book reply
 * links. Client-safe (no server imports), so the form can call it.
 *
 * GATED (Phil, 2026-11-13): it applies ONLY when the server says text-to-book is on
 * (TEXT_TO_BOOK_MODE = dry_run or live) and passes `enabled = true`. With the mode off or unset,
 * a `?when=` in any URL is ignored and the form opens exactly as before.
 */
const WHEN_SHAPE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function prefillWhen(raw: string | null | undefined, enabled: boolean): string {
  if (!enabled) return '';
  return typeof raw === 'string' && WHEN_SHAPE.test(raw) ? raw : '';
}
