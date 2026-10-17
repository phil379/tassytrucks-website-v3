'use client';

import { useState, useTransition } from 'react';
import {
  inviteFromTeamPage,
  resendInvite,
  setMemberAccess,
  setMemberRole,
  type TeamResult,
} from '@/app/facility/team/actions';
import { roleLabel, statusLabel, type InviteOutcome, type TeamMember } from '@/lib/facility-team';

function when(iso: string | null): string {
  if (!iso) return 'Not yet';
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function outcomeLine(o: InviteOutcome): string {
  if (o.result === 'skipped') return `${o.email}: ${o.reason}`;
  if (!o.emailed) return `${o.email}: added, but the email did not go. Use Send new link in the list.`;
  return o.result === 'added' ? `${o.email}: added and emailed a sign-in link.` : `${o.email}: sent a new link.`;
}

export default function TeamPanel({
  members,
  meId,
  canManage,
}: {
  members: TeamMember[];
  meId: string;
  canManage: boolean;
}) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<'requester' | 'admin'>('requester');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; lines: string[] } | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<TeamResult>, after?: (r: TeamResult) => void) {
    start(async () => {
      const r = await fn();
      if (!r.ok) setNotice({ kind: 'error', lines: [r.error] });
      else if (r.message) setNotice({ kind: 'ok', lines: [r.message] });
      else if (!r.outcomes) setNotice(null);
      after?.(r);
    });
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    run(
      () => inviteFromTeamPage({ emails, role }),
      (r) => {
        if (r.ok && r.outcomes) {
          setNotice({ kind: 'ok', lines: r.outcomes.map(outcomeLine) });
          if (r.outcomes.every((o) => o.result !== 'skipped')) setEmails('');
        }
      },
    );
  }

  return (
    <div className="mt-7">
      {canManage ? (
        <form onSubmit={submitInvite} className="rounded-xl border border-[color:var(--line)] p-5">
          <h3 className="serif text-lg font-semibold">Add people</h3>
          <p className="ink-soft mt-1 text-sm">
            Paste one or more work emails. Each person gets a link to sign in.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
            <div>
              <label className="sr-only" htmlFor="team-emails">
                Work emails
              </label>
              <textarea
                id="team-emails"
                className="form-field min-h-[88px]"
                placeholder="nurse.manager@yourclinic.com, front.desk@yourclinic.com"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="team-role">
                What they can do
              </label>
              <select
                id="team-role"
                className="form-field"
                value={role}
                onChange={(e) => setRole(e.target.value as 'requester' | 'admin')}
              >
                <option value="requester">Books rides</option>
                <option value="admin">Manages the account</option>
              </select>
              <p className="ink-mute mt-2 text-xs">
                Managers can also add and remove people and see invoices.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="btn-primary min-h-[44px]" disabled={pending || emails.trim() === ''}>
              {pending ? 'Sending…' : 'Send sign-in links'}
            </button>
          </div>
        </form>
      ) : null}

      {notice ? (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            notice.kind === 'error' ? 'border-red-500/50' : 'border-[color:var(--line)]'
          }`}
        >
          {notice.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[color:var(--line)] text-left">
              <th scope="col" className="py-2 font-semibold">Person</th>
              <th scope="col" className="py-2 font-semibold">Can</th>
              <th scope="col" className="py-2 font-semibold">Status</th>
              <th scope="col" className="py-2 font-semibold">Last seen</th>
              {canManage ? <th scope="col" className="py-2 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const me = m.id === meId;
              const off = m.status === 'disabled';
              return (
                <tr key={m.id} className="border-b border-[color:var(--line)] last:border-0">
                  <td className="py-2.5">
                    <span className="font-medium">{m.fullName || m.email}</span>
                    {m.fullName ? <span className="ink-mute block text-xs">{m.email}</span> : null}
                    {me ? <span className="ink-mute block text-xs">You</span> : null}
                  </td>
                  <td className="py-2.5">
                    {canManage && !off ? (
                      <>
                        <label className="sr-only" htmlFor={`role-${m.id}`}>
                          What {m.email} can do
                        </label>
                        <select
                          id={`role-${m.id}`}
                          className="form-field !min-h-[36px] !py-1 text-sm"
                          value={m.role === 'admin' ? 'admin' : 'requester'}
                          disabled={pending}
                          onChange={(e) => run(() => setMemberRole(m.id, e.target.value))}
                        >
                          <option value="requester">Books rides</option>
                          <option value="admin">Manages the account</option>
                        </select>
                      </>
                    ) : (
                      roleLabel(m.role)
                    )}
                  </td>
                  <td className="py-2.5">{statusLabel(m.status)}</td>
                  <td className="ink-soft py-2.5">{when(m.lastSeenAt)}</td>
                  {canManage ? (
                    <td className="py-2.5 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {m.status === 'invited' ? (
                          <button
                            type="button"
                            className="btn-ghost min-h-[36px] px-3 text-xs"
                            disabled={pending}
                            onClick={() => run(() => resendInvite(m.id))}
                          >
                            Send new link
                          </button>
                        ) : null}
                        {!me ? (
                          <button
                            type="button"
                            className="btn-ghost min-h-[36px] px-3 text-xs"
                            disabled={pending}
                            onClick={() => run(() => setMemberAccess(m.id, off ? 'on' : 'off'))}
                          >
                            {off ? 'Turn on' : 'Turn off'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
