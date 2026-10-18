'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  HOUSEHOLD_CONFIRMATION_BODY,
  HOUSEHOLD_CONFIRMATION_TITLE,
  HOUSEHOLD_DIRECTIONS,
  MAX_HOUSEHOLD_CHILDREN,
  NONSTANDARD_REASONS,
  hasRouteReason,
  type NonstandardReason,
} from '@/lib/school-household';

const field =
  'w-full rounded-lg border border-[color:var(--line)] bg-[#0f141a] px-3 py-3 text-base text-[color:var(--ink)] outline-none focus-visible:outline-3 focus-visible:outline-[color:var(--gold-warm)]';
const label = 'block text-sm font-medium mb-1.5';
const err = 'mt-1.5 text-sm text-[#f87171]';

type ChildRow = { school_name: string; grade_or_age: string };

/**
 * The Custom Household Request.
 *
 * Collects a lead. It does not book, charge, subscribe or quote, and nothing on
 * this screen may suggest it does: no price, no discount, no "bundle" or
 * "shared route", no promised driver, route or start date.
 *
 * Success is a real id from the server and nothing else. A null id (the bot
 * filter's answer), an error payload or a network failure all stay on the form.
 */
export default function HouseholdRequestForm({
  initialReasons,
  planSlug,
}: {
  initialReasons: NonstandardReason[];
  planSlug: 'full-year' | 'weekly' | 'after-school' | null;
}) {
  const [startedAt] = useState(() => Date.now());
  const [guardian, setGuardian] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [home, setHome] = useState('');
  const [childCount, setChildCount] = useState(initialReasons.includes('multiple_children') ? 2 : 1);
  const [children, setChildren] = useState<ChildRow[]>(() =>
    Array.from({ length: initialReasons.includes('multiple_children') ? 2 : 1 }, () => ({
      school_name: '',
      grade_or_age: '',
    })),
  );
  const [direction, setDirection] = useState<'am' | 'pm' | 'round_trip'>('round_trip');
  const [start, setStart] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [fridayDiffers, setFridayDiffers] = useState(initialReasons.includes('different_days'));
  const [fridaySchedule, setFridaySchedule] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [reasons, setReasons] = useState<NonstandardReason[]>(initialReasons);
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [doneId, setDoneId] = useState<string | null>(null);

  function setCount(n: number) {
    const next = Math.min(Math.max(n, 1), MAX_HOUSEHOLD_CHILDREN);
    setChildCount(next);
    setChildren((cur) =>
      next > cur.length
        ? [...cur, ...Array.from({ length: next - cur.length }, () => ({ school_name: '', grade_or_age: '' }))]
        : cur.slice(0, next),
    );
  }

  function setChild(i: number, patch: Partial<ChildRow>) {
    setChildren((cur) => cur.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function toggleReason(key: NonstandardReason) {
    setReasons((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/school-household-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_name: guardian,
          email,
          phone,
          home_address: home,
          child_count: childCount,
          children,
          direction,
          desired_start: start,
          schedule_notes: scheduleNotes,
          friday_differs: fridayDiffers,
          friday_schedule: fridayDiffers ? fridaySchedule : null,
          extra_notes: extraNotes || null,
          reasons,
          plan_interest: planSlug,
          consent_contact: consent ? true : false,
          hp_token: hp,
          elapsedMs: Date.now() - startedAt,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || typeof json?.id !== 'string' || json.id.length === 0) {
        if (json?.fieldErrors) setFieldErrors(json.fieldErrors as Record<string, string>);
        setFormError(
          json?.error ?? 'We could not save your request. Please call (704) 941-8508.',
        );
        return;
      }
      setDoneId(json.id);
    } catch {
      setFormError('We could not reach the server, and your request was not saved. Please call (704) 941-8508.');
    } finally {
      setBusy(false);
    }
  }

  if (doneId) {
    return (
      <div className="card-tile p-6 sm:p-8" role="status" data-testid="household-confirmation">
        <h2 className="serif text-2xl font-semibold">{HOUSEHOLD_CONFIRMATION_TITLE}</h2>
        <p className="mt-3 text-sm text-[color:var(--ink-soft)]">{HOUSEHOLD_CONFIRMATION_BODY}</p>
        <div className="mt-8">
          <Link href="/school" className="btn-primary inline-flex min-h-[44px] items-center">
            Back to Tassy Scholar
          </Link>
        </div>
      </div>
    );
  }

  const fe = (k: string) => (fieldErrors[k] ? <p className={err}>{fieldErrors[k]}</p> : null);

  return (
    <form onSubmit={onSubmit} className="card-tile space-y-8 p-6 sm:p-8" noValidate data-testid="household-form">
      {formError && (
        <p role="alert" className="rounded-lg border border-[#f87171] px-3 py-2.5 text-sm text-[#f87171]">
          {formError}
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="serif mb-1 text-lg font-semibold">About you</legend>
        <div>
          <label className={label} htmlFor="hh-name">Parent or guardian name</label>
          <input id="hh-name" className={field} autoComplete="name" value={guardian} onChange={(e) => setGuardian(e.target.value)} />
          {fe('guardian_name')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="hh-email">Email</label>
            <input id="hh-email" type="email" className={field} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fe('email')}
          </div>
          <div>
            <label className={label} htmlFor="hh-phone">Mobile number</label>
            <input id="hh-phone" type="tel" className={field} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {fe('phone')}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="hh-home">Home pickup address</label>
          <input id="hh-home" className={field} autoComplete="street-address" value={home} onChange={(e) => setHome(e.target.value)} />
          {fe('home_address')}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="serif mb-1 text-lg font-semibold">Your children</legend>
        <div>
          <label className={label} htmlFor="hh-count">How many children need transportation?</label>
          <select id="hh-count" className={field} value={childCount} onChange={(e) => setCount(Number(e.target.value))}>
            {Array.from({ length: MAX_HOUSEHOLD_CHILDREN }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {fe('child_count')}
        </div>
        {children.map((c, i) => (
          <div key={i} className="grid gap-4 sm:grid-cols-2" data-testid={`household-child-${i + 1}`}>
            <div>
              <label className={label} htmlFor={`hh-school-${i}`}>
                {childCount > 1 ? `Child ${i + 1}: school` : 'School'}
              </label>
              <input id={`hh-school-${i}`} className={field} value={c.school_name} onChange={(e) => setChild(i, { school_name: e.target.value })} />
              {fe(`children.${i}.school_name`)}
            </div>
            <div>
              <label className={label} htmlFor={`hh-grade-${i}`}>
                {childCount > 1 ? `Child ${i + 1}: grade or age range` : 'Grade or age range'}
              </label>
              <input id={`hh-grade-${i}`} className={field} value={c.grade_or_age} onChange={(e) => setChild(i, { grade_or_age: e.target.value })} />
              {fe(`children.${i}.grade_or_age`)}
            </div>
          </div>
        ))}
        {fe('children')}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="serif mb-1 text-lg font-semibold">Schedule</legend>
        <div>
          <label className={label} htmlFor="hh-direction">When do you need rides?</label>
          <select id="hh-direction" className={field} value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
            {HOUSEHOLD_DIRECTIONS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          {fe('direction')}
        </div>
        <div>
          <label className={label} htmlFor="hh-start">Date you would like to start</label>
          <input id="hh-start" type="date" className={field} value={start} onChange={(e) => setStart(e.target.value)} />
          {fe('desired_start')}
        </div>
        <div>
          <label className={label} htmlFor="hh-sched">Your usual school-day schedule</label>
          <textarea id="hh-sched" rows={3} className={field} value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} />
          <p className="mt-1.5 text-xs text-[color:var(--ink-mute)]">
            For example: start and dismissal times for each school, and which days.
          </p>
          {fe('schedule_notes')}
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm" htmlFor="hh-friday">
          <input id="hh-friday" type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={fridayDiffers} onChange={(e) => setFridayDiffers(e.target.checked)} />
          <span>Fridays (or another day) are different</span>
        </label>
        {fridayDiffers && (
          <div>
            <label className={label} htmlFor="hh-friday-sched">What is different?</label>
            <textarea id="hh-friday-sched" rows={2} className={field} value={fridaySchedule} onChange={(e) => setFridaySchedule(e.target.value)} />
            {fe('friday_schedule')}
          </div>
        )}
        <div>
          <label className={label} htmlFor="hh-extra">
            Activities, dismissal, destinations or anything else we should know
          </label>
          <textarea id="hh-extra" rows={3} className={field} value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} />
        </div>
      </fieldset>

      {hasRouteReason(reasons) && (
        <p role="note" className="rounded-xl border border-[color:var(--line)] p-3 text-sm text-[color:var(--ink-soft)]">
          {reasons.includes('route_too_long')
            ? 'The drive from your home to the school is longer than our standard route, so we will prepare a personalized quote instead of the standard plan.'
            : 'We could not measure the drive from your home to the school, so a person will check the route and send you options.'}{' '}
          Nothing is charged or reserved until we have reviewed it with you.
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="serif mb-1 text-lg font-semibold">What makes your family&rsquo;s plan different?</legend>
        <p className="text-xs text-[color:var(--ink-mute)]">Optional. It helps us prepare.</p>
        {NONSTANDARD_REASONS.map((r) => (
          <label key={r.key} htmlFor={`hh-reason-${r.key}`} className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm">
            <input id={`hh-reason-${r.key}`} type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={reasons.includes(r.key)} onChange={() => toggleReason(r.key)} />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>

      {/* Honeypot. Named hp_token, never an autofill category. Off-screen, not display:none. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="hh-hp">Leave this empty</label>
        <input id="hh-hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      <div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm" htmlFor="hh-consent">
          <input id="hh-consent" type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I agree that Tassy Transportation may contact me about this transportation request.</span>
        </label>
        {fe('consent_contact')}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link href="/school/book" className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]">
          All plans
        </Link>
        <button type="submit" disabled={busy} className="btn-primary min-h-[44px] disabled:opacity-40">
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </div>
      <p className="text-xs text-[color:var(--ink-mute)]">
        This is a request, not a booking. Sending it does not charge you or reserve a seat.
      </p>
    </form>
  );
}
