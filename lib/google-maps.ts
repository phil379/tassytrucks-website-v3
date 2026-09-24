'use client';

/// <reference types="google.maps" />

import { useEffect, useState } from 'react';

/**
 * Minimal Google Maps JS loader for the address picker.
 *
 * Deliberately NOT `@googlemaps/js-api-loader`. That package reads `window` at
 * module top level, so a static import of it is evaluated during SSR and throws
 * `ReferenceError: window is not defined` — the exact failure that took down the
 * booking wizard subtree in the ops app (see its FIX_PROD_050 note). Injecting
 * the script tag ourselves cannot be evaluated on the server at all, because
 * every entry point here runs inside useEffect.
 *
 * The API key is necessarily public: Google's JS API runs in the browser and
 * there is no way to hide it. What protects it is an HTTP-referrer restriction
 * in Google Cloud Console, which must list every domain this site is served
 * from. An unrestricted key WILL be scraped and billed to you.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS DOES NOT TRUST script.onload  (fixed 2026-09-24)
 * ─────────────────────────────────────────────────────────────────────────────
 * The first version resolved from `script.onload`. On the live site that event
 * never arrived, while Google itself loaded perfectly — `importLibrary` was a
 * function, `google.maps.places.AutocompleteSuggestion` was a class, and a
 * hand-made call resolved in 82ms. The library was sitting there fully ready
 * and the form said "Loading address suggestions…" until the tab was closed.
 *
 * Two things made that a permanent failure rather than a blip:
 *   1. One missed event was the ONLY path to resolution.
 *   2. `loaderPromise` is cached at module scope, so a promise that never
 *      settles never settles again for the life of the page. Every later mount
 *      got handed the same dead promise.
 *
 * So readiness is now detected by POLLING for `google.maps.importLibrary`,
 * which is the thing we actually need, rather than by an event that merely
 * correlates with it. `onload` is still listened to — it just short-circuits
 * the poll instead of being the only way through. And the whole thing is
 * bounded by a timeout, so the worst case is a field that degrades to plain
 * text and an operator-visible reason, never a spinner that runs forever.
 */

type MapsPlaces = typeof google.maps.places;

let loaderPromise: Promise<MapsPlaces> | null = null;

/** The script tag is shared; two pickers must never inject two bootstraps. */
const SCRIPT_ID = 'tassy-google-maps-bootstrap';

/**
 * How long to wait for the library before giving up. Generous — a slow phone on
 * a bad connection is normal. What matters is that it is FINITE.
 */
const READY_TIMEOUT_MS = 12_000;
const POLL_INTERVAL_MS = 120;

function loadPlaces(apiKey: string): Promise<MapsPlaces> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<MapsPlaces>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps can only load in the browser'));
      return;
    }

    let settled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (poll) clearInterval(poll);
      if (timer) clearTimeout(timer);
      poll = null;
      timer = null;
    };
    const succeed = (places: MapsPlaces) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(places);
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    /**
     * Resolve if the library is reachable right now. Returns true once it has
     * taken ownership of settling the promise, so the poll can stop.
     */
    const tryImport = (): boolean => {
      if (settled) return true;
      const importLibrary = window.google?.maps?.importLibrary;
      if (typeof importLibrary !== 'function') return false;
      importLibrary('places')
        .then(() => {
          const places = window.google?.maps?.places;
          if (places) succeed(places);
          else fail(new Error('Places library loaded but google.maps.places is undefined'));
        })
        .catch((err: unknown) =>
          fail(err instanceof Error ? err : new Error('importLibrary("places") rejected')),
        );
      return true;
    };

    // Already there: a second picker on the page, a client-side navigation
    // back to /request, or React fast refresh.
    if (tryImport()) return;

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src =
        `https://maps.googleapis.com/maps/api/js` +
        `?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&loading=async`;
      script.async = true;
      document.head.appendChild(script);
    }

    // A hint, not the contract. If it fires we skip the remaining poll wait; if
    // it never fires — which is exactly what happened in production — the poll
    // below still gets there.
    script.addEventListener('load', () => void tryImport());
    // onerror IS trustworthy: it means the request itself failed (blocked by an
    // extension, offline, DNS). Worth failing fast rather than waiting 12s.
    script.addEventListener('error', () =>
      fail(new Error('the Google Maps script could not be fetched')),
    );

    poll = setInterval(() => void tryImport(), POLL_INTERVAL_MS);
    timer = setTimeout(
      () =>
        fail(
          new Error(
            `google.maps.importLibrary never appeared within ${READY_TIMEOUT_MS}ms`,
          ),
        ),
      READY_TIMEOUT_MS,
    );
  }).catch((err: unknown) => {
    // Let a later mount retry rather than caching the failure forever. This is
    // also what stops a single bad load from poisoning the whole page session.
    loaderPromise = null;
    throw err;
  });

  return loaderPromise;
}

/**
 * Why the picker is not working. Never shown to a customer — the field is a
 * plain text input to them and nothing is broken. This exists because the
 * operator otherwise has no way to tell "no key configured" apart from "key
 * rejected by Google", and those have completely different fixes.
 */
export type PlacesStatus = 'loading' | 'ready' | 'no-key' | 'load-failed';

export type PlacesState = {
  places: MapsPlaces | null;
  /** True once we know the picker cannot work. The field stays usable anyway. */
  failed: boolean;
  status: PlacesStatus;
};

/**
 * Returns the Places library once it is ready.
 *
 * `failed` is not an error state to show the visitor. The address field is a
 * plain text input that happens to offer suggestions; if Google is down, the
 * key is missing, or an ad blocker eats the script, the visitor types the
 * address and the form still prices the trip from the ZIP they typed (see
 * lib/zip-centroids.ts). A booking form must never depend on a third party
 * being reachable.
 */
export function useGooglePlaces(apiKey: string | undefined): PlacesState {
  const [state, setState] = useState<PlacesState>({
    places: null,
    failed: !apiKey,
    status: apiKey ? 'loading' : 'no-key',
  });

  useEffect(() => {
    if (!apiKey) {
      // Loud in the console, silent on the page. The operator needs to know;
      // the customer filling in the form does not.
      console.warn(
        '[address] GOOGLE_MAPS_API_KEY is not set for this deployment — ' +
          'address suggestions are off and the field is a plain text input. ' +
          'Prices still work: they are banded from the ZIP code typed instead.',
      );
      setState({ places: null, failed: true, status: 'no-key' });
      return;
    }
    let cancelled = false;
    loadPlaces(apiKey)
      .then((places) => {
        if (!cancelled) setState({ places, failed: false, status: 'ready' });
      })
      .catch((err: Error) => {
        console.warn(
          '[address] Google Maps did not become usable. Usual causes, in ' +
            'order: the Maps JavaScript API or Places API (New) is not enabled ' +
            'on this Google Cloud project; the key is HTTP-referrer restricted ' +
            'and this domain is not on the allowlist; billing is not enabled; ' +
            'or a browser extension blocked the script. ' +
            'Underlying error: ' + err.message,
        );
        if (!cancelled) setState({ places: null, failed: true, status: 'load-failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return state;
}
