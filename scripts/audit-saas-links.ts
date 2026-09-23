/**
 * Verifies every deep-link in lib/saas-links.ts against the live SaaS.
 *
 * Catches the three failure modes this repo has actually shipped:
 *   1. Dead route      — FIX_PROD_024 (/driver-apply, /sales-rep-apply were 404s)
 *                        PUBLISH_READY (/driver-app, /sales-app were 404s)
 *   2. Dropped query   — /facility/intake 307'd to /facility/signup and ate the
 *                        query string, silently killing marketing attribution
 *   3. Leaked login    — FIX_PROD_142: portal.* must never be rendered publicly
 *
 * Run:  bun run scripts/audit-saas-links.ts
 * Exits non-zero on any failure, so CI fails the build.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  book, subscribe, apply, portal, seoBook,
  facilitySignup, facilityIntake, WINNIE_BOOK_URL,
} from '../lib/saas-links';

const TIMEOUT_MS = 15_000;
const ATTEMPTS = 3;

type Target = { label: string; url: string };

// ── every URL the marketing site can send a visitor to ──────────────────
const targets: Target[] = [
  ...Object.entries(book).map(([k, url]) => ({ label: `book.${k}`, url })),
  ...Object.entries(subscribe).map(([k, url]) => ({ label: `subscribe.${k}`, url })),
  ...Object.entries(apply).map(([k, url]) => ({ label: `apply.${k}`, url })),
  ...Object.entries(portal).map(([k, url]) => ({ label: `portal.${k}`, url })),
  { label: 'WINNIE_BOOK_URL', url: WINNIE_BOOK_URL },
  { label: 'facilitySignup()', url: facilitySignup() },
  { label: 'facilitySignup(veterinary)', url: facilitySignup('veterinary') },
  { label: 'facilityIntake(attributed)', url: facilityIntake({ source: 'ci-audit', type: 'veterinary' }) },
  ...(['nemt', 'vip', 'winnie', 'renew', 'recover'] as const).map((v) => ({
    label: `seoBook(${v})`,
    url: seoBook(v, { source: 'ci-audit' }),
  })),
];

const fetchOnce = async (url: string) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    // GET, not HEAD — Next.js route handlers don't always answer HEAD.
    return await fetch(url, { redirect: 'follow', signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
};

const failures: string[] = [];
const warnings: string[] = [];

console.log(`\n🔗 Auditing ${targets.length} SaaS deep-links\n`);

for (const { label, url } of targets) {
  let res: Response | undefined;
  let lastErr: unknown;

  for (let i = 0; i < ATTEMPTS; i++) {
    try { res = await fetchOnce(url); break; }
    catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 1000 * (i + 1))); }
  }

  if (!res) {
    failures.push(`${label}\n    ${url}\n    unreachable after ${ATTEMPTS} attempts: ${lastErr}`);
    console.log(`  ✗ ${label}  — unreachable`);
    continue;
  }

  if (res.status >= 400) {
    failures.push(`${label}\n    ${url}\n    HTTP ${res.status}`);
    console.log(`  ✗ ${label}  — HTTP ${res.status}`);
    continue;
  }

  // Attribution guard: every param we sent must survive to the final URL.
  const sent = new URL(url).searchParams;
  const landed = new URL(res.url).searchParams;
  const dropped = [...sent.keys()].filter((k) => !landed.has(k));

  if (dropped.length) {
    failures.push(
      `${label}\n    ${url}\n    redirected to ${res.url}\n    DROPPED query params: ${dropped.join(', ')}`,
    );
    console.log(`  ✗ ${label}  — dropped ${dropped.join(', ')}`);
    continue;
  }

  if (res.url !== url) warnings.push(`${label} redirects → ${res.url}`);
  console.log(`  ✓ ${label}`);
}

// ── FIX_PROD_142: no public surface may render a portal/login deep-link ──
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });

// Strip comments first — the whole point of FIX_PROD_142 is documented in
// comments that mention `portal.login`, and matching those is a false positive.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const leaks = ['app', 'components']
  .flatMap(walk)
  .filter((f) => /\bportal\s*\.\s*(login|facilityLogin)\b/.test(stripComments(readFileSync(f, 'utf8'))));

if (leaks.length) {
  failures.push(
    `FIX_PROD_142 — SaaS login link rendered on a public surface:\n    ${leaks.join('\n    ')}`,
  );
}

// ── report ──────────────────────────────────────────────────────────────
if (warnings.length) {
  console.log('\n⚠️  Redirects (not failures, but attribution survived):');
  warnings.forEach((w) => console.log(`  • ${w}`));
}

if (failures.length) {
  console.error(`\n❌ ${failures.length} problem(s):\n`);
  failures.forEach((f) => console.error(`  • ${f}\n`));
  process.exit(1);
}

console.log(`\n✅ All ${targets.length} links reachable, attribution intact, no login leaks.\n`);
