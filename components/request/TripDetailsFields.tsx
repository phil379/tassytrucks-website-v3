'use client';

import { useId } from 'react';
import {
  detailsFor,
  fieldVisible,
  type DetailField,
  type DetailSection,
} from '@/lib/trip-details';
import { BREEDS_BY_SPECIES } from '@/lib/pet-breeds';
import SchoolPicker from '@/components/school/SchoolPicker';

/**
 * The "who or what is travelling" block, rendered from lib/trip-details.ts.
 *
 * Two things here are deliberate and easy to undo by accident.
 *
 * 1. THE SECTION HAS A HEADING. The bug that started this was a pet owner
 *    reading "First name / Last name" — the human contact fields — as the form
 *    asking for their dog's surname, because nothing on screen separated the
 *    two. Every block on this form now says whose answers it wants.
 *
 * 2. BREED IS A TEXT INPUT WITH SUGGESTIONS, NOT A DROPDOWN. The list is long
 *    and still incomplete; a closed <select> would turn "my dog is a breed you
 *    have not heard of" into a booking that cannot be submitted. The datalist
 *    helps the 95% and the other 5% just type.
 */
export default function TripDetailsFields({
  service,
  values,
  errors,
  onChange,
}: {
  service: string;
  values: Record<string, string>;
  /** Keyed by the plain field key, not the `details.` prefixed path. */
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const section: DetailSection | null = detailsFor(service);
  const listPrefix = useId().replace(/:/g, '');

  if (!section) return null;

  const visible = section.fields.filter((f) => fieldVisible(f, values));

  return (
    <fieldset className="rounded-xl border border-line p-4 sm:p-5">
      <legend className="serif px-2 text-lg font-semibold">{section.title}</legend>
      {section.intro && <p className="ink-soft -mt-1 mb-4 text-xs">{section.intro}</p>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {visible.map((field) => (
          <div key={field.key} className={field.half ? '' : 'sm:col-span-2'}>
            <Row
              field={field}
              value={values[field.key] ?? ''}
              error={errors[field.key]}
              listId={field.suggestFrom ? `${listPrefix}-${field.key}` : undefined}
              suggestions={suggestionsFor(field, values)}
              onChange={(next) => onChange(field.key, next)}
              idValue={values[`${field.key}_id`] ?? ''}
              onChangeId={(next) => onChange(`${field.key}_id`, next)}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function suggestionsFor(field: DetailField, values: Record<string, string>): string[] {
  if (!field.suggestFrom) return [];
  const key = values[field.suggestFrom] ?? '';
  return BREEDS_BY_SPECIES[key] ?? [];
}

function Row({
  field,
  value,
  error,
  listId,
  suggestions,
  onChange,
  idValue,
  onChangeId,
}: {
  field: DetailField;
  value: string;
  error?: string;
  listId?: string;
  suggestions: string[];
  onChange: (value: string) => void;
  /** Only the `school` type uses these: the resolved id alongside the name. */
  idValue: string;
  onChangeId: (value: string) => void;
}) {
  const id = `details-${field.key}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [error ? errorId : null, field.help ? helpId : null]
    .filter(Boolean)
    .join(' ');

  const shared = {
    id,
    name: id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy || undefined,
    className: 'form-field',
    value,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  };

  return (
    <>
      {/*
        SchoolPicker renders its own <label> bound to its own input, so emitting
        one here too would give the field two labels — the second pointing at an
        id that does not exist.
      */}
      {field.type !== 'school' && (
        <label className="mb-1.5 block text-sm font-medium" htmlFor={id}>
          {field.label}
          {field.required && (
            <>
              {' '}
              <span aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </label>
      )}

      {field.type === 'school' ? (
        /*
          A run is several children going to the SAME school, so the name has to
          resolve to a row rather than be typed. The picker still accepts free
          text — a school missing from the list must never cost a booking — and
          a null id is what puts the trip in the review queue.
        */
        <SchoolPicker
          nameField={`${id}-name`}
          idField={`${id}-id`}
          label={field.label}
          required={field.required}
          defaultName={value}
          defaultId={idValue}
          onPick={(hit, typed) => {
            onChange(typed);
            onChangeId(hit?.id ?? '');
          }}
        />
      ) : field.type === 'select' ? (
        <select {...shared}>
          <option value="">Select…</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea {...shared} rows={3} maxLength={field.max} placeholder={field.placeholder} />
      ) : field.type === 'checkbox' ? (
        <input
          id={id}
          name={id}
          type="checkbox"
          className="h-6 w-6 rounded border-line"
          checked={value === 'true'}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.checked ? 'true' : '')}
        />
      ) : (
        <>
          <input
            {...shared}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            inputMode={field.type === 'number' ? 'numeric' : undefined}
            min={field.type === 'number' ? field.min : undefined}
            max={field.type === 'number' ? field.maxValue : undefined}
            maxLength={field.type === 'text' ? field.max : undefined}
            placeholder={field.placeholder}
            list={listId && suggestions.length > 0 ? listId : undefined}
            autoComplete="off"
          />
          {listId && suggestions.length > 0 && (
            <datalist id={listId}>
              {suggestions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </>
      )}

      {field.help && (
        <p id={helpId} className="ink-soft mt-1.5 text-xs">
          {field.help}
        </p>
      )}
      {error && (
        <p id={errorId} className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
