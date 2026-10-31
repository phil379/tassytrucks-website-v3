/**
 * Tassy Care WAV (wheelchair rides): the on/off switch and the one description of who runs them.
 *
 * Tassy owns no wheelchair van. These rides are run in ramp-equipped vehicles that belong to
 * partners in our partner network, so nothing on the site may say or imply otherwise: no
 * ownership wording about the vehicles, and no licensing, insurance or ADA claim for these rides
 * until the code and a bound policy back it. scripts/test-wav-copy.ts fails on those phrases.
 *
 * THE SWITCH. NEXT_PUBLIC_WAV_LIVE=true publishes the Tassy Care WAV card: the booking form prints
 * the real price and /pricing, the wheelchair page and the home page show the table. Anything else
 * (unset, "false", "0") is OFF, and wheelchair stays "priced on the call" everywhere. Phil turns it
 * on in the Vercel environment settings after the partner paperwork is in, then redeploys (the
 * value is read at build time for static pages). No code or env value is changed by a PR.
 *
 * Read at call time, not at import, so a test can flip it. No imports: lib/quote.ts depends on it.
 */
export function wavLive(): boolean {
  return process.env.NEXT_PUBLIC_WAV_LIVE === 'true';
}

/** The one description of how a wheelchair ride is run. Reuse it; do not paraphrase it. */
export const WAV_PARTNER_LINE =
  'Wheelchair rides are run in ramp-equipped vehicles from our partner network.';

/** What a wheelchair guest reads while the card is not published. */
export const WAV_ON_THE_CALL =
  'The price for a wheelchair ride is given by a dispatcher on the call or by email, not printed here.';
