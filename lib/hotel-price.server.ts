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

/**
 * When the zone's first hotel booking was made: the start of the intro's day window. Null when
 * there is none yet (the window has not started). Test rows are excluded; a cancelled first
 * booking still counts, which can only end the intro sooner, never later.
 *
 * Failure returns the epoch, so an unreachable database closes the intro (card price).
 */
export async function introFirstBookingAt(zone: HotelZoneId): Promise<string | null> {
  if (ZONE_INTROS[zone].introDays === null) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from(TRIP_REQUESTS_TABLE)
      .select('created_at')
      .eq('hotel_zone', zone)
      .eq('is_test_data', false)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) return new Date(0).toISOString();
    return data && data.length > 0 && typeof data[0].created_at === 'string' ? data[0].created_at : null;
  } catch {
    return new Date(0).toISOString();
  }
}

/** The hotel price for a trip, deciding the introductory state from the database. Null = not a hotel trip. */
export async function hotelQuoteServer(input: HotelQuoteInput): Promise<HotelQuote | null> {
  const trip = input.serviceLine === 'concierge' ? hotelTripFor(input.pickup, input.dropoff) : null;
  if (!trip) return null;
  const introOffered = ZONE_INTROS[trip.hotel.zone].introCents !== null;
  const used = introOffered ? await introRidesUsed(trip.hotel.zone) : 0;
  const first = introOffered ? await introFirstBookingAt(trip.hotel.zone) : null;
  return hotelQuote({ ...input, introRidesUsed: used, introFirstBookingAt: first });
}
