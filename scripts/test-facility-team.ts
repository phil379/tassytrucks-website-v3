import assert from 'node:assert/strict';
import {
  canManageTeam,
  canDisable,
  canChangeRole,
  statusWhenReenabled,
  parseEmails,
  roleLabel,
  statusLabel,
  type TeamMember,
} from '../lib/facility-team';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const m = (id: string, role: string, status = 'active'): TeamMember => ({
  id, email: `${id}@clinic.test`, fullName: null, role, status, lastSeenAt: null,
});

t('only an admin manages the team', () => {
  assert.equal(canManageTeam('admin'), true);
  assert.equal(canManageTeam('requester'), false);
  assert.equal(canManageTeam('billing'), false);
  assert.equal(canManageTeam(null), false);
});

t('you cannot turn off your own access', () => {
  const team = [m('a', 'admin'), m('b', 'admin')];
  const r = canDisable(team, 'a', 'a');
  assert.equal(r.ok, false);
});

t('the last admin cannot be turned off, even by another admin who is invited-only', () => {
  const team = [m('a', 'admin'), m('b', 'requester')];
  assert.equal(canDisable(team, 'b', 'a').ok, false);
});

t('an admin can be turned off when another live admin remains', () => {
  const team = [m('a', 'admin'), m('b', 'admin', 'invited')];
  assert.equal(canDisable(team, 'a', 'b').ok, true);
});

t('a disabled admin does not count as a live admin', () => {
  const team = [m('a', 'admin'), m('b', 'admin', 'disabled'), m('c', 'requester')];
  assert.equal(canDisable(team, 'c', 'a').ok, false);
});

t('turning off a teammate who is already off is allowed (idempotent)', () => {
  const team = [m('a', 'admin'), m('b', 'requester', 'disabled')];
  assert.equal(canDisable(team, 'a', 'b').ok, true);
});

t('an unknown id is refused', () => {
  assert.equal(canDisable([m('a', 'admin')], 'a', 'zzz').ok, false);
  assert.equal(canChangeRole([m('a', 'admin')], 'a', 'zzz', 'admin').ok, false);
});

t('role change: the last admin cannot be demoted, and nobody demotes themselves', () => {
  const solo = [m('a', 'admin'), m('b', 'requester')];
  assert.equal(canChangeRole(solo, 'a', 'a', 'requester').ok, false);
  const two = [m('a', 'admin'), m('b', 'admin')];
  assert.equal(canChangeRole(two, 'a', 'a', 'requester').ok, false); // self
  assert.equal(canChangeRole(two, 'a', 'b', 'requester').ok, true); // other admin remains
});

t('role change: promoting and no-ops are fine', () => {
  const team = [m('a', 'admin'), m('b', 'requester')];
  assert.equal(canChangeRole(team, 'a', 'b', 'admin').ok, true);
  assert.equal(canChangeRole(team, 'a', 'b', 'requester').ok, true);
});

t('re-enabling returns to active only if they ever signed in', () => {
  assert.equal(statusWhenReenabled('some-auth-id'), 'active');
  assert.equal(statusWhenReenabled(null), 'invited');
});

t('parseEmails splits on commas, semicolons, spaces and newlines, lowercases and de-duplicates', () => {
  const r = parseEmails('A@x.com, b@y.org;\nA@X.com  c@z.io');
  assert.deepEqual(r.valid, ['a@x.com', 'b@y.org', 'c@z.io']);
  assert.deepEqual(r.invalid, []);
});

t('parseEmails names the entries it cannot use', () => {
  const r = parseEmails('good@x.com, nope, @bad.com, also@bad');
  assert.deepEqual(r.valid, ['good@x.com']);
  assert.deepEqual(r.invalid, ['nope', '@bad.com', 'also@bad']);
});

t('labels read as the wizard words them', () => {
  assert.equal(roleLabel('admin'), 'Manages the account');
  assert.equal(roleLabel('requester'), 'Books rides');
  assert.equal(statusLabel('invited'), 'Invited');
  assert.equal(statusLabel('disabled'), 'Turned off');
});

console.log(`${n} passed`);
