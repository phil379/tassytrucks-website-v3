import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * A <style> written as a JSX text child is HTML-escaped by React on the server (" -> &quot;,
 * ' -> &#x27;, & -> &amp;, < -> &lt;, > -> &gt;), but a browser never decodes entities inside <style>.
 * The server CSS is then broken, and in a client component the text no longer matches on
 * hydration, so React discards the whole server-rendered page (2026-11-13: the home page day map,
 * React error #425). Any <style> whose CSS contains one of those characters must use
 * dangerouslySetInnerHTML.
 */
const walk = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));

const offenders: string[] = [];
for (const f of [...walk('app'), ...walk('components')].filter((f) => f.endsWith('.tsx'))) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/<style>\{(`[\s\S]*?`|'[^']*'|"[^"]*")\}<\/style>/g)) {
    const body = m[1]!.slice(1, -1).replace(/\$\{[^}]*\}/g, '');
    if (/["'&<>]/.test(body)) offenders.push(`${f}: ${body.trim().slice(0, 60)}`);
  }
}
assert.deepEqual(offenders, [], `use dangerouslySetInnerHTML for these <style> blocks:\n${offenders.join('\n')}`);
assert.ok(/<style dangerouslySetInnerHTML=\{\{ __html: DAY_MAP_CSS \}\} \/>/.test(readFileSync('components/CharlotteDayMap.tsx', 'utf8')));
console.log('ok - no <style> text child contains characters React would escape');
