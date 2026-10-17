import { NextResponse } from 'next/server';
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
