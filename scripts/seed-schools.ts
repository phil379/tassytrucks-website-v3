/**
 * Seed public.schools from the committed dataset. Idempotent — run it as often
 * as you like.
 *
 *   bun run scripts/seed-schools.ts          # upsert
 *   bun run scripts/seed-schools.ts --dry    # report, change nothing
 *
 * Reads data/mecklenburg-schools.json, NEVER the network. The GIS layer is
 * fetched only by scripts/build-schools-dataset.ts, by hand, when the county
 * refreshes it. A booking form must not depend on a third-party service, and a
 * seed that needs the internet is a seed that fails in CI.
 *
 * Idempotency is an upsert on (source, source_key), so re-running updates names
 * and addresses in place rather than duplicating a school — which matters,
 * because a duplicated school silently splits a run.
 */

import dataset from '../data/mecklenburg-schools.json';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry');

if (!URL_ || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

type Row = {
  source: string;
  source_key: string;
  name: string;
  kind: string;
  level: string | null;
  grade_span: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  district: string | null;
  active: boolean;
  address_source: string | null;
  address_source_url: string | null;
};

async function main() {
  const rows: Row[] = dataset.schools.map((s) => ({
    source: dataset.source,
    source_key: s.source_key,
    name: s.name,
    kind: s.kind,
    level: s.level,
    grade_span: s.grade_span,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    // Public schools in Mecklenburg are CMS; private and charter are not.
    district: s.kind === 'public' ? 'Charlotte-Mecklenburg Schools' : null,
    /**
     * Carried explicitly so a re-seed can RETIRE a school, not just add one.
     * Two of these are unbuilt CMS relief sites — planning placeholders, not
     * buildings a parent picks — and the picker filters on active.
     */
    active: s.active !== false,
    address_source: s.address_source ?? null,
    address_source_url: s.address_source_url ?? null,
  }));

  const before = await count();
  console.log(`dataset: ${rows.length} schools (${dataset.source}, fetched ${dataset.fetched_at})`);
  console.log(`schools table before: ${before}`);

  if (DRY) {
    console.log('--dry: nothing written.');
    return;
  }

  // Batched, because one 299-row payload is one all-or-nothing statement and a
  // single bad row would take the whole seed with it.
  const BATCH = 50;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(
      `${URL_}/rest/v1/schools?on_conflict=source,source_key`,
      {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(chunk),
      },
    );
    if (!res.ok) {
      console.error(`batch ${i / BATCH + 1} FAILED: HTTP ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    written += chunk.length;
  }

  const after = await count();
  console.log(`upserted: ${written}`);
  console.log(`schools table after: ${after} (added ${after - before})`);
}

async function count(): Promise<number> {
  const res = await fetch(`${URL_}/rest/v1/schools?select=id`, {
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
  });
  const range = res.headers.get('content-range') ?? '*/0';
  return Number(range.split('/')[1] ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
