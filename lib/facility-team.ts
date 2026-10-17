/**
 * Facility team rules. Pure functions only: no process.env, no database. The
 * server actions in app/facility/team/actions.ts load the rows and call these,
 * so the rules that decide who may lock whom out are tested without a database.
 */

export type TeamRole = 'admin' | 'requester';
export type TeamStatus = 'invited' | 'active' | 'disabled';

export type TeamMember = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  lastSeenAt: string | null;
};

/** Only an admin ("Manages the account") may invite, disable or change roles. */
export function canManageTeam(role: string | null | undefined): boolean {
  return role === 'admin';
}

/** An admin who can still sign in: not disabled. Invited counts, they have a link coming. */
function liveAdmins(members: TeamMember[]): TeamMember[] {
  return members.filter((m) => m.role === 'admin' && m.status !== 'disabled');
}

export type RuleResult = { ok: true } | { ok: false; error: string };

/**
 * Whether `actorId` may disable `targetId`.
 *
 * Two lockouts are refused: disabling yourself (a stray click on the wrong row
 * should not end your own session), and disabling the last admin (an account
 * with nobody who can invite or reinstate anyone is a support call).
 */
export function canDisable(members: TeamMember[], actorId: string, targetId: string): RuleResult {
  const target = members.find((m) => m.id === targetId);
  if (!target) return { ok: false, error: 'That person is not on your team.' };
  if (actorId === targetId) return { ok: false, error: 'You cannot turn off your own access.' };
  if (target.status === 'disabled') return { ok: true };
  if (target.role === 'admin' && liveAdmins(members).length <= 1) {
    return { ok: false, error: 'Your account needs at least one person who manages it.' };
  }
  return { ok: true };
}

/** Same last-admin rule for demoting an admin to "Books rides". */
export function canChangeRole(
  members: TeamMember[],
  actorId: string,
  targetId: string,
  nextRole: TeamRole,
): RuleResult {
  const target = members.find((m) => m.id === targetId);
  if (!target) return { ok: false, error: 'That person is not on your team.' };
  if (target.role === nextRole) return { ok: true };
  if (target.role === 'admin' && nextRole !== 'admin') {
    if (actorId === targetId) return { ok: false, error: 'You cannot take away your own admin access.' };
    if (target.status !== 'disabled' && liveAdmins(members).length <= 1) {
      return { ok: false, error: 'Your account needs at least one person who manages it.' };
    }
  }
  return { ok: true };
}

/** The status a re-enabled person returns to: active if they ever signed in, otherwise invited. */
export function statusWhenReenabled(authUserId: string | null): TeamStatus {
  return authUserId ? 'active' : 'invited';
}

export type InviteOutcome =
  | { email: string; result: 'added' | 'resent'; emailed: boolean }
  | { email: string; result: 'skipped'; reason: string };

/**
 * Turn a pasted block of addresses ("a@x.com, b@y.com; c@z.com") into a clean,
 * de-duplicated list. Invalid entries come back separately so the form can name them.
 */
export function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    const e = piece.trim().toLowerCase();
    if (!e) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) valid.push(e);
    else invalid.push(piece.trim());
  }
  return { valid, invalid };
}

export function roleLabel(role: string): string {
  if (role === 'admin') return 'Manages the account';
  if (role === 'requester') return 'Books rides';
  if (role === 'billing') return 'Sees invoices only';
  return 'Books rides';
}

export function statusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'disabled') return 'Turned off';
  return 'Invited';
}
