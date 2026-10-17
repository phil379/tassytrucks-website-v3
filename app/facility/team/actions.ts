'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireFacilitySession } from '@/lib/facility-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { FACILITY_USERS_TABLE } from '@/lib/facility.server';
import { inviteToFacility, listTeam, sendTeamInvite } from '@/lib/facility-team.server';
import {
  canChangeRole,
  canDisable,
  canManageTeam,
  parseEmails,
  statusWhenReenabled,
  type InviteOutcome,
} from '@/lib/facility-team';

/**
 * The Team page's writes.
 *
 * A server action is a public HTTP endpoint, so every one re-checks the session
 * AND that the caller manages the account. The facility id always comes from
 * the session; the browser only ever supplies a row id, which is looked up
 * inside that facility's own team and refused if it is not there.
 */

export type TeamResult =
  | { ok: true; outcomes?: InviteOutcome[]; message?: string }
  | { ok: false; error: string };

const NOT_ADMIN = 'Only the person who manages the account can change the team.';

const inviteSchema = z.object({
  emails: z.string().max(4000),
  role: z.enum(['requester', 'admin']),
});

export async function inviteFromTeamPage(input: unknown): Promise<TeamResult> {
  const session = await requireFacilitySession();
  if (!canManageTeam(session.role)) return { ok: false, error: NOT_ADMIN };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Please check the form.' };

  const { valid, invalid } = parseEmails(parsed.data.emails);
  if (invalid.length > 0) {
    return { ok: false, error: `These do not look like email addresses: ${invalid.join(', ')}` };
  }
  if (valid.length === 0) return { ok: false, error: 'Enter at least one email address.' };
  if (valid.length > 25) return { ok: false, error: 'Add up to 25 people at a time.' };

  const outcomes = await inviteToFacility({
    facilityId: session.facilityId,
    facilityName: session.facility.name,
    invitedBy: session.email,
    invites: valid.map((email) => ({ email, role: parsed.data.role })),
  });
  revalidatePath('/facility/team');
  return { ok: true, outcomes };
}

const idSchema = z.string().uuid();

/** Resend the sign-in link to someone who has not signed in yet. */
export async function resendInvite(memberId: unknown): Promise<TeamResult> {
  const session = await requireFacilitySession();
  if (!canManageTeam(session.role)) return { ok: false, error: NOT_ADMIN };
  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: 'Unknown person.' };

  const team = await listTeam(session.facilityId);
  const target = team.find((m) => m.id === id.data);
  if (!target) return { ok: false, error: 'That person is not on your team.' };
  if (target.status !== 'invited') return { ok: false, error: 'Only people who have not signed in yet can be sent a new link.' };

  try {
    await sendTeamInvite({ to: target.email, facilityName: session.facility.name, invitedBy: session.email });
  } catch (err) {
    console.error('[facility-team] resend failed:', err instanceof Error ? err.message : err);
    return { ok: false, error: 'The email did not go. Try again in a minute, or call dispatch.' };
  }
  return { ok: true, message: `Sent a new link to ${target.email}.` };
}

export async function setMemberAccess(memberId: unknown, access: unknown): Promise<TeamResult> {
  const session = await requireFacilitySession();
  if (!canManageTeam(session.role)) return { ok: false, error: NOT_ADMIN };
  const id = idSchema.safeParse(memberId);
  const which = z.enum(['off', 'on']).safeParse(access);
  if (!id.success || !which.success) return { ok: false, error: 'Unknown request.' };

  const team = await listTeam(session.facilityId);
  const target = team.find((m) => m.id === id.data);
  if (!target) return { ok: false, error: 'That person is not on your team.' };

  let status: string;
  if (which.data === 'off') {
    const rule = canDisable(team, session.facilityUserId, target.id);
    if (!rule.ok) return rule;
    status = 'disabled';
  } else {
    status = statusWhenReenabled(target.authUserId);
  }

  const { error } = await supabaseAdmin()
    .from(FACILITY_USERS_TABLE)
    .update({ status })
    .eq('id', target.id)
    .eq('facility_id', session.facilityId);
  if (error) return { ok: false, error: 'Could not save that. Try again.' };

  revalidatePath('/facility/team');
  return { ok: true };
}

export async function setMemberRole(memberId: unknown, role: unknown): Promise<TeamResult> {
  const session = await requireFacilitySession();
  if (!canManageTeam(session.role)) return { ok: false, error: NOT_ADMIN };
  const id = idSchema.safeParse(memberId);
  const next = z.enum(['requester', 'admin']).safeParse(role);
  if (!id.success || !next.success) return { ok: false, error: 'Unknown request.' };

  const team = await listTeam(session.facilityId);
  const rule = canChangeRole(team, session.facilityUserId, id.data, next.data);
  if (!rule.ok) return rule;

  const { error } = await supabaseAdmin()
    .from(FACILITY_USERS_TABLE)
    .update({ role: next.data })
    .eq('id', id.data)
    .eq('facility_id', session.facilityId);
  if (error) return { ok: false, error: 'Could not save that. Try again.' };

  revalidatePath('/facility/team');
  return { ok: true };
}
