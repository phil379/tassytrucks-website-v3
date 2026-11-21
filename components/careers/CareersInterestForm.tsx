'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  CAREERS_INTEREST_CONFIRMATION_BODY,
  CAREERS_INTEREST_CONFIRMATION_TITLE,
  CAREERS_ROLES,
  type CareersRole,
} from '@/lib/careers-interest';

const field =
  'w-full rounded-lg border border-[color:var(--line)] bg-[#0f141a] px-3 py-3 text-base text-[color:var(--ink)] outline-none focus-visible:outline-3 focus-visible:outline-[color:var(--gold-warm)]';
const label = 'block text-sm font-medium mb-1.5';
const err = 'mt-1.5 text-sm text-[#f87171]';

/**
 * The Careers interest list — the only form on /careers while applications
 * are closed (lib/careers-gate.ts).
 *
 * Collects a lead. It does not start an application, and nothing on this
 * screen may suggest it does: no application language, no promised job,
 * interview or start date.
 *
 * Success is a real id from the server and nothing else. A null id (the
 * bot filter's answer), an error payload or a network failure all stay on
 * the form — same contract as the Winnie join list.
 */
export default function CareersInterestForm() {
  const [startedAt] = useState(() => Date.now());
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<CareersRole>('driver');
  const [hp, setHp] = useState('');

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [doneId, setDoneId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/careers-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          hp_token: hp,
          elapsedMs: Date.now() - startedAt,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || typeof json?.id !== 'string' || json.id.length === 0) {
        if (json?.fieldErrors) setFieldErrors(json.fieldErrors as Record<string, string>);
        setFormError(
          json?.error ?? 'We could not save your place on the list. Please call (704) 941-8508.',
        );
        return;
      }
      setDoneId(json.id);
    } catch {
      setFormError('We could not reach the server, and your place on the list was not saved. Please call (704) 941-8508.');
    } finally {
      setBusy(false);
    }
  }

  if (doneId) {
    return (
      <div className="card-tile p-6 sm:p-8" role="status" data-testid="careers-interest-confirmation">
        <h2 className="serif text-2xl font-semibold">{CAREERS_INTEREST_CONFIRMATION_TITLE}</h2>
        <p className="mt-3 text-sm text-[color:var(--ink-soft)]">{CAREERS_INTEREST_CONFIRMATION_BODY}</p>
        <div className="mt-8">
          <Link href="/careers" className="btn-primary inline-flex min-h-[44px] items-center">
            Back to Careers
          </Link>
        </div>
      </div>
    );
  }

  const fe = (k: string) => (fieldErrors[k] ? <p className={err}>{fieldErrors[k]}</p> : null);

  return (
    <form onSubmit={onSubmit} className="card-tile space-y-8 p-6 sm:p-8" noValidate data-testid="careers-interest-form">
      {formError && (
        <p role="alert" className="rounded-lg border border-[#f87171] px-3 py-2.5 text-sm text-[#f87171]">
          {formError}
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="serif mb-1 text-lg font-semibold">About you</legend>
        <div>
          <label className={label} htmlFor="ci-name">Full name</label>
          <input id="ci-name" className={field} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          {fe('full_name')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ci-email">Email</label>
            <input id="ci-email" type="email" className={field} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fe('email')}
          </div>
          <div>
            <label className={label} htmlFor="ci-phone">Phone <span className="opacity-60">(optional)</span></label>
            <input id="ci-phone" type="tel" className={field} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {fe('phone')}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="ci-role">Role you are interested in</label>
          <select id="ci-role" className={field} value={role} onChange={(e) => setRole(e.target.value as CareersRole)}>
            {CAREERS_ROLES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          {fe('role')}
        </div>
      </fieldset>

      {/* Honeypot. Named hp_token, never an autofill category. Off-screen, not display:none. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="ci-hp">Leave this empty</label>
        <input id="ci-hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      <p className="text-xs text-[color:var(--ink-mute)]">
        Joining the list is how you ask us to contact you when applications open — that is the
        only thing we will use what you enter for. See our{' '}
        <a href="/privacy" className="inline-flex min-h-[44px] items-center underline">Privacy Policy</a>{' '}
        and{' '}
        <a href="/terms" className="inline-flex min-h-[44px] items-center underline">Terms</a>.
      </p>

      <div className="flex items-center justify-between gap-3">
        <Link href="/careers" className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]">
          Back to Careers
        </Link>
        <button type="submit" disabled={busy} className="btn-primary min-h-[44px] disabled:opacity-40">
          {busy ? 'Joining…' : 'Join the list'}
        </button>
      </div>
      <p className="text-xs text-[color:var(--ink-mute)]">
        This is an interest list, not an application. Joining does not start an application or
        promise a job, an interview or a start date.
      </p>
    </form>
  );
}
