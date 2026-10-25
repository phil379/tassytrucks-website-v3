// Fails if the public site makes a claim about something that is not built yet.
// The phrases live in ONE file, scripts/unbuilt-claims.json, so the list can be shortened as each
// feature ships without touching this runner. (scripts/test-banned-claims.ts is a different guard:
// one rule per file for facts that are false; this one is for features that are merely not built.)
// Scans the source that renders public pages and, when a build exists, the built page output.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIRS = ['app', 'components', 'lib', 'public', 'data'];
const BUILT_DIRS = ['.next/server/app'];
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md', '.mdx', '.txt', '.html', '.xml', '.css']);

type Claim = { id: string; feature: string; pattern: string; example: string };
const list = JSON.parse(readFileSync(join(ROOT, 'scripts/unbuilt-claims.json'), 'utf8')) as { claims: Claim[] };
const claims = list.claims;

// The list itself must be sound, or the scan below proves nothing.
const ids = new Set<string>();
for (const c of claims) {
  assert.ok(c.id && c.feature && c.pattern && c.example, `incomplete entry: ${JSON.stringify(c).slice(0, 80)}`);
  assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
  ids.add(c.id);
  assert.ok(new RegExp(c.pattern, 'i').test(c.example), `${c.id}: the pattern does not match its own example "${c.example}"`);
}
assert.ok(claims.length > 0, 'no claims listed (delete this test, do not empty the list)');

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
for (const rel of [...SOURCE_DIRS, ...BUILT_DIRS]) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    scanned++;
    const text = readFileSync(file, 'utf8');
    for (const c of claims) {
      const re = new RegExp(c.pattern, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const line = text.slice(0, m.index).split('\n').length;
        failures.push(`${relative(ROOT, file)}:${line}  [${c.id}]  "${m[0].replace(/\s+/g, ' ')}"`);
        if (m[0].length === 0) re.lastIndex++;
      }
    }
  }
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} claim(s) about features that are not built yet:\n` + failures.join('\n'));
  for (const c of claims) console.error(`\n- ${c.id}: needs ${c.feature}`);
  console.error('\nRemove the claim from the page, or (once the feature ships) delete its entry in scripts/unbuilt-claims.json.');
  process.exit(1);
}
console.log(`ok: ${scanned} files scanned for ${claims.length} unbuilt-feature claim(s): ${claims.map((c) => c.id).join(', ')}`);
