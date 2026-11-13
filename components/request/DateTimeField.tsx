'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Date and time, as two plain fields instead of one `datetime-local`.
 *
 * WHY (Muse testing, 2026-11-13): typing into the single native field corrupted the year three
 * times in five bookings ("111320", "202607"), because the browser's year segment takes six
 * digits and keeps swallowing keystrokes meant for the next segment. Older riders type rather
 * than pick, and this is the first field after the addresses.
 *
 * The first fix kept a native `type="date"` with a `max`. A `max` limits what is VALID, not what
 * can be TYPED: the re-test still produced "11/14/0261". So:
 *
 *   - Date: a plain text box that formats what is typed as MM/DD/YYYY and takes eight digits,
 *     never more. Pasting works ("11/21/2026", "2026-11-14"). The calendar button beside it is a
 *     convenience that fills the same box; nothing depends on the browser's own picker.
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

/**
 * Formats what is being typed as MM/DD/YYYY. Eight digits and no more, which is what stops a
 * fifth year digit. "1/5/" becomes "01/05/", so a rider who types the slashes is not punished.
 */
export function maskDate(raw: string): string {
  const parts = raw.split(/[/.\-]/);
  let digits = '';
  parts.forEach((part, i) => {
    const d = part.replace(/\D/g, '');
    // A one-digit month or day followed by a separator the rider typed: "1/" means "01".
    digits += i < parts.length - 1 && i < 2 && d.length === 1 ? `0${d}` : d;
  });
  digits = digits.slice(0, 8);
  const typedSeparator = parts.length > 1 && /[/.\-]$/.test(raw);
  if (digits.length <= 2) return digits + (typedSeparator && digits.length === 2 ? '/' : '');
  if (digits.length <= 4)
    return `${digits.slice(0, 2)}/${digits.slice(2)}` + (typedSeparator && digits.length === 4 && parts.length > 2 ? '/' : '');
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "2026-11-14" as "11/14/2026". */
export function toUsDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

/**
 * Checks a typed date. Returns the date as "YYYY-MM-DD", or the sentence to show the rider.
 * `min` and `max` are "YYYY-MM-DD" and compared as text, so no time zone is involved.
 */
export function validateDate(masked: string, min: string, max: string): { date: string } | { error: string } {
  const example = toUsDate(min) || '11/14/2026';
  const invalid = { error: `Enter a valid date, for example ${example}.` };
  if (!/^\d{2}\/\d{2}\/(\d{2}|\d{4})$/.test(masked)) return invalid;
  const iso = parsePastedDate(masked);
  if (!iso) return invalid;
  if (min && iso < min) return { error: 'That date has passed. Pick a date from today on.' };
  if (max && iso > max) return { error: 'We book up to one year ahead. Pick an earlier date.' };
  return { date: iso };
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
  onDateChange,
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
  /**
   * The date half on its own, "YYYY-MM-DD", or '' while it is empty or not a real date. The
   * price panel needs it before a time is chosen: a Saturday costs more whatever the hour.
   */
  onDateChange?: (date: string) => void;
  /** Earliest allowed moment, "YYYY-MM-DDTHH:mm". Only its date half limits the date. */
  minDateTime: string;
  required?: boolean;
  hasError?: boolean;
  describedBy?: string;
}) {
  const initial = split(value ?? '');
  /** The valid date behind the box, "YYYY-MM-DD", or ''. */
  const [date, setDate] = useState(initial.date);
  /** What the box shows, MM/DD/YYYY as far as it has been typed. */
  const [dateText, setDateText] = useState(toUsDate(initial.date));
  const [dateError, setDateError] = useState<string | null>(null);
  const [time, setTime] = useState(initial.time);

  // A time that is not on a 15-minute step (a prefilled link can carry one) still has to show.
  const options = time && !TIME_OPTIONS.includes(time) ? [...TIME_OPTIONS, time].sort() : TIME_OPTIONS;

  const minDate = minDateTime.slice(0, 10);
  const maxDate = minDate ? `${Number(minDate.slice(0, 4)) + 1}${minDate.slice(4)}` : '2099-12-31';

  function emit(nextDate: string, nextTime: string) {
    if (nextDate !== date) onDateChange?.(nextDate);
    setDate(nextDate);
    setTime(nextTime);
    onChange?.(nextDate && nextTime ? `${nextDate}T${nextTime}` : '');
  }

  /** Typed, pasted or picked: every route ends here, with the same box and the same value. */
  function takeText(nextText: string) {
    setDateText(nextText);
    const checked = validateDate(nextText, minDate, maxDate);
    // Only a full four-digit year counts while typing: "11/14/20" is on its way to 2026, not 2020.
    const complete = 'date' in checked && /\/\d{4}$/.test(nextText);
    if (complete) setDateError(null);
    emit(complete ? checked.date : '', time);
  }

  function takeIso(iso: string) {
    setDateError(null);
    takeText(toUsDate(iso));
  }

  const combined = date && time ? `${date}T${time}` : '';
  const errorId = `${name}-date-error`;
  const describe = [describedBy, dateError ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <span className="sr-only" id={`${name}-date-label`}>Date, month day year</span>
        <div className="relative">
          <input
            id={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/DD/YYYY"
            maxLength={10}
            className="form-field pr-12"
            value={dateText}
            required={required}
            aria-labelledby={`${name}-label ${name}-date-label`}
            aria-invalid={hasError || Boolean(dateError) || undefined}
            aria-describedby={describe}
            onChange={(e) => {
              const raw = e.target.value;
              // A whole date arriving at once (autofill, a test, a script): read it as pasted.
              const whole = /^\d{4}-\d{1,2}-\d{1,2}$/.test(raw.trim()) ? parsePastedDate(raw) : null;
              if (whole) takeIso(whole);
              else takeText(maskDate(raw));
            }}
            onPaste={(e) => {
              const parsed = parsePastedDate(e.clipboardData.getData('text'));
              if (parsed) {
                e.preventDefault();
                takeIso(parsed);
              }
            }}
            onBlur={() => {
              if (!dateText) {
                setDateError(null);
                return;
              }
              const checked = validateDate(dateText, minDate, maxDate);
              if ('error' in checked) {
                setDateError(checked.error);
                return;
              }
              // "11/14/26" is a real date; show it in full so the rider sees the year we took.
              setDateError(null);
              if (toUsDate(checked.date) !== dateText) takeText(toUsDate(checked.date));
            }}
          />
          {/*
            The calendar. The browser's own date control laid invisibly over the icon, so a tap
            opens the phone's date wheel or the desktop calendar. It fills the box above and is
            skipped by the keyboard and by screen readers: the text box is the field.
          */}
          <span className="absolute inset-y-0 right-0 flex w-12 items-center justify-center">
            <Calendar className="h-5 w-5 opacity-70" aria-hidden="true" />
            <input
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              data-testid={`${name}-calendar`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              min={minDate || undefined}
              max={maxDate}
              value={date}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {
                  // Not allowed here (an embedded frame). The text box still works.
                }
              }}
              onChange={(e) => {
                if (e.target.value) takeIso(e.target.value);
              }}
            />
          </span>
        </div>
        {dateError && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs" data-testid={errorId}>
            {dateError}
          </p>
        )}
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
