'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  WINNIE_CONFIRMATION_BODY,
  WINNIE_CONFIRMATION_TITLE,
  WINNIE_PET_TYPES,
  WINNIE_SERVICES,
  type WinniePetType,
  type WinnieService,
} from '@/lib/winnie-waitlist';

const field =
  'w-full rounded-lg border border-[color:var(--line)] bg-[#0f141a] px-3 py-3 text-base text-[color:var(--ink)] outline-none focus-visible:outline-3 focus-visible:outline-[color:var(--gold-warm)]';
const label = 'block text-sm font-medium mb-1.5';
const err = 'mt-1.5 text-sm text-[#f87171]';

/**
 * The Winnie Ride join list.
 *
 * Collects a lead. It does not book, charge or quote, and nothing on this
 * screen may suggest it does: no booking language, no promised driver or
 * start date. (The published rates live on the page around it, framed as
 * what the service will cost when it opens.)
 *
 * Success is a real id from the server and nothing else. A null id (the bot
 * filter's answer), an error payload or a network failure all stay on the
 * form — same contract as the Scholar household form.
 */
export default function WinnieWaitlistForm() {
  const [startedAt] = useState(() => Date.now());
  const [owner, setOwner] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<WinniePetType>('dog');
  const [petBasics, setPetBasics] = useState('');
  const [services, setServices] = useState<WinnieService[]>([]);
  const [extraNotes, setExtraNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [doneId, setDoneId] = useState<string | null>(null);

  function toggleService(key: WinnieService) {
    setServices((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/winnie-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_name: owner,
          email,
          phone,
          pet_name: petName,
          pet_type: petType,
          pet_basics: petBasics,
          services,
          extra_notes: extraNotes || null,
          consent_contact: consent ? true : false,
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
      <div className="card-tile p-6 sm:p-8" role="status" data-testid="winnie-waitlist-confirmation">
        <h2 className="serif text-2xl font-semibold">{WINNIE_CONFIRMATION_TITLE}</h2>
        <p className="mt-3 text-sm text-[color:var(--ink-soft)]">{WINNIE_CONFIRMATION_BODY}</p>
        <div className="mt-8">
          <Link href="/winnie" className="btn-primary inline-flex min-h-[44px] items-center">
            Back to Winnie Ride
          </Link>
        </div>
      </div>
    );
  }

  const fe = (k: string) => (fieldErrors[k] ? <p className={err}>{fieldErrors[k]}</p> : null);

  return (
    <form onSubmit={onSubmit} className="card-tile space-y-8 p-6 sm:p-8" noValidate data-testid="winnie-waitlist-form">
      {formError && (
        <p role="alert" className="rounded-lg border border-[#f87171] px-3 py-2.5 text-sm text-[#f87171]">
          {formError}
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="serif mb-1 text-lg font-semibold">About you</legend>
        <div>
          <label className={label} htmlFor="ww-name">Your name</label>
          <input id="ww-name" className={field} autoComplete="name" value={owner} onChange={(e) => setOwner(e.target.value)} />
          {fe('owner_name')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ww-email">Email</label>
            <input id="ww-email" type="email" className={field} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fe('email')}
          </div>
          <div>
            <label className={label} htmlFor="ww-phone">Mobile number</label>
            <input id="ww-phone" type="tel" className={field} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {fe('phone')}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="serif mb-1 text-lg font-semibold">Your pet</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ww-pet-name">Pet&rsquo;s name</label>
            <input id="ww-pet-name" className={field} value={petName} onChange={(e) => setPetName(e.target.value)} />
            {fe('pet_name')}
          </div>
          <div>
            <label className={label} htmlFor="ww-pet-type">Dog, cat or other?</label>
            <select id="ww-pet-type" className={field} value={petType} onChange={(e) => setPetType(e.target.value as WinniePetType)}>
              {WINNIE_PET_TYPES.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            {fe('pet_type')}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="ww-pet-basics">Breed or size</label>
          <input id="ww-pet-basics" className={field} placeholder="For example: French Bulldog, about 25 lbs" value={petBasics} onChange={(e) => setPetBasics(e.target.value)} />
          {fe('pet_basics')}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="serif mb-1 text-lg font-semibold">What will you need rides for?</legend>
        <p className="text-xs text-[color:var(--ink-mute)]">Choose any that fit — it tells us what to be ready for first.</p>
        {WINNIE_SERVICES.map((s) => (
          <label key={s.key} htmlFor={`ww-service-${s.key}`} className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm">
            <input id={`ww-service-${s.key}`} type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={services.includes(s.key)} onChange={() => toggleService(s.key)} />
            <span>{s.label}</span>
          </label>
        ))}
        {fe('services')}
        <div className="pt-2">
          <label className={label} htmlFor="ww-extra">Anything else we should know?</label>
          <textarea id="ww-extra" rows={3} className={field} value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} />
          {fe('extra_notes')}
        </div>
      </fieldset>

      {/* Honeypot. Named hp_token, never an autofill category. Off-screen, not display:none. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="ww-hp">Leave this empty</label>
        <input id="ww-hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      <div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm" htmlFor="ww-consent">
          <input id="ww-consent" type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            Please contact me when Winnie Ride opens. I understand joining the list is not a booking and does not
            reserve a ride. This is not a sign-up for text messages.
          </span>
        </label>
        <p className="ml-7 text-xs text-[color:var(--ink-mute)]">
          We use what you enter only to reply to you about Winnie Ride. See our{' '}
          <a href="/privacy" className="inline-flex min-h-[44px] items-center underline">Privacy Policy</a>{' '}
          and{' '}
          <a href="/terms" className="inline-flex min-h-[44px] items-center underline">Terms</a>.
        </p>
        {fe('consent_contact')}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link href="/winnie" className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]">
          Back to Winnie Ride
        </Link>
        <button type="submit" disabled={busy} className="btn-primary min-h-[44px] disabled:opacity-40">
          {busy ? 'Joining…' : 'Join the list'}
        </button>
      </div>
      <p className="text-xs text-[color:var(--ink-mute)]">
        This is a waitlist, not a booking. Joining does not charge you or reserve a ride.
      </p>
    </form>
  );
}
