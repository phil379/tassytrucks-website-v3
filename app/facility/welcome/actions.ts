'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireFacilitySession } from '@/lib/facility-auth';
import {
  defaultServiceLineForKind,
  facilityBillingSchema,
  facilityProfileSchema,
} from '@/lib/facility';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { FACILITIES_TABLE, FACILITY_USERS_TABLE } from '@/lib/facility.server';

/**
 * The wizard's writes.
 *
 * Every one re-checks the session. A server action is a public HTTP endpoint —
 * rendering the wizard behind a magic link does not protect the actions behind
 * it, and each of these can change what a facility is billed.
 *
 * Reads and writes go through the service role because the four facility tables
 * have RLS on with no policies. The session proves WHO is asking; the service
 * role does the work, scoped to that session's own facility_id and never to an
 * id supplied by the caller.
 */

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** SCREEN 1 — about the facility. Kind also sets the default service line. */
export async function saveFacilityProfile(input: unknown): Promise<ActionResult> {
  const session = await requireFacilitySession();

  const parsed = facilityProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Please check the form.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  const { error } = await supabaseAdmin()
    .from(FACILITIES_TABLE)
    .update({
      kind: d.kind,
      address: d.address,
      address_place_id: d.addressPlaceId ?? null,
      phone: d.phone,
      website: d.website || null,
      primary_contact_name: d.primaryContactName,
      primary_contact_phone: d.primaryContactPhone || null,
      // The facility never picks service lines — its type sets the default and
      // booking offers all of them. A checkbox here would become a gate we had
      // to either enforce or ignore, and a second eligibility concept beside
      // the real one on the vehicle.
      service_lines: [defaultServiceLineForKind(d.kind)],
    })
    .eq('id', session.facilityId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/facility/welcome');
  return { ok: true };
}

/**
 * SCREEN 2 — invite teammates.
 *
 * Only two roles are offered. `billing` stays in the enum for an AP clerk but is
 * not surfaced until someone asks for it, and `approver` is deprecated — there
 * is no approval gate on a booking, so a role that implies one would be a lie.
 */
const inviteSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().trim().toLowerCase().email('Enter a valid work email'),
        role: z.enum(['requester', 'admin']),
      }),
    )
    .max(25, 'Add up to 25 people at a time'),
});

export async function inviteTeammates(input: unknown): Promise<ActionResult> {
  const session = await requireFacilitySession();

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Please check the invites.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const db = supabaseAdmin();
  const invites = parsed.data.invites.filter((i) => i.email !== session.email);
  if (invites.length === 0) {
    revalidatePath('/facility/welcome');
    return { ok: true };
  }

  // facility_users has a unique index on lower(email), so an address already in
  // use — here or at another facility — must not 500 the whole screen. Insert
  // one at a time and skip the ones already known.
  for (const invite of invites) {
    const existing = await db
      .from(FACILITY_USERS_TABLE)
      .select('id')
      .ilike('email', invite.email)
      .maybeSingle();

    if (existing.data) continue;

    const { error } = await db.from(FACILITY_USERS_TABLE).insert({
      facility_id: session.facilityId,
      email: invite.email,
      role: invite.role,
      status: 'invited',
      invited_by: session.email,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/facility/welcome');
  return { ok: true };
}

/**
 * SCREEN 3 — how you pay.
 *
 * The credit decision is real and stays manual: weekly invoicing is an account
 * we extend, so the facility lands on `pending` and Phil approves it. What is
 * NOT acceptable is a dead window where someone has finished onboarding and
 * cannot book. So `bookNowOnPassengerPays` stores patient_card — which
 * canBook() already allows while pending — and records what they actually asked
 * for in `requested_billing_mode`, so approval switches them over rather than
 * guessing.
 */
const billingWithBridgeSchema = z.intersection(
  facilityBillingSchema,
  z.object({ bookNowOnPassengerPays: z.boolean().default(false) }),
);

export async function saveFacilityBilling(input: unknown): Promise<ActionResult> {
  const session = await requireFacilitySession();

  const parsed = billingWithBridgeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Please check the form.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  const wantsWeekly = d.billingMode === 'invoice_weekly';
  const bridging = wantsWeekly && d.bookNowOnPassengerPays;

  const patch: Record<string, unknown> = {
    billing_mode: bridging ? 'patient_card' : d.billingMode,
    billing_contact_name: d.billingContactName || null,
    billing_email: d.billingEmail || null,
    po_required: d.poRequired,
  };

  // Without this the intent is lost: the row would say patient_card and nobody
  // would know to switch them on approval. A column, not a note — the approval
  // queue is `status='pending' and requested_billing_mode='invoice_weekly'`, and
  // a substring search of free text breaks the first time someone types a real
  // note. Only set when they bridged: weekly WITHOUT the bridge already reads
  // billing_mode='invoice_weekly' + status='pending', which says it on its own.
  if (bridging) patch.requested_billing_mode = 'invoice_weekly';

  // Passenger-pays needs no credit decision, so it opens immediately. Weekly
  // stays pending whether or not they bridge.
  if (d.billingMode === 'patient_card') patch.status = 'active';

  const { error } = await supabaseAdmin().from(FACILITIES_TABLE).update(patch).eq('id', session.facilityId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/facility/welcome');
  return { ok: true };
}
