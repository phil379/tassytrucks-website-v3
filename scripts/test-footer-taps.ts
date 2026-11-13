import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Footer links (phone number included) keep a real tap area (about 25px, 37px on phones) AND still
// wrap: flex boxes did not, and pushed the email links off a 320-375px screen (CI, 2026-11-13).
const css = readFileSync('app/globals.css', 'utf8');
const block = css.slice(css.indexOf('footer[data-site-chrome] a,'));
assert.ok(/display: inline-block;\s*max-width: 100%;\s*overflow-wrap: anywhere;\s*padding-block: 4px;/.test(block));
assert.ok(/@media \(max-width: 639px\) \{\s*footer\[data-site-chrome\] a,\s*footer\[data-site-chrome\] button \{\s*padding-block: 10px;/.test(block));
assert.ok(!/inline-flex/.test(block), 'no flex: it stops long text from wrapping');
assert.ok(/<footer data-site-chrome/.test(readFileSync('components/Footer.tsx', 'utf8')), 'the selector still matches the footer');
console.log('ok - footer links keep a bigger tap area and still wrap');
