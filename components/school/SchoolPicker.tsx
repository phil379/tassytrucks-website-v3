'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type SchoolHit = {
  id: string;
  name: string;
  address: string | null;
  level: string | null;
  kind: string;
  bell_am: string | null;
  bell_pm: string | null;
};

/**
 * Type-ahead over public.schools, with an escape hatch that always works.
 *
 * Why a list at all: the request form promises "routes are quoted by the run",
 * and a run is several children going to the SAME school. Free text gives you
 * "Ardrey Kell", "ardrey kell hs" and "AK High School" — three spellings of one
 * building — and no grouping query can build a run out of that.
 *
 * Why the escape hatch is not optional: a reference list must never be able to
 * block a booking. "Can't find your school?" takes free text, stores it, and
 * flags it for review. Same rule as the breed field, and the same rule that the
 * address field follows when Places is unavailable.
 *
 * Writes two hidden inputs so a plain form POST carries both: the resolved id
 * (or empty) and the display name, which is what a dispatcher reads.
 */
export default function SchoolPicker({
  nameField,
  idField,
  label = 'School',
  required,
  defaultName = '',
  defaultId = '',
  onPick,
}: {
  nameField: string;
  idField: string;
  label?: string;
  required?: boolean;
  defaultName?: string;
  defaultId?: string;
  onPick?: (hit: SchoolHit | null, typed: string) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState(defaultName);
  const [schoolId, setSchoolId] = useState(defaultId);
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [unlisted, setUnlisted] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced lookup. Skipped entirely once the parent says it is unlisted —
  // there is nothing to search for and the suggestions would be noise.
  useEffect(() => {
    if (unlisted || query.trim().length < 2 || schoolId) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/schools?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json().catch(() => ({ schools: [] }));
        if (!cancelled) {
          setHits(json.schools ?? []);
          setOpen(true);
        }
      } catch {
        // Network failure must not strand the parent: they can still type.
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, unlisted, schoolId]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(hit: SchoolHit) {
    setQuery(hit.name);
    setSchoolId(hit.id);
    setHits([]);
    setOpen(false);
    onPick?.(hit, hit.name);
  }

  function retype(v: string) {
    setQuery(v);
    // Editing after picking withdraws the resolution — the id must never
    // outlive the name it belonged to.
    if (schoolId) {
      setSchoolId('');
      onPick?.(null, v);
    } else {
      onPick?.(null, v);
    }
  }

  const field =
    'w-full rounded-lg border border-[color:var(--line)] bg-[#0f141a] px-3 py-3 text-base text-[color:var(--ink)] outline-none focus-visible:outline-3 focus-visible:outline-[color:var(--gold-warm)]';

  return (
    <div ref={boxRef}>
      <label className="block text-sm font-medium mb-1.5" htmlFor={`${listId}-input`}>
        {label} {required ? <span aria-hidden="true">*</span> : null}
        {required ? <span className="sr-only">(required)</span> : null}
      </label>

      <input
        id={`${listId}-input`}
        className={field}
        value={query}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        placeholder={unlisted ? "Your child's school" : 'Start typing…'}
        onChange={(e) => retype(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
      />

      {/* What the form actually submits. */}
      <input type="hidden" name={nameField} value={query} />
      <input type="hidden" name={idField} value={schoolId} />

      {open && hits.length > 0 && !unlisted && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className="mt-1 max-h-64 overflow-auto rounded-lg border border-[color:var(--line)] bg-[#0f141a]"
        >
          {hits.map((hit) => (
            <li key={hit.id} role="option" aria-selected={hit.id === schoolId}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="block w-full px-3 py-2.5 text-left text-sm hover:bg-white/5"
              >
                <span className="block">{hit.name}</span>
                {hit.address ? (
                  <span className="block text-xs text-[color:var(--ink-mute)]">{hit.address}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {schoolId ? (
        <p className="mt-1.5 text-xs text-[color:var(--ink-mute)]">
          Matched to our school list — we&rsquo;ll group your child&rsquo;s ride with that run.
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-[color:var(--ink-mute)]">
          {searching ? 'Searching…' : null}{' '}
          <button
            type="button"
            onClick={() => {
              setUnlisted(true);
              setHits([]);
              setOpen(false);
              setSchoolId('');
            }}
            className="underline"
          >
            Can&rsquo;t find your school?
          </button>{' '}
          {unlisted
            ? 'Type it in full and we’ll add it — this will not hold up your booking.'
            : null}
        </p>
      )}
    </div>
  );
}
