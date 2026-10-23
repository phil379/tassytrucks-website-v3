import type { Page } from '@playwright/test';

/**
 * Stands in for Google Maps in the browser, so a spec can do what a visitor does:
 * type into an address field and TAP A SUGGESTION.
 *
 * The app's loader (lib/google-maps.ts) injects a script from maps.googleapis.com and
 * waits for `google.maps.importLibrary`. `stubPlaces` answers that request with a tiny
 * fake that offers a fixed set of suggestions, each with a place id and coordinates, so
 * the field ends up exactly as it does after a real pick: placeId, lat and lng set.
 *
 * It only works against a server that was started with a GOOGLE_MAPS_API_KEY (the 3947
 * rig in playwright.config.ts); with no key the form never asks for the script.
 */

export type StubPlace = { placeId: string; main: string; secondary: string; lat: number; lng: number };

/** Two real Charlotte spots, a few miles apart, so the fare lands inside the card. */
export const PLACES: Record<string, StubPlace> = {
  tourmaline: {
    placeId: 'pw-place-tourmaline',
    main: '1220 Tourmaline Rd',
    secondary: 'Charlotte, NC, USA',
    lat: 35.2561,
    lng: -80.7352,
  },
  aransas: {
    placeId: 'pw-place-aransas',
    main: '3106 Aransas Rd',
    secondary: 'Charlotte, NC, USA',
    lat: 35.2892281,
    lng: -80.9174,
  },
};

const SCRIPT = (places: StubPlace[]) => `
(() => {
  const PLACES = ${JSON.stringify(places)};
  class Token {}
  class LatLng { constructor(lat, lng) { this._lat = lat; this._lng = lng; } lat() { return this._lat; } lng() { return this._lng; } }
  const str = (s) => ({ toString: () => s });
  const suggestionFor = (p) => ({
    placePrediction: {
      placeId: p.placeId,
      mainText: str(p.main),
      secondaryText: str(p.secondary),
      text: str(p.main + ', ' + p.secondary),
      toPlace: () => ({
        id: p.placeId,
        formattedAddress: p.main + ', ' + p.secondary,
        location: new LatLng(p.lat, p.lng),
        fetchFields: async () => {},
      }),
    },
  });
  const places = {
    AutocompleteSessionToken: Token,
    AutocompleteSuggestion: {
      fetchAutocompleteSuggestions: async ({ input }) => {
        const q = String(input).toLowerCase();
        const hits = PLACES.filter((p) => p.main.toLowerCase().includes(q.split(',')[0].trim()) || q.includes(p.main.toLowerCase().slice(0, 4)));
        return { suggestions: hits.map(suggestionFor) };
      },
    },
  };
  window.google = { maps: { LatLng, places, importLibrary: async () => places } };
})();
`;

/** Call BEFORE page.goto. */
export async function stubPlaces(page: Page, places: StubPlace[] = Object.values(PLACES)) {
  await page.route('https://maps.googleapis.com/maps/api/js**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: SCRIPT(places) }),
  );
}

/** Makes the script request fail the way an ad blocker does: the picker never loads. */
export async function blockPlaces(page: Page) {
  await page.route('https://maps.googleapis.com/**', (route) => route.abort());
}
