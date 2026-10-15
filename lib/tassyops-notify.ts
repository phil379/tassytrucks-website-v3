/**
 * Tell TassyOps that dispatch just confirmed a booking (and sent the payment link), so it can send the
 * rider their text. This only reports WHAT happened. Whether a text actually goes out (consent, quiet
 * hours, opt-out, dedupe, dry-run mode) is decided inside TassyOps, in one place.
 *
 * Best effort by design: it never throws and never delays the confirmation for more than a few
 * seconds. The customer has already been emailed and the trip is already saved by the time this runs.
 * Needs two env vars; without them it logs once and does nothing:
 *   TASSYOPS_NOTIFY_URL     e.g. https://tassytrucksops.vercel.app/api/notify/trip-event
 *   INTERNAL_NOTIFY_SECRET  the same secret value set in the TassyOps project
 */
export async function pingTassyOpsConfirmed(tripId: string): Promise<void> {
  const url = process.env.TASSYOPS_NOTIFY_URL;
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!url || !secret) {
    console.warn('[tassyops-notify] TASSYOPS_NOTIFY_URL / INTERNAL_NOTIFY_SECRET not set; no text will be sent for this confirmation');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ tripId, event: 'confirmed' }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('[tassyops-notify] TassyOps answered', res.status);
  } catch (e) {
    console.error('[tassyops-notify] could not reach TassyOps:', (e as Error).message);
  }
}
