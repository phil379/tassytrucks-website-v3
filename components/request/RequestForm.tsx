'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  COPY,
  SERVICE_LINES,
  VEHICLE_NOTES_MAX,
  WAIT_TIME_LINES,
  coerceServiceLine,
  defaultMobilityFor,
  minDateTimeLocal,
  mobilityLabelFor,
  mobilityOptionsFor,
  passengerLabelFor,
  tripRequestSchema,
  type ServiceLine,
} from '@/lib/trip-request';
import AddressAutocomplete, { type ResolvedPlace } from '@/components/request/AddressAutocomplete';
import { SHOW_ESTIMATES, estimateTrip, formatRange } from '@/lib/quote';

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
export default function RequestForm({
  initialService,
  googleMapsApiKey,
}: {
  initialService: ServiceLine;
  /**
   * Passed down from a dynamically-rendered server component rather than read
   * from NEXT_PUBLIC_*, so rotating the key takes effect on the next request
   * instead of needing a rebuild. Undefined is a supported state: the address
   * fields degrade to plain text inputs.
   */
  googleMapsApiKey?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [service, setService] = useState<ServiceLine>(initialService);

  /**
   * Mobility is a function of WHO is travelling, so it has to be state, not a
   * defaultValue. Switching to Winnie Ride must swap the whole question — a pet
   * owner should never be asked whether their dog uses a walker or a cane.
   *
   * The initial value honours `?mobility=` so the wheelchair-transport landing
   * page, which already deep-links `mobility=wheelchair`, arrives with the
   * right option selected instead of quietly defaulting to "walks unaided".
   */
  const [mobility, setMobility] = useState<string>(() => {
    const requested = searchParams.get('mobility');
    const allowed = mobilityOptionsFor(initialService).map((m) => m.value as string);
    return requested && allowed.includes(requested) ? requested : defaultMobilityFor(initialService);
  });

  function changeService(next: ServiceLine) {
    setService(next);
    // Carry the answer over when it still exists in the new list (`other` does),
    // otherwise fall back to that line's sensible default.
    const allowed = mobilityOptionsFor(next).map((m) => m.value as string);
    setMobility((current) => (allowed.includes(current) ? current : defaultMobilityFor(next)));
  }
  const [returnTrip, setReturnTrip] = useState(false);

  // Lifted out of the address fields so the estimate can react to them. Null
  // whenever the visitor edits an address after picking it — a price that
  // describes a corrected address is worse than no price.
  const [pickupPlace, setPickupPlace] = useState<ResolvedPlace | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<ResolvedPlace | null>(null);
  const [whenValue, setWhenValue] = useState('');
  const [passengers, setPassengers] = useState(1);
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

  /**
   * Off for everyone until the rate card is approved (lib/quote.ts). The query
   * flag is a preview door so the panel can be reviewed on the live site
   * without publishing a price to the public.
   */
  const estimatesEnabled = SHOW_ESTIMATES || searchParams.get('preview_quote') === '1';

  /** Operator diagnostic: /request?debug_maps=1 says why suggestions are off. */
  const debugMaps = searchParams.get('debug_maps') === '1';

  const estimate = useMemo(() => {
    if (!estimatesEnabled) return null;
    return estimateTrip({
      serviceLine: service,
      pickup: pickupPlace,
      dropoff: dropoffPlace,
      requestedAt: whenValue,
      passengers,
      returnTrip,
    });
  }, [estimatesEnabled, service, pickupPlace, dropoffPlace, whenValue, passengers, returnTrip]);

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
      pickupPlaceId: String(fd.get('pickupAddressPlaceId') ?? '') || null,
      pickupLat: String(fd.get('pickupAddressLat') ?? '') || null,
      pickupLng: String(fd.get('pickupAddressLng') ?? '') || null,
      dropoffPlaceId: String(fd.get('dropoffAddressPlaceId') ?? '') || null,
      dropoffLat: String(fd.get('dropoffAddressLat') ?? '') || null,
      dropoffLng: String(fd.get('dropoffAddressLng') ?? '') || null,
      // Only the FLAG. The server recomputes the amounts from the coordinates
      // it received — a price the browser could edit is not defensible.
      estimateShown: Boolean(estimate),
      contactFirstName: String(fd.get('contactFirstName') ?? ''),
      contactLastName: String(fd.get('contactLastName') ?? ''),
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
          onChange={(e) => changeService(coerceServiceLine(e.target.value))}
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
        <AddressAutocomplete
          name="pickupAddress"
          label="Pickup address"
          apiKey={googleMapsApiKey}
          autoComplete="street-address"
          required
          hasError={Boolean(errors.pickupAddress)}
          describedBy={errors.pickupAddress ? 'pickupAddress-error' : undefined}
          onResolve={setPickupPlace}
          debug={debugMaps}
        />
        <FieldError name="pickupAddress" />
      </div>

      <div>
        <AddressAutocomplete
          name="dropoffAddress"
          label="Destination"
          apiKey={googleMapsApiKey}
          required
          hasError={Boolean(errors.dropoffAddress)}
          describedBy={errors.dropoffAddress ? 'dropoffAddress-error' : undefined}
          onResolve={setDropoffPlace}
          debug={debugMaps}
        />
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
          value={whenValue}
          onChange={(e) => setWhenValue(e.target.value)}
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
            {passengerLabelFor(service)}
          </label>
          <input
            {...fieldProps('passengers')}
            type="number"
            min={1}
            max={8}
            value={passengers}
            onChange={(e) => setPassengers(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
          />
          <FieldError name="passengers" />
        </div>

        <div>
          <label className={labelCls} htmlFor="mobility">
            {mobilityLabelFor(service)}
          </label>
          <select
            {...fieldProps('mobility')}
            value={mobility}
            onChange={(e) => setMobility(e.target.value)}
          >
            {mobilityOptionsFor(service).map((m) => (
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
          <label className={labelCls} htmlFor="contactFirstName">
            First name <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input {...fieldProps('contactFirstName')} autoComplete="given-name" required />
          <FieldError name="contactFirstName" />
        </div>

        <div>
          <label className={labelCls} htmlFor="contactLastName">
            Last name <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input {...fieldProps('contactLastName')} autoComplete="family-name" required />
          <FieldError name="contactLastName" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className={labelCls} htmlFor="contactPhone">
            Phone <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input {...fieldProps('contactPhone')} type="tel" autoComplete="tel" required />
          <FieldError name="contactPhone" />
        </div>

        <div>
          <label className={labelCls} htmlFor="contactEmail">
            Email
          </label>
          <input {...fieldProps('contactEmail')} type="email" autoComplete="email" />
          <FieldError name="contactEmail" />
        </div>
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

      {estimatesEnabled && (
        <div
          data-testid="trip-estimate"
          className="rounded-xl border border-line p-4"
          aria-live="polite"
        >
          {estimate ? (
            <>
              <p className="text-sm">
                <span className="ink-soft">Estimated fare</span>{' '}
                <span className="serif text-2xl font-semibold text-[color:var(--gold)]">
                  {formatRange(estimate)}
                </span>
              </p>
              <p className="ink-soft mt-1.5 text-xs">
                About {estimate.miles} miles
                {returnTrip ? ', both legs' : ''}
                {estimate.atMinimum ? ' · minimum fare applies' : ''}
                {estimate.waitIncludedMin > 0
                  ? ` · includes ${estimate.waitIncludedMin} min on-site wait`
                  : ''}
                {estimate.surcharges.length > 0
                  ? ` · ${estimate.surcharges.map((x) => x.label.toLowerCase()).join(' and ')}`
                  : ''}
              </p>
              <p className="ink-soft mt-2 text-xs">
                An estimate, not a final price. Tolls, extra wait time and a route we
                cannot see yet can move it. A dispatcher confirms the exact figure
                before your trip is booked.
              </p>
            </>
          ) : (
            <p className="ink-soft text-sm">
              {/* Deliberately not a guess. See the rules at the top of lib/quote.ts. */}
              Pick both addresses from the suggestions to see an estimated fare.
            </p>
          )}
        </div>
      )}

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
