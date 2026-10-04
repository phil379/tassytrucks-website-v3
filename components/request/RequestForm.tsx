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
  mobilityLabel,
  mobilityLabelFor,
  mobilityOptionsFor,
  passengerLabelFor,
  tripRequestSchema,
  type ServiceLine,
  serviceShortName,
} from '@/lib/trip-request';
import AddressAutocomplete, { type ResolvedPlace } from '@/components/request/AddressAutocomplete';
import TripDetailsFields from '@/components/request/TripDetailsFields';
import { detailsFor, validateDetails } from '@/lib/trip-details';
import { facilityTripExtrasSchema } from '@/lib/facility';
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
/**
 * Facility context, passed only by /facility/request.
 *
 * Resolved SERVER-SIDE from the session cookie and passed down for DISPLAY and
 * for defaults. The id is not here and must not be: /api/trip-request reads
 * facility_id off the session itself, so nothing this component renders can
 * change which account a trip is billed to. All this prop does is tell the
 * coordinator which account they are on and ask the two questions a facility
 * booking adds.
 */
export type FacilityContext = {
  name: string;
  /** 'patient' / 'pet' / 'resident' — wording only, never stored. */
  passengerNoun: string;
  /** The facility's default payer, from its billing mode. The toggle's start. */
  defaultPayer: 'facility' | 'passenger';
  /**
   * The lines this account may book. A vet clinic never sees Tassy Concierge;
   * a dialysis centre never sees Winnie Ride. Resolved server-side from the
   * facility's kind — see bookableLinesFor() in lib/facility.ts.
   */
  allowedLines?: readonly { value: string; label: string }[];
  /**
   * The facility's own address, prefilled into Pickup.
   *
   * Almost every facility trip starts at the facility. Prefilling saves the
   * retyping AND is the difference between a quote appearing and the panel
   * sitting on "pick an address to see your price" — a coordinator typing
   * "DaVita Pineville" from memory never includes a ZIP, so the engine has
   * nothing to measure from. They can still overwrite it; it is a default,
   * not a lock.
   */
  address?: string | null;
  /**
   * A saved passenger, when the coordinator arrived from the Passengers screen.
   *
   * Name and mobility only. There is no age, date of birth or record number on
   * the profile to carry — see lib/facility.ts. The id rides along so the trip
   * links back and the profile's trip count stays true; the server re-checks it
   * belongs to this facility before storing it.
   */
  patient?: {
    id: string;
    name: string;
    mobility: string | null;
    /** Veterinary accounts only. Two dogs on one account are often both "Max". */
    breed?: string | null;
    ref: string | null;
  } | null;
};

export default function RequestForm({
  initialService,
  servicePreselected = false,
  googleMapsApiKey,
  facility,
}: {
  initialService: ServiceLine;
  /** True when the URL carried ?service= — see the decided line below. */
  servicePreselected?: boolean;
  /** Set on /facility/request only. Undefined is the retail form, unchanged. */
  facility?: FacilityContext;
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
   * Show the picker only when the choice has NOT already been made.
   *
   * Arriving at /request?service=scholar means a parent has already chosen, on
   * a page that explained the service. Re-offering Care, Recovery, Concierge and
   * Winnie invites them to reconsider a decision they came here having made.
   * The decision is stated instead, with `change` as the escape hatch for the
   * parent who realises they actually need Care for a grandparent.
   */
  const [showServicePicker, setShowServicePicker] = useState(!servicePreselected);

  /**
   * What the picker offers. The full list for a retail visitor; only the lines
   * whose PASSENGER TYPE matches for a facility — a vet clinic booking an
   * airport transfer is not a booking anyone wanted, and it reaches a driver
   * as a job the vehicle cannot do.
   */
  const serviceOptions = facility?.allowedLines ?? SERVICE_LINES;

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
    // A saved passenger's mobility wins over the URL: the coordinator picked a
    // person, and that person's wheelchair is a fact about them, not a hint.
    const requested = facility?.patient?.mobility ?? searchParams.get('mobility');
    const allowed = mobilityOptionsFor(initialService).map((m) => m.value as string);
    return requested && allowed.includes(requested) ? requested : defaultMobilityFor(initialService);
  });

  /**
   * Who pays for THIS trip. Starts at the facility's own default and is a
   * per-trip question, because a dialysis centre has standing patients on
   * account and one-off self-payers in the same week. The server re-resolves
   * this against the facility's billing mode either way; the control exists so
   * the coordinator can see and change the answer, not so the browser decides
   * it.
   */
  const [payer, setPayer] = useState<'facility' | 'passenger'>(
    facility?.defaultPayer ?? 'facility',
  );

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
  const [pickupText, setPickupText] = useState(facility?.address ?? '');
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

  /**
   * When this form first rendered. The gap to submit is the real bot signal —
   * a script posts instantly; a person cannot fill this in under three seconds.
   * A ref, not state, so it is fixed at mount and never triggers a re-render.
   */
  const renderedAtRef = useRef<number>(Date.now());

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
      // The one detail answer that moves the price. The engine ignores it on
      // every line but Recovery, so switching service cannot carry $45 across.
      escort: details.escort === 'yes',
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
    details.escort,
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
      hp_token: String(fd.get('hp_token') ?? ''),
      elapsedMs: Date.now() - renderedAtRef.current,
      // Raw strings. The server re-validates them against the same spec and
      // stores only what comes back from it.
      tripDetails: details,
      source,
      // Facility extras. Sent ONLY on /facility/request. `facilityBooking` is
      // the explicit ask that makes the server read the session cookie — and if
      // that session has expired the server returns 401 rather than storing a
      // retail trip, because a patient must never be invoiced for a ride their
      // clinic agreed to cover.
      //
      // There is no facilityId here. The server takes it from the cookie.
      ...(facility
        ? {
            facilityBooking: true,
            facilityPatientId: facility.patient?.id ?? null,
            facilityRef: String(fd.get('facilityRef') ?? '') || null,
            authorizedBy: String(fd.get('authorizedBy') ?? '') || null,
            payer,
          }
        : {}),
    };

    // Client-side validation is a courtesy. The server re-runs this same schema
    // and is the authority.
    const check = tripRequestSchema.safeParse(payload);
    const detailCheck = validateDetails(payload.serviceLine, details);
    // Same schema the route runs, for the same reason it is shared: the MRN
    // guard should catch a pasted record number here, in front of the person
    // who pasted it, rather than after a round trip. The server still enforces
    // it — this only moves the message earlier.
    const extrasCheck = facility
      ? facilityTripExtrasSchema.safeParse({
          facilityRef: String(fd.get('facilityRef') ?? '') || null,
          authorizedBy: String(fd.get('authorizedBy') ?? '') || null,
          payer,
        })
      : null;

    if (!check.success || !detailCheck.ok || (extrasCheck && !extrasCheck.success)) {
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
      if (extrasCheck && !extrasCheck.success) {
        for (const issue of extrasCheck.error.issues) {
          const key = issue.path.join('.') || 'form';
          if (!next[key]) next[key] = issue.message;
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

      // A null id means the server accepted the POST but stored nothing — the
      // bot path returns exactly that shape. This used to read
      // `setDone(json.id ?? 'received')`, so a dropped booking rendered
      // "Request received". It happened twice in production on 2026-09-25.
      // Success is having a row id. Nothing else counts.
      if (!json.id) {
        announce(
          {},
          'We could not save your request — please call (704) 941-8508 and we will take it over the phone.',
        );
        return;
      }

      setDone(json.id);
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
      {/*
        Honeypot — hidden from everyone, including screen readers.

        The name is deliberately meaningless. It used to be "company", which is
        an autofill CATEGORY: browsers and password managers fill it from the
        saved profile even here, off-screen and aria-hidden. Two real bookings
        were silently discarded that way on 2026-09-25. Do not rename this to
        anything that reads like a real field.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="hp_token">Leave this field empty</label>
        <input
          id="hp_token"
          name="hp_token"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
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
        {showServicePicker ? (
          <>
            <label className={labelCls} htmlFor="serviceLine">
              Service
            </label>
            <select
              {...fieldProps('serviceLine')}
              value={service}
              onChange={(e) => changeService(coerceServiceLine(e.target.value))}
            >
              {serviceOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <FieldError name="serviceLine" />
          </>
        ) : (
          <>
            {/* The decision, stated. `serviceLine` still submits, from a hidden
                input, because the payload is read out of FormData. */}
            <input type="hidden" name="serviceLine" value={service} />
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="ink-soft">Booking:</span>
              <strong className="text-base">{serviceShortName(service)}</strong>
              <span className="ink-soft">{serviceTail(service)}</span>
              <button
                type="button"
                onClick={() => setShowServicePicker(true)}
                className="min-h-[44px] underline"
              >
                change
              </button>
            </p>
          </>
        )}
      </div>

      <div>
        <AddressAutocomplete
          name="pickupAddress"
          label="Pickup address"
          defaultValue={facility?.address ?? ''}
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

      {/* ── facility booking: the two questions an account adds ──────────────
          NOTE WHAT IS NOT ASKED HERE and keep it that way: no diagnosis, no
          procedure, no condition, no medication, no insurance member id, no
          date of birth. `facilityRef` is the facility's OWN job number and
          carries a server-side guard that rejects anything shaped like a
          medical record number (lib/facility.ts), because a free text box next
          to a patient's name is exactly where one gets pasted. The helper text
          below is the first line of that defence. */}
      {facility ? (
        <div className="border-t border-line pt-6 space-y-6">
          <div>
            <h2 className="serif text-lg font-semibold">On your account</h2>
            <p className="ink-soft mt-1 text-xs">
              Billed to {facility.name}. Optional, and only for your own records.
            </p>
            {facility.patient ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                 style={{ background: 'rgba(200,169,106,.14)', color: 'var(--gold-warm)' }}>
                Booking for <strong>{facility.patient.name}</strong>
                {facility.patient.breed ? ` · ${facility.patient.breed}` : ''}
                {facility.patient.mobility ? ` · ${mobilityLabel(facility.patient.mobility)}` : ''}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="facilityRef">
                Your reference
              </label>
              <input
                {...fieldProps('facilityRef')}
                maxLength={80}
                defaultValue={facility.patient?.ref ?? ''}
              />
              <p className="ink-mute mt-1 text-xs">
                Your job number or shift code &mdash; e.g. DIAL-MWF or PO 4417. Please do not
                enter a medical record number.
              </p>
              <FieldError name="facilityRef" />
            </div>

            <div>
              <label className={labelCls} htmlFor="authorizedBy">
                Authorized by
              </label>
              <input {...fieldProps('authorizedBy')} maxLength={120} />
              <p className="ink-mute mt-1 text-xs">
                Who at {facility.name} approved this trip.
              </p>
              <FieldError name="authorizedBy" />
            </div>
          </div>

          <fieldset>
            <legend className={labelCls}>Who pays for this trip</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['facility', `${facility.name} \u2014 on account`],
                  ['passenger', `The ${facility.passengerNoun} pays`],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border px-5 min-h-[44px] inline-flex items-center text-sm transition ${
                    payer === value
                      ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/15 font-medium'
                      : 'border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="payer"
                    value={value}
                    className="sr-only"
                    checked={payer === value}
                    onChange={() => setPayer(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="ink-mute mt-2 text-xs">
              {payer === 'facility'
                ? 'Added to your weekly invoice. The ' +
                  facility.passengerNoun +
                  ' is not asked to pay and never sees your rate.'
                : 'We take payment from the ' +
                  facility.passengerNoun +
                  ' by secure link. It does not reach your invoice, and they never see your rate.'}
            </p>
          </fieldset>
        </div>
      ) : null}

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
                {estimate.escortCents > 0 ? ' · Tassy Escort included' : ''}
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
              {/* Never a guess — but a picked suggestion or a ZIP is enough to
                  stop this being a dead end. The old copy asked only for a ZIP,
                  which reads as odd next to an address field that offers
                  suggestions, and left people typing a street with no ZIP and
                  no price. Name the faster route first. */}
              Pick each address from the suggestions to see your price — or type the ZIP
              codes if the address is not listed.
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

/**
 * The descriptive half of a service label, for the decided line.
 *
 * Labels read "Tassy Scholar — school and after-school", so the brand is the
 * <strong> and this is the rest. Returns '' for anything without the dash
 * rather than guessing, so a relabelled line degrades to just the name.
 */
function serviceTail(value: string): string {
  const label = SERVICE_LINES.find((s) => s.value === value)?.label ?? '';
  const i = label.indexOf('—');
  return i === -1 ? '' : label.slice(i).trim();
}
