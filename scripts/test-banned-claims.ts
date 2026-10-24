// Fails if any banned claim appears in page source. Each rule is one JSON file in
// scripts/banned-claims/ ({ name, pattern, flags, reason }), so separate fixes can add
// rules without touching this runner. Scans the source that renders public pages
// (app, components, lib, public, data) and, when a build exists, the built HTML/JS.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const ROOT = join(HERE, '..');
const RULE_DIR = join(HERE, 'banned-claims');
const SOURCE_DIRS = ['app', 'components', 'lib', 'public', 'data'];
const BUILT_DIRS = ['.next/server/app'];
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md', '.mdx', '.txt', '.html', '.xml', '.svg', '.css']);

type Rule = { name: string; pattern: string; flags?: string; reason: string };

const rules: Rule[] = readdirSync(RULE_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(RULE_DIR, f), 'utf8')) as Rule);

if (rules.length === 0) {
  console.error('FAIL: no banned-claim rules found in scripts/banned-claims/');
  process.exit(1);
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
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
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const rule of rules) {
      const re = new RegExp(rule.pattern, rule.flags ?? '');
      lines.forEach((line, i) => {
        if (re.test(line)) failures.push(`${file.slice(ROOT.length + 1)}:${i + 1}  [${rule.name}]  ${line.trim().slice(0, 120)}`);
      });
    }
  }
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} banned claim(s) found:\n` + failures.join('\n'));
  for (const r of rules) console.error(`\n- ${r.name}: ${r.reason}`);
  process.exit(1);
}
console.log(`ok: ${scanned} files scanned against ${rules.length} banned-claim rule(s): ${rules.map((r) => r.name).join(', ')}`);
