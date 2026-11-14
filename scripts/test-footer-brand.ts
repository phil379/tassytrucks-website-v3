import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Footer brand and contact (Phil, 2026-11-14): the name and logo were too small, and
 * partners@tassytrucks.com broke onto two lines on desktop and on phones.
 */
const f = readFileSync('components/Footer.tsx', 'utf8');
assert.ok(/logo-cream\.svg" alt="Tassy Transportation" className="h-16 w-16 sm:h-20 sm:w-20 shrink-0"/.test(f), 'logo 64px on phones, 80px (2x) from sm');
assert.ok(/serif text-2xl sm:text-3xl font-semibold leading-tight">Tassy Transportation/.test(f), 'name 24px / 30px');
assert.ok(/serif italic text-base sm:text-lg mt-1/.test(f), 'tagline scaled to match');
// Contact lines never break, and the column can always hold them.
assert.ok(/<ul className="mt-3 space-y-2 text-sm whitespace-nowrap">/.test(f), 'contact lines stay on one line');
assert.ok(!/break-words/.test(f), 'no forced mid-word breaks in the footer');
assert.ok(/<div className="col-span-2 sm:col-span-1">\s*<div className="eyebrow opacity-60 text-current">Contact<\/div>/.test(f), 'phones: Contact spans the full width');
for (const n of [3, 2]) assert.ok(f.includes(`lg:grid-cols-[minmax(0,2fr)_repeat(${n},minmax(0,1fr))_max-content]`), `large screens: Contact column sized to content (${n} link columns)`);
console.log('ok - footer brand is larger and every contact line stays on one line');
