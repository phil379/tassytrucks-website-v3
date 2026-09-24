import { test, expect } from '@playwright/test';
import {
  TRIP_DETAILS,
  describeDetails,
  detailsFor,
  fieldVisible,
  validateDetails,
} from '../../lib/trip-details';
import { SERVICE_VALUES } from '../../lib/trip-request';
import { BREEDS_BY_SPECIES } from '../../lib/pet-breeds';

/**
 * The questions each service line asks about who or what is travelling.
 *
 * The bug behind this file: Winnie Ride captured a pet COUNT and then asked for
 * a first and last name, which a pet owner reads as a request for their dog's
 * surname. Scholar captured no school. Recovery captured nobody signing the
 * patient out. See lib/trip-details.ts.
 */

test.describe('the spec itself', () => {
  test('every requestable line either asks its own questions or deliberately asks none', () => {
    for (const line of SERVICE_VALUES) {
      const section = detailsFor(line);
      // Today all five ask something. If a line is ever added with nothing to
      // ask, this asserts the engine still answers rather than throwing.
      expect(section === null || section.fields.length > 0).toBe(true);
    }
  });

  test('the five live lines all have a section with a heading', () => {
    for (const line of ['pet', 'care', 'recovery', 'concierge', 'scholar']) {
      const section = detailsFor(line);
      expect(section, `${line} should have a section`).toBeTruthy();
      expect(section!.title.length).toBeGreaterThan(3);
    }
  });

  test('keys are unique inside a section', () => {
    for (const [line, section] of Object.entries(TRIP_DETAILS)) {
      const keys = section!.fields.map((f) => f.key);
      expect(new Set(keys).size, `${line} has a duplicate key`).toBe(keys.length);
    }
  });

  test('every select offers options and every conditional points at a real field', () => {
    for (const [line, section] of Object.entries(TRIP_DETAILS)) {
      const keys = new Set(section!.fields.map((f) => f.key));
      for (const field of section!.fields) {
        if (field.type === 'select') {
          expect((field.options ?? []).length, `${line}.${field.key}`).toBeGreaterThan(1);
        }
        if (field.showWhen) {
          expect(keys.has(field.showWhen.key), `${line}.${field.key} depends on a missing field`).toBe(true);
        }
      }
    }
  });

  /**
   * THE PRIVACY TRIPWIRE. Nothing on this form may ask for a diagnosis, a
   * procedure, a condition or a medication — see the header of
   * lib/trip-details.ts for why. "What procedure are you having?" is the single
   * most useful dispatch question nobody here is allowed to ask, and it is the
   * one a future edit will reach for first.
   */
  test('no field asks a clinical question', () => {
    const banned = /diagnos|procedure|medication|prescription|symptom|condition|treatment/i;
    for (const [line, section] of Object.entries(TRIP_DETAILS)) {
      for (const field of section!.fields) {
        expect(banned.test(field.key), `${line}.${field.key} key`).toBe(false);
        expect(banned.test(field.label), `${line}.${field.key} label`).toBe(false);
        for (const option of field.options ?? []) {
          expect(banned.test(option.label), `${line}.${field.key} option`).toBe(false);
        }
      }
    }
  });
});

test.describe('validation', () => {
  const VALID_PET = {
    pet_name: 'Winnie',
    species: 'dog',
    breed: 'Goldendoodle',
    rabies: 'current',
    carrier: 'owner',
  };

  test('a complete pet block passes and keeps its answers', () => {
    const result = validateDetails('pet', VALID_PET);
    expect(result.ok).toBe(true);
    expect(result.values.pet_name).toBe('Winnie');
    expect(result.values.breed).toBe('Goldendoodle');
  });

  test('a missing required answer is an error, not a silent null', () => {
    const result = validateDetails('pet', { ...VALID_PET, pet_name: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.pet_name).toContain('required');
  });

  test('unknown keys are dropped, never stored and never a 400', () => {
    const result = validateDetails('pet', { ...VALID_PET, sneaky: 'value', __proto__: 'x' });
    expect(result.ok).toBe(true);
    expect(result.values.sneaky).toBeUndefined();
  });

  test('a select must match a declared option', () => {
    const result = validateDetails('pet', { ...VALID_PET, species: 'dragon' });
    expect(result.ok).toBe(false);
  });

  test('numbers outside the declared bounds are rejected', () => {
    expect(validateDetails('pet', { ...VALID_PET, weight_lbs: '5000' }).ok).toBe(false);
    expect(validateDetails('pet', { ...VALID_PET, weight_lbs: '42' }).ok).toBe(true);
    expect(validateDetails('pet', { ...VALID_PET, weight_lbs: 'heavy' }).ok).toBe(false);
  });

  test('a number is stored as a number, not the string that arrived', () => {
    const result = validateDetails('pet', { ...VALID_PET, age_years: '7' });
    expect(result.values.age_years).toBe(7);
  });

  test('free text is trimmed and truncated rather than stored raw', () => {
    const result = validateDetails('pet', { ...VALID_PET, pet_notes: `  ${'x'.repeat(900)}  ` });
    expect(String(result.values.pet_notes).length).toBe(300);
  });

  /**
   * The one that bites in production: pick Airport, type a flight number,
   * change your mind and pick Golf. That flight number must not reach the
   * database, where a dispatcher would read it as current.
   */
  test('an answer to a question no longer on screen is discarded', () => {
    const airport = validateDetails('concierge', {
      occasion: 'airport',
      airline: 'American',
      flight_number: 'AA1423',
    });
    expect(airport.values.flight_number).toBe('AA1423');

    const golf = validateDetails('concierge', {
      occasion: 'golf',
      airline: 'American',
      flight_number: 'AA1423',
    });
    expect(golf.ok).toBe(true);
    expect(golf.values.flight_number).toBeUndefined();
    expect(golf.values.airline).toBeUndefined();
  });

  test('a hidden required field does not block the form', () => {
    // responsible_adult_name is required-looking but only appears for one
    // answer. Leaving it unanswered while hidden must not fail the request.
    const result = validateDetails('recovery', {
      patient_is: 'self',
      responsible_adult: 'me',
      support_to_car: 'unaided',
    });
    expect(result.ok).toBe(true);
  });

  test('fieldVisible follows the answer it depends on', () => {
    const field = detailsFor('recovery')!.fields.find((f) => f.key === 'responsible_adult_name')!;
    expect(fieldVisible(field, { responsible_adult: 'someone_else' })).toBe(true);
    expect(fieldVisible(field, { responsible_adult: 'me' })).toBe(false);
    expect(fieldVisible(field, {})).toBe(false);
  });

  test('a line with no section accepts anything and stores nothing', () => {
    const result = validateDetails('nonexistent-line', { anything: 'at all' });
    expect(result.ok).toBe(true);
    expect(Object.keys(result.values)).toHaveLength(0);
  });

  test('garbage in place of an object does not throw', () => {
    for (const junk of [null, undefined, 'string', 42, [1, 2, 3]]) {
      expect(() => validateDetails('pet', junk)).not.toThrow();
    }
  });

  test('Scholar needs the school, because the route is what is priced', () => {
    const missing = validateDetails('scholar', {
      student_first_name: 'Frank',
      schedule: 'both',
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.school_name).toBeTruthy();
  });

  test('Recovery asks who signs the patient out', () => {
    const result = validateDetails('recovery', {
      patient_is: 'family',
      support_to_car: 'an_arm',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.responsible_adult).toBeTruthy();
  });
});

test.describe('what the dispatcher reads', () => {
  test('stored codes resolve back to the words the customer saw', () => {
    const described = describeDetails('care', {
      rider_is: 'family',
      assistance: 'through',
      rider_first_name: 'Maria',
    });
    const assistance = described.find((d) => d.key === 'assistance');
    expect(assistance?.label).toBe('How much help do they need?');
    expect(assistance?.value).toContain('Door through door');
  });

  test('an answer whose question has since been retired still renders', () => {
    const described = describeDetails('care', { retired_question: 'an old answer' });
    expect(described).toHaveLength(1);
    expect(described[0]!.value).toBe('an old answer');
  });

  test('nothing stored means nothing to render', () => {
    expect(describeDetails('care', null)).toHaveLength(0);
    expect(describeDetails('care', {})).toHaveLength(0);
  });
});

test.describe('breed suggestions', () => {
  test('every species the form offers has a list, or is deliberately open', () => {
    const species = detailsFor('pet')!.fields.find((f) => f.key === 'species')!;
    for (const option of species.options!) {
      expect(BREEDS_BY_SPECIES[option.value], `no list for ${option.value}`).toBeDefined();
    }
  });

  test('a breed that is not on the list is still accepted', () => {
    const result = validateDetails('pet', {
      pet_name: 'Bo',
      species: 'dog',
      rabies: 'current',
      carrier: 'owner',
      breed: 'Bakharwal Dog',
    });
    expect(result.ok).toBe(true);
    expect(result.values.breed).toBe('Bakharwal Dog');
  });
});
