/**
 * Re-checks the coordinates in lib/hotel-zones.ts against Google's Geocoding API.
 *
 *   GOOGLE_MAPS_API_KEY=... bun run scripts/geocode-hotels.ts
 *
 * Prints each hotel's address, the geocoded lat/lng, and how far (metres) that is from the table.
 * Anything over 100 m is flagged: the booking match radius is 150 m, so a coordinate that far off
 * would stop that hotel matching (it then quotes the normal ladder, which is safe but not the
 * hotel price). Read-only: it changes nothing. The key is read from the environment and never
 * printed. Needs the Geocoding API enabled on the key.
 */
import { haversineMiles } from '../lib/quote';
import { CLT_TERMINAL, HOTEL_ZONES } from '../lib/hotel-zones';

const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) {
  console.error('Set GOOGLE_MAPS_API_KEY to run this check.');
  process.exit(1);
}
const referer = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tassytrucks.com').replace(/\/+$/, '')}/`;

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url, { headers: { Referer: referer } });
  const body = (await res.json()) as { results?: { geometry?: { location?: { lat: number; lng: number } } }[] };
  return body.results?.[0]?.geometry?.location ?? null;
}

const rows = [
  { slug: 'CLT terminal', address: `${CLT_TERMINAL.label}, ${CLT_TERMINAL.address}`, lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng },
  ...HOTEL_ZONES.map((h) => ({ slug: h.slug, address: `${h.label}, ${h.address}`, lat: h.lat, lng: h.lng })),
];

let flagged = 0;
for (const row of rows) {
  const got = await geocode(row.address);
  if (!got) {
    console.log(`${row.slug.padEnd(22)} NOT FOUND   ${row.address}`);
    flagged++;
    continue;
  }
  const metres = Math.round(haversineMiles(row, got) * 1609.344);
  const flag = metres > 100 ? '  <-- CHECK' : '';
  if (flag) flagged++;
  console.log(`${row.slug.padEnd(22)} ${got.lat.toFixed(7)}, ${got.lng.toFixed(7)}  table is ${String(metres).padStart(4)} m away${flag}`);
}
console.log(flagged ? `\n${flagged} row(s) to check.` : '\nAll coordinates are within 100 m of the geocoder.');
