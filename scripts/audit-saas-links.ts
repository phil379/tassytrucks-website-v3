/**
 * Verifies the SaaS deep-links the marketing site STILL RENDERS.
 *
 * Rescoped after the booking CTAs moved to the in-repo /request pipeline. The
 * booking surface (book.*, seoBook, WINNIE_BOOK_URL) is no longer rendered
 * anywhere, so probing it was pure noise — a SaaS outage on routes nothing
 * links to would fail CI for no reason. Those constants stay in
 * lib/saas-links.ts, unaudited and unused, on purpose.
 *
 * What this still checks:
 *   1. Dead route      — the facility, careers and subscription links the site
 *                        does render (FIX_PROD_024 shipped 404s here twice)
 *   2. Dropped query   — /facility/intake once 307'd and ate the query string,
 *                        silently killing marketing attribution
 *   3. Leaked login    — FIX_PROD_142: portal.* must never be rendered publicly
 *   4. Dead booking    — no file may re-render the book.* / seoBook /
 *                        WINNIE_BOOK_URL surface
 *   5. Bad service     — every /request?service=X must name a requestable line
 *
 * Checks 3-5 are static and need no network, so they run even if the SaaS is
 * down. Run:  bun run scripts/audit-saas-links.ts
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { subscribe, apply, facilitySignup, facilityIntake } from '../lib/saas-links';
import { SERVICE_LINES } from '../lib/trip-request';

const TIMEOUT_MS = 15_000;
const ATTEMPTS = 3;

type Target = { label: string; url: string };

// ── only the SaaS URLs the marketing site still renders ─────────────────
// portal.* is deliberately NOT probed: it must never be rendered at all, which
// the static leak check below enforces instead.
const targets: Target[] = [
  ...Object.entries(subscribe).map(([k, url]) => ({ label: `subscribe.${k}`, url })),
  ...Object.entries(apply).map(([k, url]) => ({ label: `apply.${k}`, url })),
  { label: 'facilitySignup()', url: facilitySignup() },
  { label: 'facilitySignup(veterinary)', url: facilitySignup('veterinary') },
  { label: 'facilityIntake(attributed)', url: facilityIntake({ source: 'ci-audit', type: 'veterinary' }) },
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

console.log(`\n🔗 Auditing ${targets.length} rendered SaaS deep-links\n`);

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

// ── the dead booking surface must not come back ─────────────────────────
const sourceFiles = ['app', 'components'].flatMap(walk);

const revived = sourceFiles.filter((f) =>
  /\b(book\s*\.\s*\w+|seoBook\s*\(|WINNIE_BOOK_URL)\b/.test(stripComments(readFileSync(f, 'utf8'))),
);

if (revived.length) {
  failures.push(
    `A SaaS booking deep-link is rendered again — booking lives at /request now:\n    ${revived.join('\n    ')}`,
  );
}

// ── every /request?service=X names a line a visitor can actually pick ───
const requestable = new Set(SERVICE_LINES.map((s) => s.value));
const badService: string[] = [];

for (const f of sourceFiles) {
  const src = stripComments(readFileSync(f, 'utf8'));
  for (const m of src.matchAll(/service=([a-z_]+)/g)) {
    if (!requestable.has(m[1] as never)) badService.push(`${f} → service=${m[1]}`);
  }
}

if (badService.length) {
  failures.push(
    `/request link names a service that is not requestable:\n    ${badService.join('\n    ')}`,
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

console.log(
  `\n✅ ${targets.length} rendered SaaS links reachable, attribution intact, ` +
    `no login leaks, no revived booking links, all service params valid.\n`,
);
