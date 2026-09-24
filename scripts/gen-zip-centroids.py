#!/usr/bin/env python3
"""
Regenerates lib/zip-centroids.ts.

Run only when the service area changes:
    curl -sSo /tmp/zips.csv https://raw.githubusercontent.com/midwire/free_zipcode_data/master/all_us_zipcodes.csv
    python3 scripts/gen-zip-centroids.py /tmp/zips.csv

The generated file is committed. Do not hand-edit it.
"""
import csv, sys, pathlib

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/zips.csv"
OUT = pathlib.Path(__file__).resolve().parent.parent / "lib" / "zip-centroids.ts"

# The Charlotte metro box. Anything outside it is not a trip we band-price.
LAT = (34.85, 35.65)
LNG = (-81.35, -80.30)
STATES = {"NC", "SC"}

rows = []
for r in csv.DictReader(open(SRC)):
    if r["state"] not in STATES or not r["lat"] or not r["lon"]:
        continue
    la, lo = float(r["lat"]), float(r["lon"])
    if LAT[0] <= la <= LAT[1] and LNG[0] <= lo <= LNG[1]:
        rows.append((r["code"], r["city"].title(), r["state"], la, lo))
rows.sort()

HEADER = '''import type { LatLng } from '@/lib/quote';

/**
 * ZIP centroids for the Charlotte service area. GENERATED — see
 * scripts/gen-zip-centroids.py. Do not hand-edit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The instant price needs two coordinates. Those normally come from Google
 * Places when the visitor PICKS an address from the suggestions. When the Maps
 * key is missing, or the visitor types an address instead of picking one, or
 * Places is simply having a bad day, there is nothing to measure and the page
 * cannot quote. That is a booking lost to an outage the customer never sees.
 *
 * A ZIP centroid is a worse measurement and a much better outcome. Charlotte
 * ZIP areas run roughly 2-4 miles across, the distance bands are 4-5 miles
 * wide, and the engine already prices the optimistic and the pessimistic road
 * distance separately. So when a ZIP pair lands near a band edge the customer
 * sees a RANGE instead of a single number — which is exactly what an estimate
 * built from a ZIP deserves to look like.
 *
 * Spot-checked against real routes: Uptown (28202) to Matthews (28105) resolves
 * to 13.7-15.9 road miles against roughly 14 in reality; Uptown to Concord
 * (28025) resolves to 23.5-27.2 against roughly 25.
 *
 * THIS IS NOT A SUBSTITUTE FOR THE MAPS KEY. With the key, coordinates are
 * exact, `exact` comes back true, and this file is never consulted.
 */
export const ZIP_CENTROIDS: Record<string, readonly [number, number, string]> = {
'''

FOOTER = '''};

/**
 * Pull a 5-digit ZIP out of whatever the visitor typed.
 *
 * The LAST match wins, deliberately: "123 28th Street, Charlotte NC 28205" has
 * two five-digit-looking runs and only the trailing one is the ZIP.
 */
export function extractZip(address: string | null | undefined): string | null {
  if (!address) return null;
  const all = String(address).match(/\\b(\\d{5})(?:-\\d{4})?\\b/g);
  if (!all) return null;
  const last = all[all.length - 1]!.slice(0, 5);
  return last in ZIP_CENTROIDS ? last : null;
}

/** The centroid of a ZIP inside the service area, or null. */
export function zipCentroid(zip: string | null | undefined): LatLng | null {
  if (!zip) return null;
  const hit = ZIP_CENTROIDS[zip];
  return hit ? { lat: hit[0], lng: hit[1] } : null;
}

/** "Charlotte, NC" for a ZIP, so the panel can name where it measured from. */
export function zipPlace(zip: string | null | undefined): string | null {
  if (!zip) return null;
  return ZIP_CENTROIDS[zip]?.[2] ?? null;
}

export type ResolvedPoint = { point: LatLng; exact: boolean; zip: string | null };

/**
 * Coordinates from a picked place when we have them, otherwise from the ZIP the
 * visitor typed. `exact` is what the difference is called downstream: an exact
 * point gets a firm estimate, a ZIP point gets one labelled as approximate.
 */
export function resolvePoint(
  picked: { lat?: number | null; lng?: number | null } | null | undefined,
  address: string | null | undefined,
): ResolvedPoint | null {
  if (picked?.lat != null && picked?.lng != null) {
    return { point: { lat: picked.lat, lng: picked.lng }, exact: true, zip: extractZip(address) };
  }
  const zip = extractZip(address);
  const point = zipCentroid(zip);
  return point ? { point, exact: false, zip } : null;
}
'''

body = "\n".join(
    f"  '{z}': [{round(la, 4)}, {round(lo, 4)}, '{city}, {st}'],"
    for z, city, st, la, lo in rows
)
OUT.write_text(HEADER + body + "\n" + FOOTER)
print(f"wrote {OUT} with {len(rows)} ZIPs")
