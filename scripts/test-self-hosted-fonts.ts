import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const css = readFileSync('app/fonts.css', 'utf8');
const layout = readFileSync('app/layout.tsx', 'utf8');

t('no font is fetched from Google at build time: nothing imports next/font/google', () => {
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  for (const f of [...walk('app'), ...walk('components')].filter((f) => /\.(tsx?|css)$/.test(f))) {
    assert.ok(!/from ['"]next\/font\/google['"]/.test(readFileSync(f, 'utf8')), `${f} imports next/font/google`);
  }
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(css + layout), 'no Google Fonts URL');
});

t('every @font-face points at a file that is in public/fonts', () => {
  const urls = [...css.matchAll(/url\((\/fonts\/[^)]+)\)/g)].map((m) => m[1]);
  assert.equal(urls.length, 59, '59 file faces: Newsreader 2 styles x 4 weights x 3 subsets (24) + Inter 5 weights x 7 subsets (35); the 60th block is the Arial metric fallback');
  for (const u of new Set(urls)) assert.ok(existsSync(`public${u}`), `missing public${u}`);
});

t('same weights, styles and variables as before', () => {
  const faces = [...css.matchAll(/font-family:"Tassy (\w+)";font-style:(\w+);font-weight:(\d+)/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`);
  const set = new Set(faces);
  for (const w of [400, 500, 600, 700]) for (const s of ['normal', 'italic']) assert.ok(set.has(`Newsreader ${s} ${w}`));
  for (const w of [300, 400, 500, 600, 700]) assert.ok(set.has(`Inter normal ${w}`));
  assert.ok(/font-display:swap/.test(css));
  assert.ok(css.includes(':root{--font-newsreader:"Tassy Newsreader";--font-inter:"Tassy Inter","Tassy Inter Fallback"}'));
  assert.ok(/"Tassy Inter Fallback";src:local\("Arial"\);ascent-override:90.49%;descent-override:22.56%;line-gap-override:0.00%;size-adjust:107.06%/.test(css), 'Inter fallback metrics kept');
});

t('the three Latin files are preloaded, as next/font did', () => {
  for (const f of ['4b9bb515ce6d026f.p.woff2', '5611c55482296524.p.woff2', 'e4af272ccee01ff0-s.p.woff2']) {
    assert.ok(layout.includes(`/fonts/${f}`), f);
  }
  assert.ok(/import '\.\/fonts\.css';/.test(layout));
});

t('the OFL license travels with the files', () => {
  for (const f of ['OFL-Inter.txt', 'OFL-Newsreader.txt', 'LICENSE.md']) assert.ok(existsSync(`public/fonts/${f}`), f);
  assert.ok(readFileSync('public/fonts/OFL-Inter.txt', 'utf8').includes('SIL Open Font License, Version 1.1'));
});

console.log(`${n} self-hosted font checks passed`);
