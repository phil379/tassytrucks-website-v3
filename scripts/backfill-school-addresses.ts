/**
 * Part 2b — backfill the schools the county published with no address.
 *
 *   bun run scripts/backfill-school-addresses.ts          # report only
 *   bun run scripts/backfill-school-addresses.ts --write  # update the dataset
 *
 * Writes to data/mecklenburg-schools.json, NOT to the database. Seeding upserts
 * from that file on (source, source_key), so a direct UPDATE against the table
 * would be reverted by the next seed.
 *
 * ACCEPTANCE IS DELIBERATELY STRICT. A result is taken only if it is BOTH
 * inside Mecklenburg County AND typed as a school/establishment. Anything else
 * stays null.
 *
 * The reason is the whole point of the exercise: a null lands the parent in
 * state B and asks them for the address, which costs one field. A confidently
 * wrong address routes a child to the wrong building and nobody finds out until
 * a driver is at the wrong gate. That is the silent-drop class again — a
 * plausible-looking value standing in for a real one.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import pkg from '@next/env';
const { loadEnvConfig } = pkg as unknown as { loadEnvConfig: (d: string) => void };
loadEnvConfig(process.cwd());

const KEY = process.env.GOOGLE_MAPS_API_KEY;
const WRITE = process.argv.includes('--write');
const FILE = 'data/mecklenburg-schools.json';

if (!KEY) {
  console.error('GOOGLE_MAPS_API_KEY is not set.');
  process.exit(1);
}

/** Planning placeholders, not schools a parent picks. Retired, not geocoded. */
const RETIRE = new Set([
  'ambemarle-winterfield-relief-school',
  'south-mecklenburg-ardrey-kell-relief-high',
]);

const ACCEPTED_TYPES = new Set([
  'school',
  'primary_school',
  'secondary_school',
  'preschool',
  'university',
  'establishment',
  'point_of_interest',
]);

type Place = {
  id: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  displayName?: { text: string };
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
};

async function search(name: string): Promise<{ place: Place | null; why: string }> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY!,
      'X-Goog-FieldMask':
        'places.id,places.formattedAddress,places.location,places.types,places.displayName,places.addressComponents',
    },
    body: JSON.stringify({
      textQuery: `${name}, Charlotte, NC`,
      maxResultCount: 3,
      locationBias: {
        circle: { center: { latitude: 35.2271, longitude: -80.8431 }, radius: 40000 },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { place: null, why: `HTTP ${res.status} ${body.slice(0, 160)}` };
  }
  const json = (await res.json()) as { places?: Place[] };
  const places = json.places ?? [];
  if (places.length === 0) return { place: null, why: 'no result' };

  for (const p of places) {
    const county = p.addressComponents?.find((c) =>
      c.types.includes('administrative_area_level_2'),
    )?.longText;
    const inMeck = /mecklenburg/i.test(county ?? '');
    const isPlace = (p.types ?? []).some((t) => ACCEPTED_TYPES.has(t));

    if (!inMeck) continue;
    if (!isPlace) continue;
    return { place: p, why: 'ok' };
  }

  const first = places[0];
  const county = first.addressComponents?.find((c) =>
    c.types.includes('administrative_area_level_2'),
  )?.longText;
  return {
    place: null,
    why: `rejected — county=${county ?? 'unknown'} types=${(first.types ?? []).slice(0, 3).join(',')}`,
  };
}

async function main() {
  const dataset = JSON.parse(readFileSync(FILE, 'utf8')) as {
    schools: Record<string, unknown>[];
  };

  const blanks = dataset.schools.filter((s) => !s.address);
  const toGeocode = blanks.filter((s) => !RETIRE.has(s.source_key as string));

  console.log(`blanks: ${blanks.length}  (retiring ${blanks.length - toGeocode.length}, geocoding ${toGeocode.length})\n`);

  let resolved = 0;
  const report: string[] = [];

  for (const school of toGeocode) {
    const name = school.name as string;
    const { place, why } = await search(name);

    if (!place || !place.formattedAddress || !place.location) {
      report.push(`  NULL   ${name}\n           ↳ ${why}`);
      continue;
    }

    school.address = place.formattedAddress;
    school.lat = Number(place.location.latitude.toFixed(6));
    school.lng = Number(place.location.longitude.toFixed(6));
    (school as Record<string, unknown>).place_id = place.id;
    resolved++;
    report.push(
      `  OK     ${name}\n           → ${place.formattedAddress}\n           ↳ types=${(place.types ?? []).slice(0, 3).join(',')} place_id=${place.id}`,
    );
    await new Promise((r) => setTimeout(r, 120));
  }

  // 2a — retire the planning placeholders so the picker stops offering them.
  let retired = 0;
  for (const school of dataset.schools) {
    if (RETIRE.has(school.source_key as string)) {
      school.active = false;
      retired++;
    }
  }

  console.log(report.join('\n'));
  console.log(`\n── SUMMARY ──`);
  console.log(`  resolved:  ${resolved} of ${toGeocode.length}`);
  console.log(`  stayed null: ${toGeocode.length - resolved}`);
  console.log(`  retired (active=false): ${retired}`);

  if (WRITE) {
    writeFileSync(FILE, JSON.stringify(dataset, null, 2) + '\n');
    console.log(`\nwrote ${FILE}`);
  } else {
    console.log(`\n(report only — re-run with --write to update ${FILE})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
