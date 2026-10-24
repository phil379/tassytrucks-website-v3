'use client';

import { useState } from 'react';
import { REQUEST_TYPES } from '@/lib/privacy-requests';

const field =
  'w-full rounded-lg border border-[color:var(--ink-soft)] bg-[#0f141a] px-3 py-3 text-base text-[color:var(--ink)]';
const label = 'block text-sm font-medium mb-1.5';
const err = 'mt-1.5 text-sm text-[#f87171]';

/**
 * Ask to see, correct or delete your information, or to stop messages. Nothing is deleted or
 * changed by this form: a person reads the request, checks it is really from the data subject,
 * and acts by hand. Success is a reference number from the server and nothing else.
 */
export default function PrivacyRequestForm({ responseDays }: { responseDays: number }) {
  const [startedAt] = useState(() => Date.now());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requestType, setRequestType] = useState('');
  const [details, setDetails] = useState('');
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ reference: string; receiptEmailed: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/privacy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, requestType, details, hp_token: hp, elapsedMs: Date.now() - startedAt }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setFieldErrors(json?.fieldErrors ?? {});
        setFormError(json?.error ?? 'We could not send your request. Please email book@tassytrucks.com or call (704) 941-8508.');
        return;
      }
      if (typeof json.reference !== 'string' || !json.reference) {
        setFormError('We could not send your request. Please email book@tassytrucks.com or call (704) 941-8508.');
        return;
      }
      setDone({ reference: json.reference, receiptEmailed: Boolean(json.receiptEmailed) });
    } catch {
      setFormError('We could not reach the server. Please email book@tassytrucks.com or call (704) 941-8508.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card-tile p-6 sm:p-8" role="status" data-testid="privacy-request-done">
        <h2 className="serif text-2xl font-semibold">We have your request</h2>
        <p className="mt-3 ink-soft">
          Your reference number is <strong data-testid="privacy-reference">{done.reference}</strong>. Please keep it.
        </p>
        <p className="mt-3 ink-soft">
          We aim to reply within {responseDays} days. Before we change or share anything we will check that you are the person the
          information is about. {done.receiptEmailed ? 'A receipt is on its way to your email.' : 'We will contact you at the phone number you gave.'}
          {' '}Nothing has been changed or deleted yet.
        </p>
      </div>
    );
  }

  const fe = (k: string) =>
    fieldErrors[k] ? (
      <p className={err} id={`pr-${k}-error`}>
        {fieldErrors[k]}
      </p>
    ) : null;
  const described = (k: string) => (fieldErrors[k] ? `pr-${k}-error` : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="card-tile space-y-6 p-6 sm:p-8" data-testid="privacy-request-form">
      {formError && (
        <p role="alert" className="rounded-lg border border-[#f87171] px-3 py-2.5 text-sm text-[#f87171]">
          {formError}
        </p>
      )}

      <div>
        <label className={label} htmlFor="pr-name">Your name</label>
        <input id="pr-name" name="name" autoComplete="name" className={field} value={name} onChange={(e) => setName(e.target.value)} aria-describedby={described('name')} aria-invalid={Boolean(fieldErrors.name)} />
        {fe('name')}
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">The email or phone you used with Tassy (give at least one)</legend>
        <div>
          <label className={label} htmlFor="pr-email">Email</label>
          <input id="pr-email" name="email" type="email" autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={described('email')} aria-invalid={Boolean(fieldErrors.email)} />
          {fe('email')}
        </div>
        <div>
          <label className={label} htmlFor="pr-phone">Phone</label>
          <input id="pr-phone" name="phone" type="tel" autoComplete="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} aria-describedby={described('phone')} />
          {fe('phone')}
        </div>
      </fieldset>

      <div>
        <label className={label} htmlFor="pr-type">What would you like us to do?</label>
        <select id="pr-type" name="requestType" className={field} value={requestType} onChange={(e) => setRequestType(e.target.value)} aria-describedby={described('requestType')} aria-invalid={Boolean(fieldErrors.requestType)}>
          <option value="">Choose one…</option>
          {REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {fe('requestType')}
      </div>

      <div>
        <label className={label} htmlFor="pr-details">Anything we should know? (optional)</label>
        <textarea id="pr-details" name="details" rows={4} className={field} value={details} onChange={(e) => setDetails(e.target.value)} aria-describedby="pr-details-hint" />
        <p id="pr-details-hint" className="mt-1.5 text-xs ink-mute">Please do not type medical details, card numbers or your Social Security number.</p>
      </div>

      {/* Honeypot. Named hp_token, never an autofill category. Off-screen, not display:none. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="pr-hp">Leave this empty</label>
        <input id="pr-hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      <p className="text-sm ink-soft">
        We will check that you are the person the information is about before we act, and we will not delete anything automatically.
        We aim to reply within {responseDays} days.
      </p>

      <button type="submit" disabled={busy} className="btn-gold justify-center disabled:opacity-60 min-h-[44px]">
        {busy ? 'Sending…' : 'Send request'}
      </button>
    </form>
  );
}
