import { supabaseAdmin } from '@/lib/supabase-admin';
import { FACILITY_PATIENTS_TABLE } from '@/lib/facility-console.server';

/** Resolve `?patient=` to a profile, scoped to the session's facility. An id
 *  from another facility, or an archived one, resolves to null and the form
 *  simply opens blank. */
export async function patientForFacility(facilityId: string, id: string | undefined) {
  if (!id) return null;
  const { data } = await supabaseAdmin()
    .from(FACILITY_PATIENTS_TABLE)
    .select('id, display_name, mobility, species, breed, facility_ref')
    .eq('id', id)
    .eq('facility_id', facilityId)
    .is('archived_at', null)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    id: string; display_name: string; mobility: string | null;
    species: string | null; breed: string | null; facility_ref: string | null;
  };
  return {
    id: row.id,
    name: row.display_name,
    mobility: row.mobility,
    // Shown on the booking banner so a vet coordinator can see at a glance
    // they picked the right animal — two dogs on one account are often
    // "Max".
    breed: row.breed,
    ref: row.facility_ref,
  };
}
