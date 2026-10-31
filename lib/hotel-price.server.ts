import { hotelQuote, hotelTripFor, type HotelQuote, type HotelQuoteInput } from '@/lib/hotel-price';
import { ZONE_INTROS, type HotelZoneId } from '@/lib/hotel-zones';
import { supabaseAdmin, TRIP_REQUESTS_TABLE } from '@/lib/supabase-admin';

/**
 * Bookings already taken at the zone's introductory price.
 *
 * Counts hotel bookings in the zone that were not cancelled or a no-show, test rows excluded.
 * The spec says "completed" rides; this repo cannot see completion reliably, so it counts bookings,
 * which ends the intro no later than 20 completed rides would. Conservative for margin.
 *
 * Failure returns the cap, so an unreachable database closes the intro (card price) rather than
 * leaving it open.
 */
export async function introRidesUsed(zone: HotelZoneId): Promise<number> {
  const cap = ZONE_INTROS[zone].introMaxRides;
  if (cap === null) return 0;
  try {
    const { count, error } = await supabaseAdmin()
      .from(TRIP_REQUESTS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('hotel_zone', zone)
      .eq('hotel_intro', true)
      .eq('is_test_data', false)
      .not('status', 'in', '("cancelled","no_show")');
    if (error || count === null) return cap;
    return count;
  } catch {
    return cap;
  }
}

/** The hotel price for a trip, deciding the introductory state from the database. Null = not a hotel trip. */
export async function hotelQuoteServer(input: HotelQuoteInput): Promise<HotelQuote | null> {
  const trip = input.serviceLine === 'concierge' ? hotelTripFor(input.pickup, input.dropoff) : null;
  if (!trip) return null;
  const used = ZONE_INTROS[trip.hotel.zone].introCents === null ? 0 : await introRidesUsed(trip.hotel.zone);
  return hotelQuote({ ...input, introRidesUsed: used });
}
