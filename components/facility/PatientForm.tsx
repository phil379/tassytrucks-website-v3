'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { savePatient } from '@/app/facility/patients/actions';
import { facilityPatientSchema, passengerNoun, isPetFacility, defaultServiceLineForKind } from '@/lib/facility';
import { mobilityOptionsFor, mobilityLabelFor } from '@/lib/trip-request';
import { BREEDS_BY_SPECIES, OTHER_BREED_SENTINEL } from '@/lib/pet-breeds';

const SPECIES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'bird', label: 'Bird' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Add a saved passenger.
 *
 * THE QUESTIONS CHANGE WITH THE FACILITY. A veterinary practice is not a
 * dialysis centre with different wording: it needs species and breed, and its
 * mobility list is carrier / leash / needs help getting in and out, not walks
 * unaided / walker / wheelchair. This form hardcoded the human list until
 * 2026-10-03, so a vet clinic saving a Labrador was asked whether the dog used
 * a wheelchair. mobilityOptionsFor() has always known better — the console
 * just never asked it.
 *
 * WHAT IS NOT ON THIS FORM FOR A HUMAN, deliberately: age, date of birth,
 * medical record number, diagnosis, condition, medication, insurance id. The
 * walkthrough this console came from showed DOB and MRN on every patient card.
 * The helper text under "Your reference" is the first line of defence;
 * facilityPatientSchema and a CHECK constraint on the column are the other two.
 * A pet's breed is not in that category — it sizes the vehicle.
 */
export default function PatientForm({ kind }: { kind: string }) {
  const noun = passengerNoun(kind);
  const isPet = isPetFacility(kind);
  const line = defaultServiceLineForKind(kind);
  const mobilityOptions = mobilityOptionsFor(line);
  const [species, setSpecies] = useState<string>('dog');
  const err = 'mt-1.5 text-sm text-[#f87171]';
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
      // Only a pet facility sends these; everyone else stores null.
      species: isPet ? String(fd.get('species') ?? '') || null : null,
      breed: isPet ? String(fd.get('breed') ?? '') || null : null,
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
          <label className="mb-1.5 block text-sm font-medium" htmlFor="mobility">
            {mobilityLabelFor(line)}
          </label>
          <select id="mobility" name="mobility" className="form-field" defaultValue="">
            <option value="">Not sure yet</option>
            {mobilityOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="ink-mute mt-1 text-xs">
            {isPet
              ? 'Sets the vehicle and how the driver handles the pickup.'
              : 'Sets the vehicle. Wheelchair books a ramp-equipped van.'}
          </p>
        </div>
      </div>

      {/* Species and breed, for a veterinary account only. The booking form has
          always asked per trip; saving them on the profile is what stops a
          clinic retyping "Labrador Retriever" twice a month. */}
      {isPet ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="species">Species</label>
            <select
              id="species"
              name="species"
              className="form-field"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              {SPECIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="breed">Breed</label>
            {/* A datalist, not a select: the lists are long and nobody's pet is
                guaranteed to be on one. Type anything, pick from the list if it
                helps. */}
            <input id="breed" name="breed" className="form-field" list="breed-options" maxLength={80} />
            <datalist id="breed-options">
              {(BREEDS_BY_SPECIES[species] ?? [])
                .filter((b) => b !== OTHER_BREED_SENTINEL)
                .map((b) => <option key={b} value={b} />)}
            </datalist>
            <p className="ink-mute mt-1 text-xs">Helps us send a vehicle with room for the carrier.</p>
            {errors.breed && <p className={err}>{errors.breed}</p>}
          </div>
        </div>
      ) : null}

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
        {isPet
          ? 'We never ask why the animal is going to the vet — only what we need to send the right vehicle.'
          : 'We never ask for a diagnosis, a procedure, a date of birth or a medical record number — not here and not anywhere else.'}
      </p>

      <button type="submit" disabled={busy} className="btn-gold mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm">
        {busy ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <>Save {noun}</>}
      </button>
    </form>
  );
}
