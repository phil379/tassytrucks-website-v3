'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  COPY,
  MOBILITY_OPTIONS,
  SERVICE_LINES,
  VEHICLE_NOTES_MAX,
  WAIT_TIME_LINES,
  coerceServiceLine,
  minDateTimeLocal,
  tripRequestSchema,
  type ServiceLine,
} from '@/lib/trip-request';

const labelCls = 'block text-sm font-medium mb-1.5';

/**
 * Accessibility notes for anyone editing this form.
 *
 * The audience is wheelchair users, dialysis and post-surgical patients, and
 * their adult children filling this in one-handed on a phone. Three things here
 * are load-bearing, not decoration:
 *   1. every input has a real <label for>, plus aria-invalid + aria-describedby
 *      wiring it to its own error text;
 *   2. errors are ALSO summarised in a role="alert" region, because an inline
 *      <p> that appears next to a field is not announced by a screen reader
 *      unless focus happens to be there;
 *   3. focus moves to that summary on a failed submit, so a keyboard or screen
 *      reader user is told what happened instead of being silently returned to
 *      the top of a long form.
 */
export default function RequestForm({ initialService }: { initialService: ServiceLine }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [service, setService] = useState<ServiceLine>(initialService);
  const [returnTrip, setReturnTrip] = useState(false);
  const [notes, setNotes] = useState('');
  const [preferred, setPreferred] = useState<'phone' | 'text' | 'email'>('phone');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const [minDateTime, setMinDateTime] = useState('');
  useEffect(() => setMinDateTime(minDateTimeLocal()), []);

  /** `source` = page path + any utm params, stamped on the row. */
  const source = useMemo(() => {
    const utm = new URLSearchParams();
    searchParams.forEach((value, key) => utm.set(key, value));
    const qs = utm.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const showWaitCopy = WAIT_TIME_LINES.includes(service);
  const errorList = Object.entries(errors);

  /** Wires a field to its label, its error, and its validity state. */
  function fieldProps(name: string) {
    const hasError = Boolean(errors[name]);
    return {
      id: name,
      name,
      'aria-invalid': hasError || undefined,
      'aria-describedby': hasError ? `${name}-error` : undefined,
      className: 'form-field',
    };
  }

  function FieldError({ name }: { name: string }) {
    if (!errors[name]) return null;
    return (
      <p id={`${name}-error`} className="form-error">
        {errors[name]}
      </p>
    );
  }

  function announce(next: Record<string, string>, message?: string) {
    setErrors(next);
    if (message) setFormError(message);
    // Let React paint the summary before moving focus into it.
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const fd = new FormData(event.currentTarget);
    const payload = {
      serviceLine: String(fd.get('serviceLine') ?? ''),
      pickupAddress: String(fd.get('pickupAddress') ?? ''),
      dropoffAddress: String(fd.get('dropoffAddress') ?? ''),
      requestedAt: String(fd.get('requestedAt') ?? ''),
      returnTrip: fd.get('returnTrip') === 'on',
      returnAt: String(fd.get('returnAt') ?? '') || null,
      passengers: Number(fd.get('passengers') ?? 1),
      mobility: String(fd.get('mobility') ?? '') || null,
      vehicleNotes: String(fd.get('vehicleNotes') ?? '') || null,
      contactName: String(fd.get('contactName') ?? ''),
      contactPhone: String(fd.get('contactPhone') ?? ''),
      contactEmail: String(fd.get('contactEmail') ?? '') || null,
      preferredContact: String(fd.get('preferredContact') ?? 'phone'),
      company: String(fd.get('company') ?? ''),
      source,
    };

    // Client-side validation is a courtesy. The server re-runs this same schema
    // and is the authority.
    const check = tripRequestSchema.safeParse(payload);
    if (!check.success) {
      const next: Record<string, string> = {};
      for (const issue of check.error.issues) {
        const key = issue.path.join('.') || 'form';
        if (!next[key]) next[key] = issue.message;
      }
      announce(next);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/trip-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        announce(json.fieldErrors ?? {}, json.error ?? 'Something went wrong. Please call (704) 941-8508.');
        return;
      }

      setDone(json.id ?? 'received');
    } catch {
      announce({}, 'We could not reach the server. Please call (704) 941-8508.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card-tile p-8 text-center" role="status" aria-live="polite">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[color:var(--gold)]" aria-hidden="true" />
        <h2 className="serif text-2xl font-semibold mt-4">Request received</h2>
        <p className="ink-soft mt-3 max-w-md mx-auto">{COPY.confirmation}</p>
        <p className="ink-soft text-sm mt-4">
          Need us sooner? Call{' '}
          <a className="underline tap-target" href="tel:+17049418508">
            (704) 941-8508
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Honeypot — hidden from everyone, including screen readers. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/*
        Error summary. role="alert" so it is announced the moment it appears;
        tabIndex={-1} so we can move focus here programmatically.
      */}
      <div
        ref={errorSummaryRef}
        data-testid="error-summary"
        tabIndex={-1}
        role="alert"
        aria-live="assertive"
        className={errorList.length || formError ? 'form-alert' : 'sr-only'}
      >
        {formError && <p className="font-medium">{formError}</p>}
        {errorList.length > 0 && (
          <>
            <p className="font-medium">
              {errorList.length === 1
                ? 'There is 1 problem with this form:'
                : `There are ${errorList.length} problems with this form:`}
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {errorList.map(([name, message]) => (
                <li key={name}>
                  <a href={`#${name}`} className="underline">
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <label className={labelCls} htmlFor="serviceLine">
          Service
        </label>
        <select
          {...fieldProps('serviceLine')}
          value={service}
          onChange={(e) => setService(coerceServiceLine(e.target.value))}
        >
          {SERVICE_LINES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <FieldError name="serviceLine" />
      </div>

      <div>
        <label className={labelCls} htmlFor="pickupAddress">
          Pickup address <span aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input {...fieldProps('pickupAddress')} autoComplete="street-address" required />
        <FieldError name="pickupAddress" />
      </div>

      <div>
        <label className={labelCls} htmlFor="dropoffAddress">
          Destination <span aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input {...fieldProps('dropoffAddress')} required />
        <FieldError name="dropoffAddress" />
      </div>

      <div>
        <label className={labelCls} htmlFor="requestedAt">
          Date &amp; time <span aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          {...fieldProps('requestedAt')}
          type="datetime-local"
          min={minDateTime}
          aria-describedby={errors.requestedAt ? 'requestedAt-error requestedAt-help' : 'requestedAt-help'}
          required
        />
        <p id="requestedAt-help" className="ink-soft text-xs mt-1.5">
          Earliest pickup is 4 hours from now.
        </p>
        <FieldError name="requestedAt" />
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
          <input
            type="checkbox"
            name="returnTrip"
            className="h-6 w-6 rounded border-line"
            checked={returnTrip}
            onChange={(e) => setReturnTrip(e.target.checked)}
          />
          <span className="text-sm font-medium">I need a return trip</span>
        </label>

        {returnTrip && (
          <div className="mt-3">
            <label className={labelCls} htmlFor="returnAt">
              Return date &amp; time
            </label>
            <input {...fieldProps('returnAt')} type="datetime-local" min={minDateTime} />
            <FieldError name="returnAt" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className={labelCls} htmlFor="passengers">
            Passengers
          </label>
          <input {...fieldProps('passengers')} type="number" min={1} max={8} defaultValue={1} />
          <FieldError name="passengers" />
        </div>

        <div>
          <label className={labelCls} htmlFor="mobility">
            Mobility
          </label>
          <select {...fieldProps('mobility')} defaultValue="ambulatory">
            {MOBILITY_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <FieldError name="mobility" />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="vehicleNotes">
          Anything we should know to prepare the vehicle?
        </label>
        <textarea
          {...fieldProps('vehicleNotes')}
          rows={3}
          maxLength={VEHICLE_NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-describedby={
            errors.vehicleNotes ? 'vehicleNotes-error vehicleNotes-help' : 'vehicleNotes-help'
          }
        />
        <p id="vehicleNotes-help" className="ink-soft text-xs mt-1.5">
          {COPY.medicalWarning}
        </p>
        <p className="ink-soft text-xs mt-1" aria-live="polite">
          {notes.length} of {VEHICLE_NOTES_MAX} characters used
        </p>
        <FieldError name="vehicleNotes" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className={labelCls} htmlFor="contactName">
            Name <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input {...fieldProps('contactName')} autoComplete="name" required />
          <FieldError name="contactName" />
        </div>

        <div>
          <label className={labelCls} htmlFor="contactPhone">
            Phone <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input {...fieldProps('contactPhone')} type="tel" autoComplete="tel" required />
          <FieldError name="contactPhone" />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="contactEmail">
          Email
        </label>
        <input {...fieldProps('contactEmail')} type="email" autoComplete="email" />
        <FieldError name="contactEmail" />
      </div>

      <fieldset>
        <legend className={labelCls}>Preferred contact</legend>
        <div className="flex flex-wrap gap-2">
          {(['phone', 'text', 'email'] as const).map((opt) => (
            <label
              key={opt}
              className={`cursor-pointer rounded-lg border px-5 min-h-[44px] inline-flex items-center text-sm capitalize transition ${
                preferred === opt
                  ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/15 font-medium'
                  : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="preferredContact"
                value={opt}
                className="sr-only"
                checked={preferred === opt}
                onChange={() => setPreferred(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      {showWaitCopy && (
        <p className="ink-soft text-sm rounded-lg border border-line p-4">{COPY.waitTime}</p>
      )}

      <button
        type="submit"
        className="btn-gold w-full justify-center min-h-[52px] text-base"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Sending…
          </>
        ) : (
          COPY.submit
        )}
      </button>

      <p className="ink-soft text-sm">{COPY.confirmation}</p>
    </form>
  );
}
