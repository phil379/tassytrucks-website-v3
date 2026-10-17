#!/usr/bin/env node
/**
 * A tiny in-memory stand-in for Supabase's PostgREST, for running the Scholar
 * specs WITHOUT production credentials.
 *
 *   node playwright/support/stub-supabase.mjs 3960
 *
 * then start the app with SUPABASE_URL=http://127.0.0.1:3960
 * SUPABASE_SERVICE_ROLE_KEY=stub RESEND_API_KEY= and run Playwright.
 *
 * It implements only what the Scholar routes use: insert (returning the row),
 * eq/like filtered select / patch / delete, plus two inspection endpoints:
 *   GET /__rows/<table>   every row currently stored in that table
 *   GET /__log            every request the stub has seen (method + path)
 * A NUL byte anywhere in an insert is refused the way Postgres refuses it, so
 * "a failed insert returns a failure" can be exercised.
 *
 * This is test infrastructure. It never talks to a real database.
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.argv[2] || 3960);
const tables = new Map();
const log = [];

const rowsOf = (t) => {
  if (!tables.has(t)) tables.set(t, []);
  return tables.get(t);
};

function filterRows(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    if (v.startsWith('eq.')) out = out.filter((r) => String(r[k]) === v.slice(3));
    else if (v.startsWith('neq.')) out = out.filter((r) => String(r[k]) !== v.slice(4));
    else if (v.startsWith('like.') || v.startsWith('ilike.')) {
      const ci = v.startsWith('ilike.');
      const pat = v.slice(ci ? 6 : 5);
      const re = new RegExp('^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', ci ? 'i' : '');
      out = out.filter((r) => re.test(String(r[k] ?? '')));
    }
  }
  return out;
}

// A small reference list so the school picker has something to find. Synthetic.
rowsOf('schools').push(
  ...Array.from({ length: 150 }, (_, i) => ({
    id: randomUUID(),
    name: `Pw Seed ${String(i + 1).padStart(3, '0')} Elementary`,
    address: `${100 + i} Seed St, Charlotte, NC`,
    level: 'elementary',
    kind: 'public',
    bell_am: null,
    bell_pm: null,
    active: true,
  })),
);

// The scholar-ux specs pick this school by name; the county stores addresses in capitals.
rowsOf('schools').push({
  id: randomUUID(),
  name: 'Ardrey Kell High',
  address: '10220 ARDREY KELL RD, CHARLOTTE, NC 28277',
  level: 'high',
  kind: 'public',
  bell_am: null,
  bell_pm: null,
  active: true,
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const send = (code, body, extra = {}) => {
      res.writeHead(code, { 'Content-Type': 'application/json', ...extra });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };

    if (url.pathname === '/__log') return send(200, log);
    if (url.pathname.startsWith('/__rows/')) return send(200, rowsOf(url.pathname.slice(8)));
    if (url.pathname === '/__reset') {
      tables.clear();
      log.length = 0;
      return send(200, { ok: true });
    }

    const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    log.push(`${req.method} ${url.pathname}`);
    if (!m) return send(404, { message: 'not found' });
    const table = m[1];
    const rows = rowsOf(table);
    const wantsObject = String(req.headers.accept || '').includes('vnd.pgrst.object');
    const wantsRepr = String(req.headers.prefer || '').includes('return=representation');

    if (req.method === 'POST') {
      if (raw.includes('\\u0000')) {
        return send(400, { code: '22P05', message: 'unsupported Unicode escape sequence', details: null, hint: null });
      }
      const body = JSON.parse(raw || '{}');
      // Postgres `time` columns come back as HH:MM:SS; mimic that for *_time.
      const asTime = (b) =>
        Object.fromEntries(
          Object.entries(b).map(([k, v]) => [k, k.endsWith('_time') && /^\d\d:\d\d$/.test(String(v)) ? `${v}:00` : v]),
        );
      const made = (Array.isArray(body) ? body : [body]).map((b) => ({
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...asTime(b),
      }));
      rows.push(...made);
      if (!wantsRepr) return send(201);
      return send(201, wantsObject ? made[0] : made);
    }

    if (req.method === 'GET') {
      let hit = filterRows(rows, url.searchParams);
      const order = url.searchParams.get('order');
      if (order) {
        const [col, dir] = order.split('.');
        hit = [...hit].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (dir === 'desc' ? -1 : 1));
      }
      const limit = Number(url.searchParams.get('limit'));
      if (limit) hit = hit.slice(0, limit);
      if (wantsObject) return hit[0] ? send(200, hit[0]) : send(406, { code: 'PGRST116', message: 'no rows' });
      return send(200, hit);
    }

    if (req.method === 'PATCH') {
      const patch = JSON.parse(raw || '{}');
      const hit = filterRows(rows, url.searchParams);
      hit.forEach((r) => Object.assign(r, patch));
      return wantsRepr ? send(200, hit) : send(204);
    }

    if (req.method === 'DELETE') {
      const hit = new Set(filterRows(rows, url.searchParams));
      tables.set(table, rows.filter((r) => !hit.has(r)));
      return send(204);
    }

    return send(405, { message: 'method not allowed' });
  });
});

server.listen(port, '127.0.0.1', () => console.log(`stub supabase on ${port}`));
