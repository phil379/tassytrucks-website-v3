'use client';

import { useEffect, useMemo, useState } from 'react';
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

const field =
  'w-full rounded-lg border border-line bg-white px-3 py-3 text-base outline-none focus:border-[color:var(--gold,#C8932E)] focus:ring-2 focus:ring-[color:var(--gold,#C8932E)]/25';
const labelCls = 'block text-sm font-medium mb-1.5';
const errCls = 'mt-1 text-sm text-red-700';

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

  // Computed on the client after mount so SSR and the browser agree.
  const [minDateTime, setMinDateTime] = useState('');
  useEffect(() => setMinDateTime(minDateTimeLocal()), []);

  /** `source` = page path + any utm params, stamped on the row. */
  const source = useMemo(() => {
    const utm = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key.startsWith('utm_') || key === 'gclid' || key === 'fbclid' || key === 'service') {
        utm.set(key, value);
      }
    });
    const qs = utm.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const showWaitCopy = WAIT_TIME_LINES.includes(service);

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
      setErrors(next);
      const first = document.querySelector<HTMLElement>('[data-invalid="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        setErrors(json.fieldErrors ?? {});
        setFormError(json.error ?? 'Something went wrong. Please call (704) 941-8508.');
        return;
      }

      setDone(json.id ?? 'received');
    } catch {
      setFormError('We could not reach the server. Please call (704) 941-8508.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card-tile p-8 text-center" role="status" aria-live="polite">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[color:var(--gold,#C8932E)]" aria-hidden />
        <h2 className="serif text-2xl font-semibold mt-4">Request received</h2>
        <p className="ink-mute mt-3 max-w-md mx-auto">{COPY.confirmation}</p>
        <p className="ink-mute text-sm mt-4">
          Need us sooner? Call{' '}
          <a className="underline" href="tel:+17049418508">
            (704) 941-8508
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Honeypot — visually and programmatically hidden from real users. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div data-invalid={Boolean(errors.serviceLine)}>
        <label className={labelCls} htmlFor="serviceLine">
          Service
        </label>
        <select
          id="serviceLine"
          name="serviceLine"
          className={field}
          value={service}
          onChange={(e) => setService(coerceServiceLine(e.target.value))}
        >
          {SERVICE_LINES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.serviceLine && <p className={errCls}>{errors.serviceLine}</p>}
      </div>

      <div data-invalid={Boolean(errors.pickupAddress)}>
        <label className={labelCls} htmlFor="pickupAddress">
          Pickup address <span className="text-red-700">*</span>
        </label>
        <input id="pickupAddress" name="pickupAddress" className={field} autoComplete="street-address" required />
        {errors.pickupAddress && <p className={errCls}>{errors.pickupAddress}</p>}
      </div>

      <div data-invalid={Boolean(errors.dropoffAddress)}>
        <label className={labelCls} htmlFor="dropoffAddress">
          Destination <span className="text-red-700">*</span>
        </label>
        <input id="dropoffAddress" name="dropoffAddress" className={field} required />
        {errors.dropoffAddress && <p className={errCls}>{errors.dropoffAddress}</p>}
      </div>

      <div data-invalid={Boolean(errors.requestedAt)}>
        <label className={labelCls} htmlFor="requestedAt">
          Date &amp; time <span className="text-red-700">*</span>
        </label>
        <input
          id="requestedAt"
          name="requestedAt"
          type="datetime-local"
          className={field}
          min={minDateTime}
          defaultValue=""
          required
        />
        <p className="ink-mute text-xs mt-1.5">Earliest pickup is 4 hours from now.</p>
        {errors.requestedAt && <p className={errCls}>{errors.requestedAt}</p>}
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            name="returnTrip"
            className="h-5 w-5 rounded border-line"
            checked={returnTrip}
            onChange={(e) => setReturnTrip(e.target.checked)}
          />
          <span className="text-sm font-medium">I need a return trip</span>
        </label>

        {returnTrip && (
          <div className="mt-3" data-invalid={Boolean(errors.returnAt)}>
            <label className={labelCls} htmlFor="returnAt">
              Return date &amp; time
            </label>
            <input id="returnAt" name="returnAt" type="datetime-local" className={field} min={minDateTime} />
            {errors.returnAt && <p className={errCls}>{errors.returnAt}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div data-invalid={Boolean(errors.passengers)}>
          <label className={labelCls} htmlFor="passengers">
            Passengers
          </label>
          <input
            id="passengers"
            name="passengers"
            type="number"
            min={1}
            max={8}
            defaultValue={1}
            className={field}
          />
          {errors.passengers && <p className={errCls}>{errors.passengers}</p>}
        </div>

        <div>
          <label className={labelCls} htmlFor="mobility">
            Mobility
          </label>
          <select id="mobility" name="mobility" className={field} defaultValue="ambulatory">
            {MOBILITY_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div data-invalid={Boolean(errors.vehicleNotes)}>
        <label className={labelCls} htmlFor="vehicleNotes">
          Anything we should know to prepare the vehicle?
        </label>
        <textarea
          id="vehicleNotes"
          name="vehicleNotes"
          rows={3}
          maxLength={VEHICLE_NOTES_MAX}
          className={field}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-describedby="vehicleNotes-help"
        />
        <p id="vehicleNotes-help" className="ink-mute text-xs mt-1.5">
          {COPY.medicalWarning}
        </p>
        <p className="ink-mute text-xs mt-1">
          {notes.length}/{VEHICLE_NOTES_MAX}
        </p>
        {errors.vehicleNotes && <p className={errCls}>{errors.vehicleNotes}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div data-invalid={Boolean(errors.contactName)}>
          <label className={labelCls} htmlFor="contactName">
            Name <span className="text-red-700">*</span>
          </label>
          <input id="contactName" name="contactName" className={field} autoComplete="name" required />
          {errors.contactName && <p className={errCls}>{errors.contactName}</p>}
        </div>

        <div data-invalid={Boolean(errors.contactPhone)}>
          <label className={labelCls} htmlFor="contactPhone">
            Phone <span className="text-red-700">*</span>
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            className={field}
            autoComplete="tel"
            required
          />
          {errors.contactPhone && <p className={errCls}>{errors.contactPhone}</p>}
        </div>
      </div>

      <div data-invalid={Boolean(errors.contactEmail)}>
        <label className={labelCls} htmlFor="contactEmail">
          Email
        </label>
        <input id="contactEmail" name="contactEmail" type="email" className={field} autoComplete="email" />
        {errors.contactEmail && <p className={errCls}>{errors.contactEmail}</p>}
      </div>

      <fieldset>
        <legend className={labelCls}>Preferred contact</legend>
        <div className="flex flex-wrap gap-2">
          {(['phone', 'text', 'email'] as const).map((opt) => (
            <label
              key={opt}
              className={`cursor-pointer rounded-lg border px-4 py-3 text-sm capitalize transition ${
                preferred === opt
                  ? 'border-[color:var(--gold,#C8932E)] bg-[color:var(--gold,#C8932E)]/10 font-medium'
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
        <p className="ink-mute text-sm rounded-lg border border-line bg-cream p-4">{COPY.waitTime}</p>
      )}

      {formError && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {formError}
        </p>
      )}

      <button type="submit" className="btn-primary w-full justify-center py-4 text-base" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          COPY.submit
        )}
      </button>

      <p className="ink-mute text-sm">{COPY.confirmation}</p>
    </form>
  );
}
