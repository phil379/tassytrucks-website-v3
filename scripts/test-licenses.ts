// Every shipped image/brand file must be accounted for in LICENSES.md. Add a file to public/? Add a line there.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = readFileSync(join(ROOT, 'LICENSES.md'), 'utf8');
const missing: string[] = [];

function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf)$/i.test(name)) {
      const rel = relative(ROOT, p);
      // The doc groups names (e.g. `logo*.svg`) and gives paths in full or by file name.
      const base = name;
      const stem = base.replace(/\.[a-z0-9]+$/i, '');
      const listed = doc.includes(rel) || doc.includes(base) || doc.includes(`${stem.replace(/-?[a-z0-9]*$/i, '')}*`) || (/^logo/i.test(base) && doc.includes('logo*.svg'));
      if (!listed) missing.push(rel);
    }
  }
}
walk(join(ROOT, 'public'));
assert.deepEqual(missing, [], `these files are not mentioned in LICENSES.md: ${missing.join(', ')}`);
for (const must of ['Inter', 'Newsreader', 'lucide-react', 'NEEDS EVIDENCE', 'data/mecklenburg-schools.json']) {
  assert.ok(doc.includes(must), `LICENSES.md must mention ${must}`);
}
console.log('ok - every file under public/ is accounted for in LICENSES.md');
