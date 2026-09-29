/**
 * Build the committed Mecklenburg schools dataset.
 *
 * Run by hand when the county refreshes its layer (about once a year), NOT at
 * request time and NOT during a deploy. The booking form must never depend on a
 * third-party GIS service being up, so the output is committed to the repo and
 * scripts/seed-schools.ts reads the file, never the network.
 *
 *   bun run scripts/build-schools-dataset.ts
 *
 * Source: Mecklenburg County / City of Charlotte open GIS, "Schools (view of
 * points)" — the CMS directory plus private and charter schools in the county,
 * which is the population this form needs. NCES ids are not in this layer; the
 * schools.nces_id column stays null until a NCES import is added alongside.
 */

import { writeFileSync } from 'node:fs';

const LAYER =
  'https://gis.charlottenc.gov/arcgis/rest/services/HNS/HousingLocationalToolLayers/MapServer/1/query';

const QUERY =
  '?where=1%3D1&outFields=SchoolID,Name,Ownership,Type,GradeLevel,FULL_ADDRESS' +
  '&outSR=4326&returnGeometry=true&f=json&resultRecordCount=7000';

type Feature = {
  attributes: Record<string, string | number | null>;
  geometry?: { x: number; y: number };
};

/**
 * The source spells its own ownership field four ways — 'Punlic', 'Priivate',
 * 'Private ' and 'Public ' all appear. Normalise rather than drop: those are
 * real schools, and a parent typing one should still find it.
 */
function normaliseKind(raw: unknown): 'public' | 'charter' | 'private' {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v.startsWith('char')) return 'charter';
  if (v.startsWith('pri')) return 'private'; // private, priivate
  return 'public'; // public, punlic, and anything unlabelled
}

/** Grade span → the level a parent recognises. */
function normaliseLevel(type: unknown, grades: unknown): string | null {
  const t = String(type ?? '').trim().toLowerCase();
  if (t === 'elementary') return 'elementary';
  if (t === 'middle') return 'middle';
  if (t === 'high') return 'high';

  const g = String(grades ?? '').trim().toUpperCase();
  if (/^K-?8$/.test(g) || g === 'PK-8') return 'k8';
  if (/^K-?(5|6)$/.test(g) || g === 'PK-5') return 'elementary';
  if (/^(6|7)-?8$/.test(g)) return 'middle';
  if (/^9-?12$/.test(g) || /^1[01]-?12$/.test(g)) return 'high';
  if (/^(K|PK)-?12$/.test(g)) return 'other';
  return null;
}

/** Stable key for idempotent re-seeding. Name + address, not the source id. */
export function sourceKey(name: string, address: string | null): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  // SchoolID is '0' for most private schools in this layer, so it cannot be
  // the key. Name plus address is unique across all 301 rows.
  return address ? `${slug(name)}__${slug(address)}` : slug(name);
}

async function main() {
  const res = await fetch(LAYER + QUERY);
  if (!res.ok) throw new Error(`GIS layer: HTTP ${res.status}`);
  const body = (await res.json()) as { features?: Feature[] };
  const features = body.features ?? [];
  if (features.length < 100) throw new Error(`only ${features.length} features — refusing to write a truncated dataset`);

  const seen = new Set<string>();
  const schools = features
    .map((f) => {
      const name = String(f.attributes.Name ?? '').trim();
      const address = (f.attributes.FULL_ADDRESS as string | null)?.trim() || null;
      return {
        source_key: sourceKey(name, address),
        name,
        kind: normaliseKind(f.attributes.Ownership),
        level: normaliseLevel(f.attributes.Type, f.attributes.GradeLevel),
        grade_span: (f.attributes.GradeLevel as string | null)?.trim() || null,
        address,
        lat: f.geometry ? Number(f.geometry.y.toFixed(6)) : null,
        lng: f.geometry ? Number(f.geometry.x.toFixed(6)) : null,
        district: null as string | null,
      };
    })
    .filter((s) => {
      if (!s.name) return false;
      if (seen.has(s.source_key)) return false;
      seen.add(s.source_key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const out = {
    source: 'charlotte-gis',
    source_url: LAYER,
    source_description:
      'Mecklenburg County / City of Charlotte open GIS — Schools (view of points). CMS plus private and charter schools in the county.',
    fetched_at: new Date().toISOString().slice(0, 10),
    count: schools.length,
    schools,
  };

  writeFileSync('data/mecklenburg-schools.json', JSON.stringify(out, null, 2) + '\n');
  const byKind = schools.reduce<Record<string, number>>((acc, s) => {
    acc[s.kind] = (acc[s.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`wrote data/mecklenburg-schools.json — ${schools.length} schools`, byKind);
  console.log(`  with address: ${schools.filter((s) => s.address).length}`);
  console.log(`  with coords:  ${schools.filter((s) => s.lat !== null).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
