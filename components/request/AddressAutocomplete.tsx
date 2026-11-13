'use client';

/// <reference types="google.maps" />

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useGooglePlaces } from '@/lib/google-maps';
import { pickTypedMatch, splitUnit } from '@/lib/address-match';

/**
 * Address field with Google Places suggestions.
 *
 * Two rules govern everything here.
 *
 * 1. IT IS A TEXT INPUT FIRST. The suggestion list is an enhancement layered on
 *    a plain `<input name={name}>`. If there is no API key, if Google is down,
 *    if an ad blocker eats the script, or if the visitor simply types an
 *    address nobody has indexed — the field still works and the form still
 *    submits. A booking form that stops taking bookings because a third party
 *    is unreachable is worse than one with no autocomplete at all.
 *
 * 2. RESOLVED DATA NEVER OUTLIVES THE TEXT IT DESCRIBES. place_id and
 *    coordinates are set only when the visitor picks a suggestion, and cleared
 *    the moment they edit the text afterwards. Coordinates pointing at an
 *    address the customer already corrected would send a driver to the wrong
 *    door with full confidence.
 *
 * Accessibility: this is a real combobox, not a div with a click handler —
 * role="combobox" with aria-expanded/aria-controls/aria-activedescendant, a
 * role="listbox" of role="option"s, arrow-key navigation, Enter to choose,
 * Escape to dismiss. Options are 48px tall so they can be hit with a thumb.
 */

/** Charlotte (Uptown). Suggestions are biased here, not restricted to it. */
const CHARLOTTE = { lat: 35.2271, lng: -80.8431 };
/** Places API (New) caps the bias radius at 50,000m. */
const BIAS_RADIUS_M = 49_000;

/** Under the field when something is typed and nothing is picked. */
export const TAP_HINT =
  'Tap your address in the list so we can price your trip. Click back into the box to see the list.';
/** The same instruction on top of the open list, where "click back to see the list" would be odd. */
export const TAP_HINT_OPEN = 'Tap your address in the list so we can price your trip.';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;

export type ResolvedPlace = {
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  prediction: google.maps.places.PlacePrediction;
};

export default function AddressAutocomplete({
  name,
  apiKey,
  label,
  required,
  autoComplete,
  hasError,
  describedBy,
  defaultValue = '',
  initialPlace,
  onResolve,
  onText,
  onSuggestionsReady,
  debug = false,
}: {
  name: string;
  apiKey: string | undefined;
  label: string;
  required?: boolean;
  autoComplete?: string;
  hasError?: boolean;
  describedBy?: string;
  defaultValue?: string;
  /**
   * A place that is already picked when the field first renders (the /airport hotel link). It is
   * dropped the moment the visitor edits the text, like any picked place (rule 2).
   */
  initialPlace?: ResolvedPlace;
  /**
   * Fires whenever the resolved place changes, INCLUDING to null when the
   * visitor edits the text after picking. The parent needs that null as much as
   * it needs the coordinates: it is the signal to withdraw a price estimate
   * that no longer describes the address on screen.
   */
  onResolve?: (place: ResolvedPlace | null) => void;
  /**
   * Fires on every keystroke with the raw text in the field.
   *
   * This is what keeps pricing alive when Places cannot help: no Maps key, an
   * address typed rather than picked, or Google having a bad afternoon. The ZIP
   * inside this string is enough to put a real estimate on screen — see
   * lib/zip-centroids.ts — and a blank panel loses the booking outright.
   */
  onText?: (value: string) => void;
  /**
   * Fires with true once Google's suggestions are loaded and working, false while they
   * are not (no key, blocked script, still loading).
   *
   * The form only INSISTS that an address be picked when this is true. If suggestions
   * cannot load there is nothing to pick from, and a form that refused to submit would
   * stop taking bookings because a third party is down - rule 1 above.
   */
  onSuggestionsReady?: (ready: boolean) => void;
  /**
   * Operator-only. Shows why suggestions are off instead of failing silently.
   * Never on for a customer — see the note in lib/google-maps.ts.
   */
  debug?: boolean;
}) {
  const { places, failed, status } = useGooglePlaces(apiKey);

  const [text, setText] = useState(defaultValue);
  const [resolved, setResolved] = useState<ResolvedPlace | null>(initialPlace ?? null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** Typed, left the field, and nothing was picked or matched: show the "tap your address" line. */
  const [needsPick, setNeedsPick] = useState(false);
  // What the blur handler reads 150ms later, after any tap on a suggestion has landed.
  const textRef = useRef(text);
  textRef.current = text;
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  // Reported to the parent via effect rather than inside the handlers, so the
  // parent sees exactly the value that rendered — no path can update one
  // without the other.
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;
  useEffect(() => {
    onResolveRef.current?.(resolved);
  }, [resolved]);

  // Same pattern for the raw text, for the same reason: report what rendered.
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  useEffect(() => {
    onTextRef.current?.(text);
  }, [text]);

  const onReadyRef = useRef(onSuggestionsReady);
  onReadyRef.current = onSuggestionsReady;
  const suggestionsReady = Boolean(places);
  useEffect(() => {
    onReadyRef.current?.(suggestionsReady);
  }, [suggestionsReady]);

  const listId = useId();
  const statusId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  /** Guards against an older, slower request overwriting a newer one. */
  const requestSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!places) return;
      const seq = ++requestSeq.current;

      if (!sessionToken.current) {
        sessionToken.current = new places.AutocompleteSessionToken();
      }

      try {
        const { suggestions: results } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionToken.current,
            includedRegionCodes: ['us'],
            locationBias: {
              center: new google.maps.LatLng(CHARLOTTE.lat, CHARLOTTE.lng),
              radius: BIAS_RADIUS_M,
            },
          });

        if (seq !== requestSeq.current) return; // a newer keystroke won

        const mapped: Suggestion[] = [];
        for (const result of results) {
          const prediction = result.placePrediction;
          if (!prediction?.placeId) continue;
          mapped.push({
            placeId: prediction.placeId,
            mainText: prediction.mainText?.toString() ?? prediction.text.toString(),
            secondaryText: prediction.secondaryText?.toString() ?? '',
            prediction,
          });
        }

        setSuggestions(mapped);
        setOpen(mapped.length > 0);
        setActiveIndex(-1);
      } catch {
        // A failed lookup is not a failed form. Drop the list and move on.
        if (seq !== requestSeq.current) return;
        setSuggestions([]);
        setOpen(false);
      }
    },
    [places],
  );

  /**
   * A complete address that was typed or pasted, then left (Muse F21 and item 24, 2026-11-13).
   * Before this, only a tapped suggestion priced the trip, so a rider who typed the whole address
   * and tabbed on saw "Pick your address to see your price" and concluded the form was broken.
   *
   * Ask Google once for what was typed. If a suggestion IS that address (lib/address-match.ts:
   * same street number and street; the typed city if one was typed, otherwise the Charlotte
   * match) take it, exactly as a tap would. Anything less certain is not guessed at: the visitor
   * is told, in words, to tap their address.
   *
   * An apartment typed in this box ("... Apt 200") stops Google matching the building, so it is
   * left out of the question and moved to the Apt box underneath, where dispatch reads it.
   */
  async function matchTyped() {
    const typed = textRef.current.trim();
    if (!places || resolvedRef.current || typed.length < MIN_QUERY_LENGTH) return;
    const { street, unit } = splitUnit(typed);
    const seq = ++requestSeq.current;
    try {
      if (!sessionToken.current) sessionToken.current = new places.AutocompleteSessionToken();
      const { suggestions: results } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: street,
        sessionToken: sessionToken.current,
        includedRegionCodes: ['us'],
        locationBias: {
          center: new google.maps.LatLng(CHARLOTTE.lat, CHARLOTTE.lng),
          radius: BIAS_RADIUS_M,
        },
      });
      // The visitor came back and typed, or tapped a suggestion, while we were asking.
      if (seq !== requestSeq.current || resolvedRef.current || textRef.current.trim() !== typed) return;

      const mapped: Suggestion[] = [];
      for (const result of results) {
        const prediction = result.placePrediction;
        if (!prediction?.placeId) continue;
        mapped.push({
          placeId: prediction.placeId,
          mainText: prediction.mainText?.toString() ?? prediction.text.toString(),
          secondaryText: prediction.secondaryText?.toString() ?? '',
          prediction,
        });
      }
      const hit = mapped[pickTypedMatch(typed, mapped)];
      if (hit) {
        if (unit) {
          // Uncontrolled input rendered by the form right under this field. Never overwrite
          // something the visitor already typed there.
          const box = document.getElementById(name.replace(/Address$/, 'Unit'));
          if (box instanceof HTMLInputElement && !box.value) box.value = unit.slice(0, box.maxLength > 0 ? box.maxLength : 40);
        }
        await choose(hit);
        return;
      }
      // Keep the list ready so one tap back into the field shows it.
      setSuggestions(mapped);
      setNeedsPick(true);
    } catch {
      // A failed lookup is not a failed form. Say what to do and move on.
      setNeedsPick(true);
    }
  }

  function onTextChange(next: string) {
    setText(next);
    setNeedsPick(false);
    // Any edit invalidates a previously picked place. See rule 2 above.
    if (resolved) setResolved(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!places || next.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceTimer.current = setTimeout(() => void fetchSuggestions(next.trim()), DEBOUNCE_MS);
  }

  async function choose(suggestion: Suggestion) {
    const fallback = [suggestion.mainText, suggestion.secondaryText].filter(Boolean).join(', ');
    setText(fallback);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    setNeedsPick(false);

    // Optimistic: keep the address even if resolving the details fails, so the
    // visitor never watches their choice disappear.
    setResolved({ address: fallback, placeId: suggestion.placeId });

    try {
      const place = suggestion.prediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location', 'id'] });
      const address = place.formattedAddress ?? fallback;
      setText(address);
      setResolved({
        address,
        placeId: place.id ?? suggestion.placeId,
        lat: place.location?.lat(),
        lng: place.location?.lng(),
      });
    } catch {
      // Keep the optimistic value. The row lands without coordinates, which is
      // exactly what a typed address does, and dispatch is unaffected.
    } finally {
      // A session ends when a place is selected. The next keystroke starts a
      // new one — this is what keeps autocomplete billing per-session.
      sessionToken.current = null;
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        event.preventDefault();
      }
      // Enter in an address box means "I have finished typing this address",
      // never "submit the whole form". Letting it through submits a form the
      // visitor is still filling in and answers them with a wall of red
      // validation errors — which is exactly what happened to the first person
      // who tried this field. The page has a large, obvious submit button.
      if (event.key === 'Enter') event.preventDefault();
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        break;
      case 'Enter':
        // Always swallowed while the list is open, whether or not a row is
        // highlighted. With suggestions on screen, Enter unambiguously means
        // "take one" — and if none is highlighted it means "I am done here",
        // which is still not a request to submit an unfinished form.
        event.preventDefault();
        if (activeIndex >= 0) void choose(suggestions[activeIndex]!);
        else setOpen(false);
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const listOpen = open && suggestions.length > 0;
  const activeId = activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;
  const help = [describedBy, statusId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1.5" htmlFor={name}>
        {label}{' '}
        {required && (
          <>
            <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      <input
        id={name}
        name={name}
        type="text"
        className="form-field"
        required={required}
        autoComplete={autoComplete}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setNeedsPick(false);
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay so a click on an option lands before the list unmounts.
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            // A keystroke lookup still waiting on its 250ms timer would otherwise fire after
            // this, cancel the match below (newest request wins) and reopen the list on a
            // field nobody is in. That is how a quickly typed destination never priced.
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            void matchTyped();
          }, 150);
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={hasError || undefined}
        aria-describedby={help}
      />

      {/*
        Announced to screen readers only. A sighted user sees the list appear;
        without this a screen reader user gets no signal that anything changed.
      */}
      <p id={statusId} className="sr-only" aria-live="polite">
        {open && suggestions.length > 0
          ? `${suggestions.length} address ${suggestions.length === 1 ? 'suggestion' : 'suggestions'} available. Use the arrow keys to review them.`
          : ''}
      </p>

      {/*
        The "tap your address" line sits on top of the open list (Muse item 25): under the
        input it would be covered by the list it is talking about.
      */}
      <div
        className={
          listOpen
            ? 'absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-[#0f141a] shadow-xl'
            : 'hidden'
        }
      >
        {listOpen && !resolved && (
          <p className="border-b border-line px-4 py-2 text-xs" data-testid={`${name}-pick-hint`}>
            {TAP_HINT_OPEN}
          </p>
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placeId}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${
                index === activeIndex ? 'bg-[color:var(--gold)]/20' : ''
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              // onMouseDown, not onClick: mousedown fires before the input's blur,
              // so the choice registers even though blur is racing to close the list.
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(suggestion);
              }}
            >
              <MapPin className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">{suggestion.mainText}</span>
                {suggestion.secondaryText && (
                  <span className="ink-soft block truncate text-xs">{suggestion.secondaryText}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/*
        What the form actually posts alongside the text. Empty unless a
        suggestion was picked AND resolved — see rule 2.
      */}
      <input type="hidden" name={`${name}PlaceId`} value={resolved?.placeId ?? ''} />
      <input type="hidden" name={`${name}Lat`} value={resolved?.lat ?? ''} />
      <input type="hidden" name={`${name}Lng`} value={resolved?.lng ?? ''} />

      {/*
        Something is typed and no address is picked. Plain words, visible, and announced. Shown
        while typing as well as after leaving the field (Muse item 25): it used to wait for a
        failed match on blur and vanish again on focus, so "Charlotte" alone never showed it.
      */}
      {!listOpen && !resolved && (needsPick || (text.trim() !== '' && suggestions.length > 0)) && (
        <p className="mt-1.5 text-xs" role="status" data-testid={`${name}-pick-hint`}>
          {TAP_HINT}
        </p>
      )}

      {/* Deliberately silent when `failed` — see rule 1. Nothing is broken. */}
      {!failed && !places && (
        <p className="ink-soft mt-1.5 text-xs" aria-hidden="true">
          Loading address suggestions…
        </p>
      )}

      {debug && (
        <p
          data-testid={`${name}-maps-status`}
          className="ink-soft mt-1.5 font-mono text-xs"
          aria-hidden="true"
        >
          {status === 'ready' && 'suggestions: on'}
          {status === 'loading' && 'suggestions: loading…'}
          {status === 'no-key' && 'suggestions: OFF — GOOGLE_MAPS_API_KEY is not set on this deployment'}
          {status === 'load-failed' &&
            'suggestions: OFF — Google rejected the key. Check (1) Maps JavaScript API + Places API (New) enabled, (2) this domain on the referrer allowlist, (3) billing on. Console has the exact error.'}
        </p>
      )}
    </div>
  );
}
