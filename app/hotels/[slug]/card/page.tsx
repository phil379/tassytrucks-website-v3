import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HotelCard from '@/components/hotels/HotelCard';
import { hotelBySlug } from '@/lib/hotel-price';
import { CARD_LINE, cardTargetUrl, hotelCardsEnabled } from '@/lib/hotel-card';
import { qrSvg } from '@/lib/qr.server';

/**
 * /hotels/<slug>/card — a printable concierge card for one hotel.
 *
 * On screen: one card. Printed: four identical cards on one US Letter sheet (2 x 2), to cut.
 * The QR points to /airport?hotel=<slug>. No price is printed (see components/hotels/HotelCard).
 * Off unless HOTEL_QR_CARDS_ENABLED=true. Not indexed.
 */
export const metadata: Metadata = {
  title: 'Hotel concierge card',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const PRINT_CSS = `
.hotel-sheet { display: grid; grid-template-columns: 1fr; gap: 24px; justify-items: center; padding: 24px; }
.hotel-sheet .hotel-card ~ .hotel-card { display: none; }
.hotel-card { width: 3.5in; height: 4.25in; box-sizing: border-box; border: 1px dashed #C9C2B2; border-radius: 12px; background: #fff;
  padding: 0.3in; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #1B1A17;
  font-family: Georgia, 'Times New Roman', serif; }
.hotel-card__brand { font-size: 11pt; letter-spacing: 0.12em; text-transform: uppercase; color: #8A6E2F; margin: 0; }
.hotel-card__hotel { font-size: 15pt; margin: 6px 0 14px; }
.hotel-card__qr { width: 2.1in; height: 2.1in; }
.hotel-card__qr svg { width: 100%; height: 100%; display: block; }
.hotel-card__line { font-size: 11pt; margin: 14px 0 0; }
.print-note { font: 14px/1.4 system-ui, sans-serif; color: #6B6455; text-align: center; }
@media print {
  @page { size: letter; margin: 0.4in; }
  header, footer, nav, .print-note { display: none !important; }
  body { background: #fff !important; }
  .hotel-sheet { grid-template-columns: 1fr 1fr; gap: 0.3in; padding: 0; }
  .hotel-sheet .hotel-card ~ .hotel-card { display: flex; }
  .hotel-card { break-inside: avoid; }
}
`;

export default async function HotelCardPage({ params }: { params: { slug: string } }) {
  if (!hotelCardsEnabled()) notFound();
  const hotel = hotelBySlug(params.slug);
  const target = cardTargetUrl(params.slug);
  if (!hotel || !target) notFound();
  const svg = await qrSvg(target);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <p className="print-note">Print this page: you get four cards on one sheet, ready to cut.</p>
      <div className="hotel-sheet">
        {[0, 1, 2, 3].map((i) => (
          <HotelCard key={i} hotelName={hotel.label} qrSvg={svg} line={CARD_LINE} />
        ))}
      </div>
    </div>
  );
}
