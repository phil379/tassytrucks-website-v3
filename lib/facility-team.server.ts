import { supabaseAdmin } from '@/lib/supabase-admin';
import { FACILITY_USERS_TABLE, generateFacilityMagicLink } from '@/lib/facility.server';
import { sendRichEmail } from '@/lib/notifications';
import type { InviteOutcome, TeamMember, TeamRole } from '@/lib/facility-team';

/**
 * SERVER ONLY. Facility team reads and writes.
 *
 * Every call is scoped by a facility id taken from the SESSION, never from a
 * form. A row id supplied by the browser is always re-checked against that
 * facility id, so one clinic cannot touch another's team.
 */
if (typeof window !== 'undefined') {
  throw new Error('lib/facility-team.server.ts was imported in the browser.');
}

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  last_seen_at: string | null;
  auth_user_id: string | null;
};

export async function listTeam(facilityId: string): Promise<(TeamMember & { authUserId: string | null })[]> {
  const { data, error } = await supabaseAdmin()
    .from(FACILITY_USERS_TABLE)
    .select('id, email, full_name, role, status, last_seen_at, auth_user_id')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`team list: ${error.message}`);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    status: r.status,
    lastSeenAt: r.last_seen_at,
    authUserId: r.auth_user_id,
  }));
}

/** Who invited this user, or null for the person who created the account. */
export async function invitedByFor(facilityUserId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from(FACILITY_USERS_TABLE)
    .select('invited_by')
    .eq('id', facilityUserId)
    .maybeSingle();
  return (data as { invited_by: string | null } | null)?.invited_by ?? null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

/**
 * Email a fresh sign-in link to a teammate. Throws on failure so the caller can
 * report "added, but the email did not go" rather than pretend.
 *
 * The message carries no account details: it may be forwarded around a clinic.
 */
export async function sendTeamInvite(opts: { to: string; facilityName: string; invitedBy: string }): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const link = await generateFacilityMagicLink(opts.to, `${base}/facility/confirm`);
  const name = escapeHtml(opts.facilityName);
  const by = escapeHtml(opts.invitedBy);

  await sendRichEmail({
    to: opts.to,
    subject: `You have been added to ${opts.facilityName} on Tassy Transportation`,
    html: `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#13161B">
  <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#878D97;margin:0 0 6px">Tassy Transportation</p>
  <h1 style="font-size:22px;margin:0 0 16px">You have been added to ${name}</h1>
  <p style="line-height:1.6;margin:0 0 20px">${by} added you so you can request and track rides for ${name}. Use the button below to sign in. There is no password to remember.</p>
  <p style="margin:0 0 24px">
    <a href="${link}" style="display:inline-block;background:#C8A96A;color:#13161B;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Sign in</a>
  </p>
  <p style="line-height:1.6;color:#5F6773;font-size:13px;margin:0 0 8px">This link works once and expires. If it has, ask ${by} to send another from the Team page, or call dispatch.</p>
  <p style="line-height:1.6;color:#5F6773;font-size:13px;margin:0">Dispatch: (704) 941-8508</p>
</div>`.trim(),
    text: [
      `You have been added to ${opts.facilityName}`,
      '',
      `${opts.invitedBy} added you so you can request and track rides for ${opts.facilityName}.`,
      'Use the link below to sign in. There is no password to remember.',
      '',
      link,
      '',
      `This link works once and expires. If it has, ask ${opts.invitedBy} to send another from the Team page, or call dispatch on (704) 941-8508.`,
    ].join('\n'),
  });
}

/**
 * Invite people to one facility.
 *
 * facility_users has a unique index on lower(email), so one address belongs to
 * one facility. An address already used elsewhere is skipped with a plain
 * sentence rather than a 500 or a hint about whose account it is.
 */
export async function inviteToFacility(opts: {
  facilityId: string;
  facilityName: string;
  invitedBy: string;
  invites: { email: string; role: TeamRole }[];
}): Promise<InviteOutcome[]> {
  const db = supabaseAdmin();
  const out: InviteOutcome[] = [];

  for (const inv of opts.invites) {
    const email = inv.email.trim().toLowerCase();
    const { data: found, error: findErr } = await db
      .from(FACILITY_USERS_TABLE)
      .select('id, facility_id, status')
      .ilike('email', email)
      .maybeSingle();
    if (findErr) {
      out.push({ email, result: 'skipped', reason: 'Could not check this address. Try again.' });
      continue;
    }
    const existing = found as { id: string; facility_id: string; status: string } | null;

    let result: 'added' | 'resent';
    if (existing) {
      if (existing.facility_id !== opts.facilityId) {
        out.push({ email, result: 'skipped', reason: 'This address already has a Tassy account.' });
        continue;
      }
      if (existing.status === 'active') {
        out.push({ email, result: 'skipped', reason: 'Already on your team.' });
        continue;
      }
      if (existing.status === 'disabled') {
        out.push({ email, result: 'skipped', reason: 'Turned off. Use Turn on in the list below.' });
        continue;
      }
      result = 'resent';
    } else {
      const { error } = await db.from(FACILITY_USERS_TABLE).insert({
        facility_id: opts.facilityId,
        email,
        role: inv.role,
        status: 'invited',
        invited_by: opts.invitedBy,
      });
      if (error) {
        out.push({ email, result: 'skipped', reason: 'Could not add this address. Try again.' });
        continue;
      }
      result = 'added';
    }

    let emailed = false;
    try {
      await sendTeamInvite({ to: email, facilityName: opts.facilityName, invitedBy: opts.invitedBy });
      emailed = true;
    } catch (err) {
      console.error('[facility-team] invite email failed:', err instanceof Error ? err.message : err);
    }
    out.push({ email, result, emailed });
  }
  return out;
}

/**
 * Name, phone and email to prefill on the booking form for the signed-in
 * coordinator, so they are not retyped on every ride.
 *
 * The person who created the account falls back to the contact they gave in the
 * setup wizard; a teammate only ever gets what is on their own row. Any field
 * we do not have is an empty string, which leaves the input blank.
 */
export async function coordinatorContact(opts: {
  facilityUserId: string;
  facilityId: string;
  email: string;
}): Promise<{ firstName: string; lastName: string; phone: string; email: string }> {
  const db = supabaseAdmin();
  const { data: u } = await db
    .from(FACILITY_USERS_TABLE)
    .select('full_name, phone, invited_by')
    .eq('id', opts.facilityUserId)
    .maybeSingle();
  const user = u as { full_name: string | null; phone: string | null; invited_by: string | null } | null;

  let name = user?.full_name?.trim() || '';
  let phone = user?.phone?.trim() || '';
  if (!user?.invited_by && (!name || !phone)) {
    const { data: f } = await db
      .from('facilities')
      .select('primary_contact_name, primary_contact_phone, phone')
      .eq('id', opts.facilityId)
      .maybeSingle();
    const fac = f as { primary_contact_name: string | null; primary_contact_phone: string | null; phone: string | null } | null;
    if (!name) name = fac?.primary_contact_name?.trim() || '';
    if (!phone) phone = fac?.primary_contact_phone?.trim() || fac?.phone?.trim() || '';
  }
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
    phone,
    email: opts.email,
  };
}
