/**
 * Wall-clock time for the Trip Request pipeline.
 *
 * `<input type="datetime-local">` submits a NAIVE string — `2026-09-26T15:00`,
 * no offset, no zone. `new Date(thatString)` then means two different instants
 * depending on where it runs:
 *
 *   in the customer's browser (Charlotte)  → 15:00 EDT = 19:00 UTC
 *   in a Vercel function (always UTC)      → 15:00 UTC = 11:00 EDT
 *
 * Four hours apart, and the pipeline used `new Date(...)` on both sides. The
 * damage was real on two fronts:
 *
 *   1. Storage. A request for 3:00 PM was written as 15:00Z. /ops renders in
 *      America/New_York, so the operator read it back as 11:00 AM and would
 *      have dispatched a driver four hours early.
 *   2. Validation. The 4-hour lead-time rule ran against the browser's reading
 *      on the client and the UTC reading on the server. For any same-day trip
 *      the server saw a time four hours earlier than the customer picked and
 *      rejected a form the browser had just accepted — an error the customer
 *      could not clear by changing anything.
 *
 * The company dispatches out of Charlotte. Every naive wall-clock string in
 * this pipeline is Charlotte time, on the client and on the server, and this
 * module is the only place that conversion happens.
 */

/** Charlotte, NC. Every naive datetime in this pipeline is in this zone. */
export const OPERATING_TIME_ZONE = 'America/New_York';

/** What `timeZone` was offset from UTC at the instant `utcMs`, in ms. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  // `hour12: false` renders midnight as 24 in some ICU versions.
  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );

  return asIfUtc - utcMs;
}

const NAIVE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Read a datetime-local string as Charlotte wall-clock time.
 *
 * A string that already carries a zone (`...Z`, `...-04:00`) is unambiguous and
 * is parsed as-is. Anything unparseable returns null — callers decide whether
 * that is a validation error or a pass-through.
 *
 * DST: the offset is resolved twice, because the offset that applies at the
 * naive time and the offset that applies at the true instant differ across a
 * transition. On the spring-forward gap (a wall-clock time that does not exist)
 * this lands on the instant immediately after the jump rather than throwing;
 * on the fall-back overlap it takes the first of the two, which is the earlier
 * pickup and therefore the safer one to dispatch against.
 */
export function parseLocalDateTime(
  value: string | null | undefined,
  timeZone: string = OPERATING_TIME_ZONE,
): Date | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const m = NAIVE.exec(trimmed);
  if (!m) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, y, mo, d, h, mi, s] = m;
  const naiveAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);

  const firstPass = zoneOffsetMs(naiveAsUtc, timeZone);
  let instant = naiveAsUtc - firstPass;

  const secondPass = zoneOffsetMs(instant, timeZone);
  if (secondPass !== firstPass) instant = naiveAsUtc - secondPass;

  return new Date(instant);
}

/** `parseLocalDateTime` as epoch ms, or NaN — a drop-in for `Date.parse`. */
export function parseLocalDateTimeMs(
  value: string | null | undefined,
  timeZone: string = OPERATING_TIME_ZONE,
): number {
  return parseLocalDateTime(value, timeZone)?.getTime() ?? Number.NaN;
}

/**
 * The inverse: an instant rendered as a `datetime-local` value in `timeZone`.
 * Used for the input's `min` attribute so the floor the customer sees is the
 * same floor the server enforces, wherever the customer's device is set.
 */
export function toLocalDateTimeInput(
  date: Date,
  timeZone: string = OPERATING_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = String(Number(get('hour')) % 24).padStart(2, '0');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}
