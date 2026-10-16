/**
 * Tell TassyOps that dispatch just confirmed a booking (and sent the payment link), so it can send the
 * rider their text. This only reports WHAT happened. Whether a text actually goes out (consent, quiet
 * hours, opt-out, dedupe, dry-run mode) is decided inside TassyOps, in one place.
 *
 * Returns true only if a text was actually sent, so the dispatcher is never told "texted" when it wasn't.
 * Best effort by design: it never throws and never delays the confirmation for more than a few
 * seconds. The customer has already been emailed and the trip is already saved by the time this runs.
 * Needs two env vars; without them it logs once and does nothing:
 *   TASSYOPS_NOTIFY_URL     e.g. https://tassytrucksops.vercel.app/api/notify/trip-event
 *   INTERNAL_NOTIFY_SECRET  the same secret value set in the TassyOps project
 */
export async function pingTassyOpsConfirmed(tripId: string): Promise<boolean> {
  const url = process.env.TASSYOPS_NOTIFY_URL;
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!url || !secret) {
    console.warn('[tassyops-notify] TASSYOPS_NOTIFY_URL / INTERNAL_NOTIFY_SECRET not set; no text will be sent for this confirmation');
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ tripId, event: 'confirmed' }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error('[tassyops-notify] TassyOps answered', res.status);
      return false;
    }
    // True only when TassyOps says a text really went out (not dry-run, off, or skipped for consent).
    const json = (await res.json().catch(() => null)) as { summary?: Record<string, number> } | null;
    return (json?.summary?.sent ?? 0) > 0;
  } catch (e) {
    console.error('[tassyops-notify] could not reach TassyOps:', (e as Error).message);
    return false;
  }
}
