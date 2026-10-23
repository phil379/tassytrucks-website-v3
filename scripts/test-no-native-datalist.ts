import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * No native <datalist> anywhere in the app.
 *
 * On phones the browser draws a datalist's suggestions itself, and it is unreliable: a staff
 * user chose Dog, typed "F" and was never offered French Bulldog. The request form's breed field
 * was replaced with components/request/BreedCombobox.tsx, and the facility patient form was the
 * second place with the same bug. This keeps a third from creeping back: any field that wants
 * suggestions uses BreedCombobox (or a purpose-built picker like SchoolPicker).
 *
 * Comments are stripped first, so a note explaining WHY there is no datalist does not trip it.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['app', 'components'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'node_modules' ? [] : files(p);
    return /\.tsx?$/.test(f) ? [p] : [];
  });
}

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const offenders: string[] = [];
for (const dir of DIRS) {
  for (const f of files(join(ROOT, dir))) {
    const code = stripComments(readFileSync(f, 'utf8'));
    // A <datalist> element, or an input pointing at one with list="...".
    if (/<datalist[\s>]/.test(code) || /<input[^>]*\slist=/.test(code) || /\slist=\{/.test(code)) {
      offenders.push(relative(ROOT, f));
    }
  }
}

assert.deepEqual(offenders, [], `native datalist found in: ${offenders.join(', ')}. Use BreedCombobox.`);
console.log('ok - no native <datalist> in app/ or components/');
console.log('1 passed');
