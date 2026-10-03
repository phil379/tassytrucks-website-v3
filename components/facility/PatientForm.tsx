'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { savePatient } from '@/app/facility/patients/actions';
import { facilityPatientSchema, passengerNoun } from '@/lib/facility';
import { PASSENGER_MOBILITY_OPTIONS } from '@/lib/trip-request';

/**
 * Add a saved passenger.
 *
 * WHAT IS NOT ON THIS FORM, deliberately: age, date of birth, medical record
 * number, diagnosis, condition, medication, insurance id. The walkthrough this
 * console came from showed DOB and MRN on every patient card. The helper text
 * under "Your reference" is the first line of defence; lib/facility.ts and a
 * CHECK constraint on the column are the other two.
 */
export default function PatientForm({ kind }: { kind: string }) {
  const noun = passengerNoun(kind);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      displayName: String(fd.get('displayName') ?? ''),
      mobility: String(fd.get('mobility') ?? '') || null,
      facilityRef: String(fd.get('facilityRef') ?? '') || null,
      accessNotes: String(fd.get('accessNotes') ?? '') || null,
    };

    // Same schema the server runs, so the two cannot disagree about what a
    // valid profile is — and the MRN guard fires in front of the person who
    // pasted it rather than after a round trip.
    const check = facilityPatientSchema.safeParse(payload);
    if (!check.success) {
      const next: Record<string, string> = {};
      for (const i of check.error.issues) {
        const k = i.path.join('.') || 'form';
        if (!next[k]) next[k] = i.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setFormError(null);
    setBusy(true);
    try {
      const res = await savePatient(payload);
      if (res.ok) {
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-gold inline-flex min-h-[44px] items-center gap-2 text-sm">
        <Plus size={15} aria-hidden="true" /> Add {noun}
      </button>
    );
  }

  const err = 'mt-1.5 text-sm text-[#f87171]';

  return (
    <form onSubmit={onSubmit} noValidate className="card-tile mt-2 p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="serif text-xl font-semibold">Add a {noun}</h3>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ink-mute p-1">
          <X size={18} />
        </button>
      </div>

      {formError && <p role="alert" className={err}>{formError}</p>}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="displayName">
            Name <span aria-hidden="true">*</span><span className="sr-only">(required)</span>
          </label>
          <input id="displayName" name="displayName" className="form-field" required maxLength={200} />
          {errors.displayName && <p className={err}>{errors.displayName}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="mobility">How they travel</label>
          <select id="mobility" name="mobility" className="form-field" defaultValue="">
            <option value="">Not sure yet</option>
            {PASSENGER_MOBILITY_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="ink-mute mt-1 text-xs">Sets the vehicle. Wheelchair books a ramp-equipped van.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="facilityRef">Your reference</label>
          <input id="facilityRef" name="facilityRef" className="form-field" maxLength={80} />
          <p className="ink-mute mt-1 text-xs">
            A room number or job code &mdash; e.g. Room 412. Please do not enter a medical record number.
          </p>
          {errors.facilityRef && <p className={err}>{errors.facilityRef}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="accessNotes">Getting to the door</label>
          <input id="accessNotes" name="accessNotes" className="form-field" maxLength={500} />
          <p className="ink-mute mt-1 text-xs">
            Logistics only &mdash; &ldquo;meet at the discharge desk&rdquo;, &ldquo;ramp, not the lift&rdquo;.
          </p>
          {errors.accessNotes && <p className={err}>{errors.accessNotes}</p>}
        </div>
      </div>

      <p className="ink-mute mt-5 text-xs leading-relaxed">
        We never ask for a diagnosis, a procedure, a date of birth or a medical record number
        &mdash; not here and not anywhere else.
      </p>

      <button type="submit" disabled={busy} className="btn-gold mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm">
        {busy ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <>Save {noun}</>}
      </button>
    </form>
  );
}
