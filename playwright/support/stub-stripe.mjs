#!/usr/bin/env node
/**
 * A tiny stand-in for the Stripe REST API, for the Scholar card specs.
 *
 *   node playwright/support/stub-stripe.mjs 3944
 *
 * The app talks to it through STRIPE_API_BASE=http://127.0.0.1:3944/v1 with a fake
 * STRIPE_SECRET_KEY. It implements only what the card-on-file flow touches:
 *
 *   POST /v1/customers                   -> a fake customer
 *   POST /v1/checkout/sessions           -> a fake hosted page URL (setup mode)
 *   GET  /v1/checkout/sessions/:id       -> the session, setup_intent expanded
 *   GET  /v1/payment_methods/:id         -> visa ending 4242
 *
 * and three inspection or control endpoints for the specs:
 *   GET  /__log                          every request seen: method, path, decoded form body
 *   POST /__complete/:sessionId          mark a session complete (the parent "added a card")
 *   POST /__fail?n=1                     fail the next n Stripe API calls with a 500
 *   POST /__reset                        forget everything
 *
 * This is test infrastructure. It never talks to Stripe and never sees a real key.
 */
import http from 'node:http';

const port = Number(process.argv[2] || 3944);
let log = [];
let sessions = new Map();
let counter = 0;
let failNext = 0;

const next = (p) => `${p}_stub_${++counter}`;

/** Stripe's bracketed form keys -> a nested object, enough for metadata[...]. */
function decode(raw) {
  const out = { fields: {}, metadata: {} };
  for (const [k, v] of new URLSearchParams(raw)) {
    out.fields[k] = v;
    const m = k.match(/^metadata\[(.+)\]$/);
    if (m) out.metadata[m[1]] = v;
  }
  return out;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const send = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body ?? {}));
    };

    if (url.pathname === '/__log') return send(200, log);
    if (url.pathname === '/__reset') {
      log = [];
      sessions = new Map();
      failNext = 0;
      return send(200, { ok: true });
    }
    if (url.pathname === '/__fail') {
      failNext = Number(url.searchParams.get('n') || 1);
      return send(200, { ok: true });
    }
    const complete = url.pathname.match(/^\/__complete\/(.+)$/);
    if (complete) {
      const s = sessions.get(complete[1]);
      if (!s) return send(404, { error: 'no such session' });
      s.status = 'complete';
      s.setup_intent.status = 'succeeded';
      return send(200, { ok: true });
    }

    const body = decode(raw);
    log.push({ method: req.method, path: url.pathname, fields: body.fields });

    if (!url.pathname.startsWith('/v1/')) return send(404, { error: { message: 'not found' } });
    if (failNext > 0) {
      failNext -= 1;
      return send(500, { error: { message: 'stub: simulated Stripe outage' } });
    }

    if (req.method === 'POST' && url.pathname === '/v1/customers') {
      return send(200, { id: next('cus'), object: 'customer', metadata: body.metadata });
    }

    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      const id = `cs_test_stub${++counter}${Math.random().toString(36).slice(2, 8)}`;
      sessions.set(id, {
        id,
        mode: body.fields.mode,
        status: 'open',
        customer: body.fields.customer ?? null,
        metadata: body.metadata,
        setup_intent: { id: next('seti'), status: 'requires_payment_method', payment_method: next('pm') },
      });
      return send(200, { id, url: `https://checkout.stripe.test/c/setup/${id}` });
    }

    const one = url.pathname.match(/^\/v1\/checkout\/sessions\/(.+)$/);
    if (req.method === 'GET' && one) {
      const s = sessions.get(decodeURIComponent(one[1]));
      return s ? send(200, s) : send(404, { error: { message: 'No such checkout.session' } });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/v1/payment_methods/')) {
      return send(200, { id: url.pathname.split('/').pop(), card: { brand: 'visa', last4: '4242' } });
    }

    return send(404, { error: { message: `stub: unhandled ${req.method} ${url.pathname}` } });
  });
});

server.listen(port, '127.0.0.1', () => console.log(`stub stripe on ${port}`));
