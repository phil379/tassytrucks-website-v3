/**
 * One printable concierge card: hotel name, QR code, one short line. NO PRICE: cards are printed
 * and handed out, and a printed number cannot follow a price change. A test renders this and fails
 * on any dollar amount.
 *
 * `qrSvg` is generated on the server (lib/qr.server.ts) from our own URL; it is our markup, not
 * user input, which is why it is injected as HTML.
 */
export default function HotelCard({ hotelName, qrSvg, line }: { hotelName: string; qrSvg: string; line: string }) {
  return (
    <div className="hotel-card" data-testid="hotel-card">
      <p className="hotel-card__brand">Tassy Concierge</p>
      <p className="hotel-card__hotel">{hotelName}</p>
      <div className="hotel-card__qr" aria-label="QR code to book an airport ride" role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="hotel-card__line">{line}</p>
    </div>
  );
}
