/**
 * The bookings pause switch (Phil, 2026-11-20).
 *
 * One env flag — BOOKINGS_PAUSED=1 in this project's Vercel settings — pauses
 * NEW public bookings without a code change:
 *
 *   - the booking form's pages (/request, and the airport page that embeds
 *     the same form) show the notice below instead of the form;
 *   - POST /api/trip-request refuses a new public booking with the same
 *     sentence and a 503, before any rate budget is spent or a row written.
 *
 * Deliberately NOT paused, because a bad day is exactly when they matter:
 * /pay and the receipt pages for bookings that already exist, facility
 * bookings made under a facility session (a partner flow, refused separately
 * when the session is absent), the ops bridge routes, and every other page.
 *
 * Absent, or anything other than '1', is normal operation — the flag fails
 * OFF, so a typo can never close the shop by accident. Flipping it is an env
 * change plus a redeploy: a settings change, not a code change.
 */
export const BOOKINGS_PAUSED_MESSAGE =
  'Online booking is paused right now — please call (704) 941-8508 and we will book it for you.';

export function bookingsPaused(): boolean {
  return process.env.BOOKINGS_PAUSED === '1';
}
