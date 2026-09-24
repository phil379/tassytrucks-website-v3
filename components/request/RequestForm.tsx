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
import TripDetailsFields from '@/components/request/TripDetailsFields';
import { detailsFor, validateDetails } from '@/lib/trip-details';
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

  /**
   * The per-service answers — pet breed, school, who signs the patient out.
   * Kept as plain strings here and coerced once, by the shared validator, so
   * the form and the server agree on what a number or a date means.
   */
  const [details, setDetails] = useState<Record<string, string>>({});

  function changeService(next: ServiceLine) {
    setService(next);
    // Carry the answer over when it still exists in the new list (`other` does),
    // otherwise fall back to that line's sensible default.
    const allowed = mobilityOptionsFor(next).map((m) => m.value as string);
    setMobility((current) => (allowed.includes(current) ? current : defaultMobilityFor(next)));
    // Wipe the detail block. The keys overlap across lines by coincidence, not
    // by meaning — carrying a pet's name into a Scholar request would put a
    // dog's name where a child's belongs.
    setDetails({});
    setErrors((current) => {
      const kept: Record<string, string> = {};
      for (const [key, message] of Object.entries(current)) {
        if (!key.startsWith('details.')) kept[key] = message;
      }
      return kept;
    });
  }

  const [returnTrip, setReturnTrip] = useState(false);

  // Lifted out of the address fields so the estimate can react to them. Null
  // whenever the visitor edits an address after picking it — a price that
  // describes a corrected address is worse than no price.
  const [pickupPlace, setPickupPlace] = useState<ResolvedPlace | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<ResolvedPlace | null>(null);
  /** Raw field text. Feeds the ZIP fallback when no place could be picked. */
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [whenValue, setWhenValue] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState('');
  const [preferred, setPreferred] = useState<'phone' | 'text' | 'email'>('phone');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  /** Errors for the detail block, keyed the way that block expects them. */
  const detailErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [key, message] of Object.entries(errors)) {
      if (key.startsWith('details.')) out[key.slice('details.'.length)] = message;
    }
    return out;
  }, [errors]);

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
   * On since the rate card was approved (2026-09-24). The query flag stays so a
   * future card can be reviewed on the live site before it is published.
   */
  const estimatesEnabled = SHOW_ESTIMATES || searchParams.get('preview_quote') === '1';

  /** Operator diagnostic: /request?debug_maps=1 says why suggestions are off. */
  const debugMaps = searchParams.get('debug_maps') === '1';

  /**
   * REAL driving miles, from Google's Routes API via /api/distance.
   *
   * Null is the normal starting state and a normal ending state: no Maps key,
   * an address typed rather than picked, Google slow, quota gone. The quote
   * engine falls back to a stretched straight line and labels it "about". The
   * lookup never gates the price — the panel shows the fallback number first
   * and tightens to the measured one a moment later.
   */
  const [roadMiles, setRoadMiles] = useState<number | null>(null);

  const pickupLat = pickupPlace?.lat ?? null;
  const pickupLng = pickupPlace?.lng ?? null;
  const dropoffLat = dropoffPlace?.lat ?? null;
  const dropoffLng = dropoffPlace?.lng ?? null;

  useEffect(() => {
    if (
      pickupLat === null ||
      pickupLng === null ||
      dropoffLat === null ||
      dropoffLng === null
    ) {
      // One end just changed or was cleared. Drop the old number immediately:
      // a measured distance for the PREVIOUS address is worse than none.
      setRoadMiles(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    // Short debounce. Picking from the dropdown can fire pickup and dropoff in
    // quick succession, and one billed call per pair is the point.
    const timer = setTimeout(() => {
      fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: { lat: pickupLat, lng: pickupLng },
          dropoff: { lat: dropoffLat, lng: dropoffLng },
        }),
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { miles?: number | null } | null) => {
          if (cancelled) return;
          setRoadMiles(typeof data?.miles === 'number' ? data.miles : null);
        })
        .catch(() => {
          if (!cancelled) setRoadMiles(null);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const quoted = useMemo(() => {
    if (!estimatesEnabled) return null;
    return estimateTrip({
      serviceLine: service,
      roadMiles,
      pickup: pickupPlace,
      dropoff: dropoffPlace,
      // The raw text matters even when a place was picked: with no Maps key
      // there is no place to pick, and the ZIP in what they typed is the only
      // thing that can produce a price. See lib/zip-centroids.ts.
      pickupAddress: pickupText,
      dropoffAddress: dropoffText,
      requestedAt: whenValue,
      passengers,
      returnTrip,
      mobility,
    });
  }, [
    estimatesEnabled,
    roadMiles,
    service,
    pickupPlace,
    dropoffPlace,
    pickupText,
    dropoffText,
    whenValue,
    passengers,
    returnTrip,
    mobility,
  ]);

  const estimate = quoted?.kind === 'estimate' ? quoted : null;

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
      // Raw strings. The server re-validates them against the same spec and
      // stores only what comes back from it.
      tripDetails: details,
      source,
    };

    // Client-side validation is a courtesy. The server re-runs this same schema
    // and is the authority.
    const check = tripRequestSchema.safeParse(payload);
    const detailCheck = validateDetails(payload.serviceLine, details);

    if (!check.success || !detailCheck.ok) {
      const next: Record<string, string> = {};
      if (!check.success) {
        for (const issue of check.error.issues) {
          const key = issue.path.join('.') || 'form';
          if (!next[key]) next[key] = issue.message;
        }
      }
      if (!detailCheck.ok) {
        for (const [key, message] of Object.entries(detailCheck.errors)) {
          next[`details.${key}`] = message;
        }
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
                  {/* A detail error is keyed `details.pet_name` but the input it
                      belongs to is `#details-pet_name`. Without this the link in
                      the summary scrolls nowhere, which is worse than no link —
                      a screen reader user is told where to go and then dropped. */}
                  <a href={`#${name.replace('details.', 'details-')}`} className="underline">
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
          onText={setPickupText}
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
          onText={setDropoffText}
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

      {/* Who or what is travelling. Swaps with the service line — a pet owner
          is asked about a breed, a parent about a school. See
          lib/trip-details.ts for why this is a spec rather than markup. */}
      <TripDetailsFields
        service={service}
        values={details}
        errors={detailErrors}
        onChange={(key, value) => setDetails((current) => ({ ...current, [key]: value }))}
      />

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

      {/* THE HEADING IS THE FIX. Without it, "First name" sat directly under
          "How does your pet travel?" and read as a request for the dog's name.
          Say whose details these are, every time, on every service line. */}
      <div className="border-t border-line pt-6">
        <h2 className="serif text-lg font-semibold">Your contact details</h2>
        <p className="ink-soft mt-1 text-xs">
          {detailsFor(service)
            ? 'Yours — the person we call back, not the passenger above.'
            : 'The person we call back to confirm this trip.'}
        </p>
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
                {/* "11.1 miles" when Google measured the drive, "about 10.6"
                    when it is a straight line stretched by a factor. A
                    customer checking our number against their own phone must
                    not find it short. */}
                {estimate.cardLabel} ·{' '}
                {estimate.distanceMeasured
                  ? `${estimate.miles} miles driving`
                  : `about ${estimate.miles} miles`}
                {estimate.roundTrip ? ' · both legs included' : ''}
                {estimate.waitIncludedMin > 0
                  ? ` · includes ${estimate.waitIncludedMin} min on-site wait`
                  : ''}
                {estimate.surcharges.length > 0
                  ? ` · ${estimate.surcharges.map((x) => x.label.toLowerCase()).join(' and ')}`
                  : ''}
              </p>
              {/* A ZIP-derived price is a good estimate and a bad promise. Say which. */}
              {!estimate.exact && (
                <p className="ink-soft mt-2 text-xs">
                  Measured between{' '}
                  {estimate.measuredFrom ?? 'the ZIP codes you entered'} — add the full
                  street address for an exact figure.
                </p>
              )}
              <p className="ink-soft mt-2 text-xs">
                An estimate, not a final price. Tolls, extra wait time and a route we
                cannot see yet can move it. A dispatcher confirms the exact figure
                before your trip is booked.
              </p>
            </>
          ) : quoted?.kind === 'quote-only' ? (
            /* Measurable, but not a table lookup. Say which, and why. */
            <p className="ink-soft text-sm">{quoted.message}</p>
          ) : (
            <p className="ink-soft text-sm">
              {/* Never a guess — but a ZIP is enough to stop this being a dead end. */}
              Add a ZIP code to both addresses to see your price.
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
