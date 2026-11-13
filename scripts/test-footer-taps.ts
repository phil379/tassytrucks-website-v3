import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Footer links (phone number included) keep a real tap area: 24px everywhere, 36px on phones.
const css = readFileSync('app/globals.css', 'utf8');
assert.ok(/footer\[data-site-chrome\] a,\s*footer\[data-site-chrome\] button \{\s*display: inline-flex;\s*align-items: center;\s*min-height: 24px;/.test(css));
assert.ok(/@media \(max-width: 639px\) \{\s*footer\[data-site-chrome\] a,\s*footer\[data-site-chrome\] button \{\s*min-height: 36px;/.test(css));
assert.ok(/<footer data-site-chrome/.test(readFileSync('components/Footer.tsx', 'utf8')), 'the selector still matches the footer');
console.log('ok - footer links keep a 24px (36px on phones) tap area');
