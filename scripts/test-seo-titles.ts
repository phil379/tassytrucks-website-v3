import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * The root layout appends " · Tassy" to every page title. A page title that already names the
 * brand must be { absolute: '...' }, or Google shows "Tassy" twice and cuts the title off.
 */
const layout = readFileSync('app/layout.tsx', 'utf8');
assert.ok(/template: '%s · Tassy'/.test(layout), 'the suffix this test guards against is still the layout suffix');
const walk = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
const offenders: string[] = [];
for (const f of walk('app').filter((f) => /\/(page|layout)\.tsx$/.test(f) && f !== 'app/layout.tsx')) {
  for (const m of readFileSync(f, 'utf8').matchAll(/^  title: (['"`])(.*)\1,$/gm)) {
    if (/Tassy/.test(m[2]!)) offenders.push(`${f}: ${m[2]}`);
  }
}
assert.deepEqual(offenders, [], `use { absolute: ... } for these titles:\n${offenders.join('\n')}`);
console.log('ok - no page title repeats the " · Tassy" suffix');
