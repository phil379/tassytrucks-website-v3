import { NextResponse } from 'next/server';
import { wavLive } from '@/lib/wav';
import { CARE, CARE_WAV, RECOVERY, TREATMENT_DAY, CONCIERGE, WINNIE, SURCHARGES, ESCORT_CENTS } from '@/lib/quote';

/**
 * The published price list as JSON, read straight from lib/quote.ts, so there is ONE price list.
 * TassyOps shows it read-only in Settings -> Pricing. These are the same prices anyone can see on
 * /pricing, so the route is public and read-only. Changing a price still happens in lib/quote.ts.
 */
export const dynamic = 'force-static';
export const revalidate = 300;

export function GET() {
  return NextResponse.json({
    cards: [CARE, CARE_WAV, RECOVERY, TREATMENT_DAY, CONCIERGE, WINNIE].map((c) => ({
      label: c.label,
      // False only for Tassy Care WAV while the switch in lib/wav.ts is off: the card is real but
      // the site does not print it, so a reader of this list should not show it to guests either.
      publishedOnSite: c === CARE_WAV ? wavLive() : true,
      bands: c.bands,
      waitIncludedMin: c.waitIncludedMin,
      waitOverageCents: c.waitOverage,
      perExtraCents: c.perExtra,
      returnFactor: c.returnFactor,
      returnFloorCents: c.returnFloor,
    })),
    surchargesCents: SURCHARGES,
    escortCents: ESCORT_CENTS,
  });
}
