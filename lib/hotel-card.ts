import { hotelBySlug } from '@/lib/hotel-price';

/**
 * Hotel concierge QR cards and booking attribution.
 *
 * ATTRIBUTION ONLY. A slug says which hotel's card or link a guest came from. It is never a price
 * input: the price is decided on the server from the two addresses (lib/hotel-price.server.ts),
 * and nothing in this file is imported by the quote engine.
 */

/** HOTEL_QR_CARDS_ENABLED=true turns the card pages on. Anything else (unset, "1", "TRUE") is off. */
export function hotelCardsEnabled(): boolean {
  return process.env.HOTEL_QR_CARDS_ENABLED === 'true';
}

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app').replace(/\/+$/, '');
}

/** Where a card's QR code points. The slug is URL-encoded; an unknown slug has no card. */
export function cardTargetUrl(slug: string): string | null {
  const hotel = hotelBySlug(slug);
  if (!hotel) return null;
  return `${siteBase()}/airport?hotel=${encodeURIComponent(hotel.slug)}`;
}

/**
 * The slug to store on a booking as `trip_details.source_hotel_slug`, or null. Only a slug from
 * the hotel zone table is kept, normalised; anything else (a typo, a made-up value) is dropped
 * rather than stored, so the attribution report never shows a hotel that does not exist.
 */
export function attributionSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const hotel = hotelBySlug(raw);
  return hotel ? hotel.slug : null;
}

/** The one short line printed under the hotel name. No price, ever: a printed price cannot change. */
export const CARD_LINE = 'Scan to book a reserved ride to the airport.';
