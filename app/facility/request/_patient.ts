import { supabaseAdmin } from '@/lib/supabase-admin';
import { FACILITY_PATIENTS_TABLE } from '@/lib/facility-console.server';

/** Resolve `?patient=` to a profile, scoped to the session's facility. An id
 *  from another facility, or an archived one, resolves to null and the form
 *  simply opens blank. */
export async function patientForFacility(facilityId: string, id: string | undefined) {
  if (!id) return null;
  const { data } = await supabaseAdmin()
    .from(FACILITY_PATIENTS_TABLE)
    .select('id, display_name, mobility, facility_ref')
    .eq('id', id)
    .eq('facility_id', facilityId)
    .is('archived_at', null)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; display_name: string; mobility: string | null; facility_ref: string | null };
  return { id: row.id, name: row.display_name, mobility: row.mobility, ref: row.facility_ref };
}
