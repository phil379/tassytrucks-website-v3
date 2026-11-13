'use client';

import { useState } from 'react';

/**
 * Date and time, as two plain fields instead of one `datetime-local`.
 *
 * WHY (Muse testing, 2026-11-13): typing into the single native field corrupted the year three
 * times in five bookings ("111320", "202607"), because the browser's year segment takes six
 * digits and keeps swallowing keystrokes meant for the next segment. Older riders type rather
 * than pick, and this is the first field after the addresses.
 *
 *   - Date: a native date field WITH a `max`, which is what limits the year to four digits.
 *     Picking from the calendar still works, and so does pasting ("11/14/2026", "2026-11-14").
 *   - Time: a list in 15-minute steps. Nothing to mistype, no AM/PM segment.
 *
 * The form still posts ONE value under `name`, shaped "YYYY-MM-DDTHH:mm" exactly as before, so
 * the schema, the price engine and the server are unchanged. It is empty until both are chosen.
 */

const p2 = (n: number) => String(n).padStart(2, '0');

/** "10:00 AM" style label for a "HH:mm" value. */
function timeLabel(value: string): string {
  const [h, m] = value.split(':').map(Number) as [number, number];
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${p2(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) out.push(`${p2(h)}:${p2(m)}`);
  return out;
})();

/** Reads a pasted date in the shapes people actually paste. Returns "YYYY-MM-DD" or null. */
export function parsePastedDate(raw: string): string | null {
  const text = raw.trim();
  let y: number, mo: number, d: number;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/.exec(text);
    if (m) {
      [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (y < 100) y += 2000;
    } else {
      const t = Date.parse(text);
      if (Number.isNaN(t)) return null;
      const dt = new Date(t);
      [y, mo, d] = [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
    }
  }
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${p2(mo)}-${p2(d)}`;
}

/** Splits "YYYY-MM-DDTHH:mm" into its halves; anything else is two empty strings. */
function split(value: string): { date: string; time: string } {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return m ? { date: m[1]!, time: m[2]! } : { date: '', time: '' };
}

export default function DateTimeField({
  name,
  value,
  onChange,
  minDateTime,
  required,
  hasError,
  describedBy,
}: {
  /** The posted field name, and the id of the date input (what the label and error links point at). */
  name: string;
  /** Controlled value, "YYYY-MM-DDTHH:mm" or ''. Omit to let the field keep its own state. */
  value?: string;
  onChange?: (value: string) => void;
  /** Earliest allowed moment, "YYYY-MM-DDTHH:mm". Only its date half limits the calendar. */
  minDateTime: string;
  required?: boolean;
  hasError?: boolean;
  describedBy?: string;
}) {
  const initial = split(value ?? '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  // A time that is not on a 15-minute step (a prefilled link can carry one) still has to show.
  const options = time && !TIME_OPTIONS.includes(time) ? [...TIME_OPTIONS, time].sort() : TIME_OPTIONS;

  const minDate = minDateTime.slice(0, 10);
  // One year out. The `max` is also what stops the year segment taking five or six digits.
  const maxDate = minDate ? `${Number(minDate.slice(0, 4)) + 1}${minDate.slice(4)}` : '2099-12-31';

  function emit(nextDate: string, nextTime: string) {
    setDate(nextDate);
    setTime(nextTime);
    onChange?.(nextDate && nextTime ? `${nextDate}T${nextTime}` : '');
  }

  const combined = date && time ? `${date}T${time}` : '';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <span className="sr-only" id={`${name}-date-label`}>Date</span>
        <input
          id={name}
          type="date"
          className="form-field"
          min={minDate || undefined}
          max={maxDate}
          value={date}
          required={required}
          aria-labelledby={`${name}-label ${name}-date-label`}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          onChange={(e) => emit(e.target.value, time)}
          onPaste={(e) => {
            const parsed = parsePastedDate(e.clipboardData.getData('text'));
            if (parsed) {
              e.preventDefault();
              emit(parsed, time);
            }
          }}
        />
      </div>
      <div>
        <label className="sr-only" htmlFor={`${name}-time`}>Time</label>
        <select
          id={`${name}-time`}
          className="form-field"
          value={time}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          onChange={(e) => emit(date, e.target.value)}
        >
          <option value="">Choose a time</option>
          {options.map((t) => (
            <option key={t} value={t}>
              {timeLabel(t)}
            </option>
          ))}
        </select>
      </div>
      {/* The one value the form posts, in the shape the schema already expects. */}
      <input type="hidden" name={name} value={combined} data-testid={`${name}-value`} />
    </div>
  );
}
