'use server';

import { revalidatePath } from 'next/cache';
import { requireFacilitySession } from '@/lib/facility-auth';
import { facilityPatientSchema } from '@/lib/facility';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { FACILITY_PATIENTS_TABLE } from '@/lib/facility-console.server';

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Save a passenger profile.
 *
 * facility_id comes from the SESSION and is never accepted from the form — the
 * same rule as /api/trip-request. A facility id off a form body is one
 * coordinator writing into another facility's roster.
 */
export async function savePatient(input: unknown): Promise<ActionResult> {
  const session = await requireFacilitySession();

  const parsed = facilityPatientSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: 'Please check the form.', fieldErrors };
  }
  const d = parsed.data;

  const { error } = await supabaseAdmin()
    .from(FACILITY_PATIENTS_TABLE)
    .insert({
      facility_id: session.facilityId,
      display_name: d.displayName,
      mobility: d.mobility ?? null,
      facility_ref: d.facilityRef || null,
      access_notes: d.accessNotes || null,
    });

  if (error) {
    // The CHECK constraint that refuses an MRN-shaped reference surfaces here.
    // Say what to do about it rather than printing Postgres at a receptionist.
    if (error.message.includes('facility_patients_ref_not_mrn')) {
      return {
        ok: false,
        error: 'Please check the form.',
        fieldErrors: {
          facilityRef: 'Please use your own booking reference rather than a medical record number.',
        },
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/facility/patients');
  return { ok: true };
}

/** Archive rather than delete: trips reference the profile, and a coordinator
 *  tidying a list should not blank the name on last month's invoice. */
export async function archivePatient(id: string): Promise<ActionResult> {
  const session = await requireFacilitySession();

  const { error } = await supabaseAdmin()
    .from(FACILITY_PATIENTS_TABLE)
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    // Scoped to the session's facility, so an id guessed from elsewhere
    // matches nothing.
    .eq('facility_id', session.facilityId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/facility/patients');
  return { ok: true };
}
