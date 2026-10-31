// Fails if any public page, component, library or static file says Tassy owns or runs its own
// wheelchair vehicles, or backs a wheelchair claim with "licensed and insured" / "ADA-compliant".
// Tassy owns no wheelchair van: the rides are run in partner-owned, ramp-equipped vehicles
// (lib/wav.ts WAV_PARTNER_LINE). The partner's certificate of insurance and agreement are not in
// yet, so no page may claim insurance, licensing or ADA compliance for those rides.
// The patterns can only be loosened in the same change that adds the code and a bound policy flag.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIRS = ['app', 'components', 'lib', 'public', 'data'];
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md', '.mdx', '.txt', '.html']);

// A claim of ownership or operation, anywhere.
const OWNERSHIP: { id: string; pattern: RegExp; example: string }[] = [
  { id: 'our-wheelchair-vehicles', pattern: /\b(our|tassy'?s?)\s+(own\s+)?(fully\s+)?wheelchair[\s-]+(accessible\s+)?(vans?|vehicles?|fleet|buses|bus|cars?)\b/i, example: 'ride in our wheelchair-accessible vehicles' },
  { id: 'we-run-wheelchair-vehicles', pattern: /\bwe\s+(run|operate|own|have|use|drive|send)\s+(both\s+)?(\w+\s+){0,3}wheelchair[\s-]+(accessible\s+)?(vans?|vehicles?|fleet)\b/i, example: 'We run both ambulatory and wheelchair-accessible vehicles' },
  { id: 'tassy-runs-wheelchair-vehicles', pattern: /\btassy(\s+transportation)?\s+(runs|operates|owns)\s+(?!no\b)(\w+\s+){0,3}wheelchair/i, example: 'Tassy Transportation runs wheelchair-accessible vehicles' },
  { id: 'wheelchair-fleet', pattern: /wheelchair[\s-]+(accessible\s+)?fleet|fleet[^.]{0,40}wheelchair|wheelchair[\s-]+vans?\s+with\s+securement/i, example: 'a wheelchair-accessible fleet' },
  { id: 'ada-compliant', pattern: /ada[\s-]+(compliant|accessible)\s+(wheelchair|vehicle|van|fleet)|wheelchair[^.]{0,40}ada[\s-]+compliant/i, example: 'ADA-compliant wheelchair vehicles' },
  { id: 'operator-trained', pattern: /operator\s+trained\s+in\s+securement|drivers?\s+trained\s+(to|in)\s+(assist|securement)/i, example: 'an operator trained in securement' },
];

// An insurance or licence claim within two lines of a wheelchair mention.
const WINDOWED = /licensed\s+(and|&)\s+insured|properly\s+insured|fully\s+insured|insured\s+and\s+licensed|ada[\s-]+compliant/i;
const WHEELCHAIR = /wheelchair|\bWAV\b/i;

// 1. Every sentence that calls wheelchair priced or bookable lives in lib/wav.ts only, where it is
//    returned by helpers that are empty/neutral while the switch is OFF. A copy anywhere else would
//    show with the switch OFF.
const ON_ONLY: { id: string; pattern: RegExp; example: string }[] = [
  { id: 'book-at-this-price', pattern: /book\s+at\s+this\s+price/i, example: 'Book at this price.' },
  { id: 'price-on-pricing-page', pattern: /price\s+is\s+on\s+our\s+pricing\s+page/i, example: 'the price is on our pricing page' },
  { id: 'standard-booking', pattern: /standard\s+booking,?\s+not\s+a\s+special\s+request/i, example: 'a standard booking, not a special request' },
  { id: 'payment-link-promise', pattern: /we\s+send\s+a\s+payment\s+link/i, example: 'we send a payment link' },
];
// 2. No equipment-spec claim about wheelchair vehicles: Tassy does not own them or verify them.
const EQUIPMENT: { id: string; pattern: RegExp; example: string }[] = [
  { id: 'four-point', pattern: /four[\s-]+point|secured\s+at\s+four|lap\s+and\s+shoulder/i, example: 'secured at four points' },
  { id: 'ramp-or-lift', pattern: /ramp\s+or\s+lift|lift[\s-]+equipped/i, example: 'a ramp or lift' },
  { id: 'securement-spec', pattern: /securement[\s-]+equipped|securement\s+(setup|for\s+your)|proper\s+securement|wheelchair\s+securement\b(?!\s+equipment)/i, example: 'a securement-equipped vehicle' },
];
// Files exempt from the equipment rule: /terms is a legal page counsel reviews separately; /careers
// is about driver experience, not vehicles.
const EQUIPMENT_EXEMPT = new Set(['app/terms/page.tsx', 'app/careers/page.tsx']);
// /terms still carries main's "operator trained in securement" sentence. It is a legal page that
// Phil's counsel reviews separately (PR #73, "For counsel"), so this PR does not edit it. DELETE this
// exemption in the change that lands counsel's text.
const OWNERSHIP_EXEMPT = new Set(['app/terms/page.tsx']);

for (const c of [...OWNERSHIP, ...ON_ONLY, ...EQUIPMENT]) {
  assert.ok(c.pattern.test(c.example), `${c.id}: the pattern does not match its own example "${c.example}"`);
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (TEXT_EXT.has(extname(p).toLowerCase())) yield p;
  }
}

const failures: string[] = [];
let scanned = 0;
for (const dir of SOURCE_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    scanned++;
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    // Comments are explanations, not page copy, but a claim hiding in one is still a claim a
    // later edit could lift into copy. Scan everything and keep the patterns narrow.
    for (const c of OWNERSHIP_EXEMPT.has(rel) ? [] : OWNERSHIP) {
      const m = text.match(new RegExp(c.pattern.source, c.pattern.flags + 'g'));
      if (m) failures.push(`${rel}: [${c.id}] "${m[0].replace(/\s+/g, ' ')}"`);
    }
    if (rel !== 'lib/wav.ts') {
      for (const c of ON_ONLY) {
        const m = text.match(new RegExp(c.pattern.source, c.pattern.flags + 'g'));
        if (m) failures.push(`${rel}: [${c.id}] ON-only sentence outside lib/wav.ts: "${m[0]}"`);
      }
    }
    if (!EQUIPMENT_EXEMPT.has(rel)) {
      for (const c of EQUIPMENT) {
        const m = text.match(new RegExp(c.pattern.source, c.pattern.flags + 'g'));
        if (m) failures.push(`${rel}: [${c.id}] equipment-spec claim: "${m[0]}"`);
      }
    }
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (!WINDOWED.test(line)) return;
      const near = lines.slice(Math.max(0, i - 2), i + 3).join(' ');
      if (WHEELCHAIR.test(near)) failures.push(`${rel}:${i + 1}: [insured-or-licensed-near-wheelchair] "${line.trim().slice(0, 100)}"`);
    });
  }
}

assert.deepEqual(failures, [], `Wheelchair copy claims what the code does not back:\n  ${failures.join('\n  ')}`);
console.log(`ok: ${scanned} files scanned; no page says Tassy owns or runs its own wheelchair vehicles`);
