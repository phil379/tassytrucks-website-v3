import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import PagePhoto from '../components/seo/PagePhoto';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGE = readFileSync(join(ROOT, 'app/charlotte/pet-transport/page.tsx'), 'utf8');

/** Every <img> in a piece of markup must have non-empty alt text and a numeric width and height. */
function imgProblems(html: string): string[] {
  const problems: string[] = [];
  const imgs = html.match(/<img\b[^>]*>/g) ?? [];
  if (!imgs.length) problems.push('no <img> found');
  for (const tag of imgs) {
    const alt = tag.match(/\balt="([^"]*)"/);
    if (!alt || !alt[1].trim()) problems.push(`img without alt text: ${tag.slice(0, 80)}`);
    if (!/\bwidth="\d+"/.test(tag)) problems.push(`img without a width: ${tag.slice(0, 80)}`);
    if (!/\bheight="\d+"/.test(tag)) problems.push(`img without a height: ${tag.slice(0, 80)}`);
  }
  return problems;
}

const props = {
  stem: 'pet-transport-french-bulldog',
  widths: [480, 800, 1125],
  width: 1125,
  height: 1406,
  alt: 'French bulldog resting on a cream pet bed',
  sizes: 'min(28rem, calc(100vw - 3rem))',
} as const;

t('the checker itself fails an image with no alt, an empty alt, no width or no height', () => {
  assert.ok(imgProblems('<img src="/a.jpg" width="10" height="10">').length > 0);
  assert.ok(imgProblems('<img src="/a.jpg" alt="" width="10" height="10">').length > 0);
  assert.ok(imgProblems('<img src="/a.jpg" alt="x" height="10">').length > 0);
  assert.ok(imgProblems('<img src="/a.jpg" alt="x" width="10">').length > 0);
  assert.equal(imgProblems('<img src="/a.jpg" alt="x" width="10" height="10">').length, 0);
});

t('PagePhoto renders an <img> with alt text, width and height, and is lazy-loaded', () => {
  const html = renderToStaticMarkup(createElement(PagePhoto, props));
  assert.deepEqual(imgProblems(html), []);
  assert.match(html, /\bloading="lazy"/);
  assert.match(html, /\bdecoding="async"/);
  assert.match(html, /width="1125"/);
  assert.match(html, /height="1406"/);
});

t('PagePhoto refuses a missing alt or a missing size instead of rendering it', () => {
  assert.throws(() => renderToStaticMarkup(createElement(PagePhoto, { ...props, alt: '' })), /alt text/);
  assert.throws(() => renderToStaticMarkup(createElement(PagePhoto, { ...props, alt: '   ' })), /alt text/);
  assert.throws(() => renderToStaticMarkup(createElement(PagePhoto, { ...props, width: 0 })), /width and a height/);
  assert.throws(() => renderToStaticMarkup(createElement(PagePhoto, { ...props, height: 0 })), /width and a height/);
});

t('the pet-transport page places the photo once, with the agreed alt text and no caption or the word Winnie in it', () => {
  assert.equal((PAGE.match(/<PagePhoto\b/g) ?? []).length, 1);
  assert.ok(PAGE.includes('alt="French bulldog resting on a cream pet bed"'));
  const block = PAGE.slice(PAGE.indexOf('<PagePhoto'), PAGE.indexOf('/>', PAGE.indexOf('<PagePhoto')));
  assert.ok(!/winnie/i.test(block), 'the photo block must not mention Winnie');
  const html = renderToStaticMarkup(createElement(PagePhoto, props));
  assert.ok(!/<figcaption|<figure/.test(html), 'no caption');
  assert.ok(!/winnie/i.test(html));
});

t('the page passes the photo a non-empty alt and the real width and height', () => {
  const block = PAGE.slice(PAGE.indexOf('<PagePhoto'), PAGE.indexOf('/>', PAGE.indexOf('<PagePhoto')));
  const alt = block.match(/\balt="([^"]*)"/);
  assert.ok(alt && alt[1].trim().length > 0, 'alt text is missing');
  const w = block.match(/\bwidth=\{(\d+)\}/);
  const h = block.match(/\bheight=\{(\d+)\}/);
  assert.ok(w && h, 'width and height are missing');
  assert.equal(Number(w![1]), props.width);
  assert.equal(Number(h![1]), props.height);
});

t('the page does not render a raw <img> of its own (every image goes through the checked component)', () => {
  assert.equal((PAGE.match(/<img\b/g) ?? []).length, 0);
});

/** Pixel size of a JPEG (first SOF marker) or a WebP (VP8 / VP8L / VP8X). */
function size(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  if (file.endsWith('.jpg')) {
    let i = 2;
    while (i < b.length) {
      assert.equal(b[i], 0xff, 'JPEG marker');
      const m = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    throw new Error('no SOF in ' + file);
  }
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  if (kind === 'VP8X') return { w: (b.readUIntLE(24, 3)) + 1, h: (b.readUIntLE(27, 3)) + 1 };
  throw new Error('unknown WebP ' + kind);
}

t('every file the component points at exists, has the declared aspect ratio, and carries no EXIF, GPS or XMP', () => {
  for (const w of props.widths) {
    for (const ext of ['webp', 'jpg'] as const) {
      const file = join(ROOT, 'public/photos', `${props.stem}-${w}.${ext}`);
      assert.ok(existsSync(file), `${file} is missing`);
      const s = size(file);
      assert.equal(s.w, w, `${file} width`);
      assert.ok(Math.abs(s.h / s.w - props.height / props.width) < 0.002, `${file} aspect ratio ${s.w}x${s.h}`);
      const bytes = readFileSync(file);
      assert.ok(!bytes.includes(Buffer.from('Exif\0\0', 'latin1')), `${file} has EXIF`);
      assert.ok(!bytes.includes(Buffer.from('ns.adobe.com', 'latin1')), `${file} has XMP`);
      assert.ok(!bytes.includes(Buffer.from('EXIF', 'latin1')), `${file} has an EXIF chunk`);
      assert.ok(!bytes.includes(Buffer.from('XMP ', 'latin1')), `${file} has an XMP chunk`);
    }
  }
  const largest = props.widths[props.widths.length - 1];
  assert.equal(size(join(ROOT, 'public/photos', `${props.stem}-${largest}.jpg`)).h, props.height);
});

t('LICENSES.md lists the photo with the agreed wording', () => {
  const lic = readFileSync(join(ROOT, 'LICENSES.md'), 'utf8');
  assert.ok(lic.includes("Owner's own photograph, used with the owner's permission"));
  assert.ok(lic.includes('pet-transport-french-bulldog'));
});

console.log(`${n} passed`);
