/**
 * Real driving distance, from Google's Routes API.
 *
 * WHY THIS FILE EXISTS. The quote engine used to multiply the straight-line
 * distance between two points by a fudge factor and call the result miles. On
 * 2026-09-24 a customer-visible symptom of that showed up: the site said 10.6
 * miles for a trip Google Maps calls 11.1, and 8.0 for one Google calls 8.5.
 * Anyone who checks the number against their phone finds us wrong, and a
 * rounded-down mile count quietly drops trips into a cheaper band.
 *
 * A sample of 16 real Charlotte-metro pairs measured against this API:
 *
 *     min 1.12   p10 1.20   median 1.36   mean 1.39   p90 1.59   max 1.75
 *
 * No single multiplier can represent that spread. Uptown to Matthews is 1.12;
 * CMC to Pineville is 1.75 — the same city, the same afternoon. So when we have
 * two real coordinates we ask Google, and we keep the multiplier only for the
 * case where we genuinely do not have them (a ZIP centroid, a typed address, a
 * dead key). See lib/quote.ts.
 *
 * COST. Routes API bills per request after 10,000/month free. A booking form
 * that fires once per completed address pair, cached, will not come close.
 */

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;
const METERS_PER_MILE = 1609.344;

export type LatLng = { lat: number; lng: number };

export type RoadDistance = {
  miles: number;
  seconds: number | null;
};

type CacheEntry = { value: RoadDistance | null; expiresAt: number };

const cache = new Map<string, CacheEntry>();

/**
 * Five decimal places is about a metre. Rounding the key means two people
 * typing the same address get one billed call, and it stops a jittery
 * autocomplete from re-billing on every keystroke.
 */
function cacheKey(from: LatLng, to: LatLng): string {
  const r = (n: number) => n.toFixed(5);
  return `${r(from.lat)},${r(from.lng)}|${r(to.lat)},${r(to.lng)}`;
}

function sweep(now: number) {
  if (cache.size < CACHE_MAX) return;
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
  // Still full of live entries? Drop the oldest insertions.
  while (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function isLatLng(p: unknown): p is LatLng {
  if (!p || typeof p !== 'object') return false;
  const { lat, lng } = p as Record<string, unknown>;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function coerceLatLng(p: unknown): LatLng | null {
  if (!p || typeof p !== 'object') return null;
  const raw = p as Record<string, unknown>;
  const lat = typeof raw.lat === 'string' ? Number(raw.lat) : raw.lat;
  const lng = typeof raw.lng === 'string' ? Number(raw.lng) : raw.lng;
  const candidate = { lat, lng };
  return isLatLng(candidate) ? candidate : null;
}

/**
 * Driving miles between two points, or null when we could not find out.
 *
 * NULL IS A NORMAL ANSWER and every caller must handle it: no key on this
 * deployment, Routes API not enabled, quota exhausted, Google slow, no drivable
 * route between the two points. The caller falls back to the straight-line
 * estimate; it never blocks the quote.
 */
export async function roadDistance(from: LatLng, to: LatLng): Promise<RoadDistance | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  if (!isLatLng(from) || !isLatLng(to)) return null;

  const now = Date.now();
  const key = cacheKey(from, to);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  sweep(now);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
        // The key is restricted by HTTP referrer for the browser's sake. A
        // server-to-server call sends no referrer of its own, so we state the
        // site it is acting for. Keep this in step with the allowlist on the
        // key in Google Cloud, or this call starts returning 403.
        Referer: siteReferer(),
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: 'DRIVE',
        // Deliberately NOT traffic-aware. A price that changes because of a
        // wreck on I-77 is a price we cannot defend an hour later, and
        // TRAFFIC_AWARE costs more per call.
        routingPreference: 'TRAFFIC_UNAWARE',
        units: 'IMPERIAL',
      }),
    });

    if (!response.ok) {
      cache.set(key, { value: null, expiresAt: now + 60_000 });
      return null;
    }

    const body = (await response.json()) as {
      routes?: { distanceMeters?: number; duration?: string }[];
    };
    const route = body.routes?.[0];
    const meters = route?.distanceMeters;
    if (typeof meters !== 'number' || !Number.isFinite(meters) || meters <= 0) {
      cache.set(key, { value: null, expiresAt: now + 60_000 });
      return null;
    }

    const value: RoadDistance = {
      miles: meters / METERS_PER_MILE,
      seconds: parseDuration(route?.duration),
    };
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch {
    // Timeout, DNS, abort. Cache the failure briefly so a Google outage does
    // not turn every keystroke into a four-second hang.
    cache.set(key, { value: null, expiresAt: now + 60_000 });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Routes returns "1129s". */
function parseDuration(value: string | undefined): number | null {
  if (!value) return null;
  const seconds = Number(value.replace(/s$/, ''));
  return Number.isFinite(seconds) ? seconds : null;
}

function siteReferer(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tassytrucks.com').replace(
    /\/+$/,
    '',
  );
  return `${base}/`;
}

/** Test-only. */
export function __resetRoadDistanceCache() {
  cache.clear();
}
