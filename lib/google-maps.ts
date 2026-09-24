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
 * the script tag ourselves is about twenty lines and cannot be evaluated on the
 * server at all, because every entry point here runs inside useEffect.
 *
 * The API key is necessarily public: Google's JS API runs in the browser and
 * there is no way to hide it. What protects it is an HTTP-referrer restriction
 * in Google Cloud Console, which must list every domain this site is served
 * from. An unrestricted key WILL be scraped and billed to you.
 *
 * The key arrives as a prop from a dynamically-rendered server component rather
 * than through NEXT_PUBLIC_*, so rotating it takes effect on the next request
 * instead of requiring a rebuild.
 */

type MapsPlaces = typeof google.maps.places;

let loaderPromise: Promise<MapsPlaces> | null = null;

function loadPlaces(apiKey: string): Promise<MapsPlaces> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<MapsPlaces>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps can only load in the browser'));
      return;
    }

    // Already present (fast refresh, or a second picker on the page).
    if (window.google?.maps?.importLibrary) {
      window.google.maps
        .importLibrary('places')
        .then(() => resolve(google.maps.places))
        .catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    script.onload = () => {
      google.maps
        .importLibrary('places')
        .then(() => resolve(google.maps.places))
        .catch(reject);
    };
    document.head.appendChild(script);
  }).catch((err) => {
    // Let a later mount retry rather than caching the failure forever.
    loaderPromise = null;
    throw err;
  });

  return loaderPromise;
}

export type PlacesState = {
  places: MapsPlaces | null;
  /** True once we know the picker cannot work. The field stays usable anyway. */
  failed: boolean;
};

/**
 * Returns the Places library once it is ready.
 *
 * `failed` is not an error state to show the visitor. The address field is a
 * plain text input that happens to offer suggestions; if Google is down, the
 * key is missing, or an ad blocker eats the script, the visitor types the
 * address and the form submits exactly as before. A booking form must never
 * depend on a third party being reachable.
 */
export function useGooglePlaces(apiKey: string | undefined): PlacesState {
  const [state, setState] = useState<PlacesState>({ places: null, failed: !apiKey });

  useEffect(() => {
    if (!apiKey) {
      setState({ places: null, failed: true });
      return;
    }
    let cancelled = false;
    loadPlaces(apiKey)
      .then((places) => {
        if (!cancelled) setState({ places, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ places: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return state;
}
