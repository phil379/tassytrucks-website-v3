'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { matchBreeds } from '@/lib/breed-match';

/**
 * The breed field: a text input with tappable suggestions underneath.
 *
 * It replaces a native <datalist>. A datalist hands the suggestion UI to the
 * browser, and on phones that UI is unreliable: some browsers show nothing, or a
 * strip above the keyboard, or only after a second tap. A staff user chose Dog,
 * typed "F" and was never offered French Bulldog. This renders the list itself,
 * so what appears is the same everywhere.
 *
 * Same shape as SchoolPicker, and the same rule: the list can never block a
 * booking. Whatever is typed is what is submitted, listed or not, and the list is
 * plain text with no id behind it, so the value stays an ordinary string.
 *
 * Keyboard: ArrowDown / ArrowUp move through the options (ArrowDown also reopens
 * a closed list), Enter picks the highlighted one, Escape closes the list and
 * keeps what was typed. Enter with nothing highlighted does what Enter always did
 * in this form, so a typed breed is never swallowed.
 */
export default function BreedCombobox({
  id,
  name,
  value,
  onChange,
  suggestions,
  placeholder,
  maxLength,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly string[];
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = `${useId().replace(/:/g, '')}-list`;
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const hits = useMemo(() => matchBreeds(value, suggestions), [value, suggestions]);
  const showing = open && hits.length > 0;

  // A new set of hits means the old highlight points at the wrong row.
  useEffect(() => {
    setActive(-1);
  }, [hits]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, listId]);

  function pick(breed: string) {
    onChange(breed);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      if (hits.length === 0) return;
      e.preventDefault();
      if (!showing) {
        setOpen(true);
        setActive(0);
      } else {
        setActive((i) => (i + 1) % hits.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (!showing) return;
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (showing && active >= 0) {
        e.preventDefault();
        pick(hits[active]);
      }
    } else if (e.key === 'Escape') {
      if (showing) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setActive(-1);
      }
    }
  }

  return (
    <div
      ref={boxRef}
      onBlur={(e) => {
        // Focus moved somewhere outside the field and its list: close. Tapping an
        // option keeps focus in the input (see onMouseDown below), so it never lands here.
        if (!boxRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input
        id={id}
        name={name}
        type="text"
        className="form-field"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showing && active >= 0 ? `${listId}-opt-${active}` : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim() && hits.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {showing && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Breed suggestions"
          className="mt-1 max-h-64 overflow-auto rounded-lg border border-[color:var(--line)] bg-[#0f141a]"
        >
          {hits.map((breed, i) => (
            <li
              key={breed}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown would move focus off the input, closing the phone keyboard
              // and the list before the tap registers. Keep focus; pick on click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(breed)}
              className={`flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-left text-sm hover:bg-white/5 ${
                i === active ? 'bg-white/10 border-l-4 border-[color:var(--gold-warm)]' : 'border-l-4 border-transparent'
              }`}
            >
              {breed}
            </li>
          ))}
        </ul>
      )}

      {/* Screen readers: the list appearing is otherwise silent. */}
      <p className="sr-only" aria-live="polite">
        {showing ? `${hits.length} breed suggestion${hits.length === 1 ? '' : 's'} available.` : ''}
      </p>
    </div>
  );
}
