/**
 * The staff booking marker — how a booking entered by Tassy staff proves it
 * is staff-entered, and so earns the lead-time exemption below.
 *
 * THE PROBLEM. Staff take bookings on the phone and enter them through the
 * TassyOps "book a ride for a caller" links, which land on this site's public
 * form (utm_source=tassyops&utm_medium=staff). The public form enforces a
 * 4-hour minimum lead, so a dispatcher who has just agreed a pickup an hour
 * from now cannot enter it — the workaround was booking a later slot and
 * moving the pickup by hand in the database (proven live, 2026-11-20).
 *
 * Phil's ruling (2026-11-20): staff-originated bookings are exempt from the
 * 4-hour lead; the public keeps 4 hours.
 *
 * THE MARKER. A staff link carries one extra query parameter, `?staff=<v1.
 * issued-seconds>.<hex hmac-sha256>`, minted by the ops server when it builds
 * the link (lib/staff-booking.server.ts is the minting/verification half; the
 * ops repo carries the same five lines, the same arrangement as
 * lib/ops-bridge.ts). The signature is the whole point: utm parameters alone
 * are typed by whoever holds the keyboard, so they were never proof of
 * anything. A member of the public who adds `?staff=` by hand holds an
 * unsigned string, and an unsigned marker is worth exactly nothing:
 *
 *   - THIS module is client-safe and reads the marker's SHAPE only — format
 *     and expiry window. The schema and the form use it to relax the lead
 *     check for what looks like a staff session.
 *   - The route verifies the SIGNATURE server-side before parsing
 *     (sanitizeStaffMarker) and deletes an unverified marker, so the schema's
 *     shape check only ever sees a marker that has already been proven, or
 *     no marker at all. A forged, expired or secret-less marker is judged by
 *     the public rules, byte for byte.
 *
 * The window is 12 hours: a link minted when a dispatcher starts a shift is
 * still good at the end of it, and a leaked link dies the same day. The
 * marker names no trip and no person — it says only "a staff link, minted
 * recently" — so replay inside the window gains nothing beyond what holding
 * a staff link already gives.
 */

/** Query parameter the ops staff links carry the marker in. */
export const STAFF_MARKER_PARAM = 'staff';

/** How long a minted marker stays good, in seconds. Mirrored by the server half. */
export const STAFF_MARKER_MAX_AGE_SECONDS = 12 * 60 * 60;

/** Clock skew tolerated on a just-minted marker, in seconds (mirrors the ops bridge). */
const STAFF_MARKER_FUTURE_TOLERANCE_SECONDS = 300;

const MARKER_SHAPE = /^v1\.(\d{1,12})\.([0-9a-f]{64})$/;

export function parseStaffMarker(
  marker: string | null | undefined,
): { issuedSeconds: number; signature: string } | null {
  if (!marker) return null;
  const m = MARKER_SHAPE.exec(marker.trim());
  if (!m) return null;
  return { issuedSeconds: Number(m[1]), signature: m[2]! };
}

/**
 * Shape-only exemption check: well-formed AND inside its window. Used by the
 * shared schema (client courtesy + server parse) and by the form for its
 * picker floor and hint copy. NOT proof on its own — the route's signature
 * verification is what makes a marker real (see the header).
 */
export function staffLeadExemption(
  marker: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  const parsed = parseStaffMarker(marker);
  if (!parsed) return false;
  const ageSeconds = nowMs / 1000 - parsed.issuedSeconds;
  return ageSeconds >= -STAFF_MARKER_FUTURE_TOLERANCE_SECONDS && ageSeconds <= STAFF_MARKER_MAX_AGE_SECONDS;
}
