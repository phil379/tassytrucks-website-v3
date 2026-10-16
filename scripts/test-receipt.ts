import assert from 'node:assert/strict';
import {
  generateReceiptToken,
  isValidReceiptToken,
  receiptUrlFor,
} from '../lib/receipt-token';
import {
  money,
  fmtPickup,
  receiptCardHtml,
  receiptHtml,
  receiptSubject,
  receiptText,
  type ReceiptData,
} from '../lib/receipt-email';
import { cardLabel, createTripPaymentLink } from '../lib/stripe';

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const R: ReceiptData = {
  tripNumber: 'T-20261016-0003',
  confirmationCode: 'TT-MAJGAV',
  serviceLine: 'care',
  contactFirstName: 'Marcus',
  contactName: 'Marcus Johnson',
  contactPhone: '7045550100',
  contactEmail: 'marcus.johnson@example.com',
  pickupAddress: '1200 Elizabeth Ave, Charlotte, NC',
  dropoffAddress: '1000 Blythe Blvd, Charlotte, NC',
  requestedAt: '2026-10-19T14:00:00Z', // 10:00 a.m. Eastern (EDT)
  amountCents: 4900,
  paidAt: '2026-10-16T18:30:00Z',
  paymentMethodLabel: 'Visa •••• 4242',
  receiptUrl: 'https://example.test/r/abcdefghijklmnopqrstuvwx',
};

async function main() {
  await t('tokens are 24 URL-safe characters and never repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const tok = generateReceiptToken();
      assert.equal(tok.length, 24);
      assert.ok(isValidReceiptToken(tok));
      seen.add(tok);
    }
    assert.equal(seen.size, 500);
  });

  await t('token validation rejects anything that is not exactly a token', () => {
    for (const bad of ['', 'short', 'a'.repeat(23), 'a'.repeat(25), 'a'.repeat(23) + '/', '../../etc/passwdxxxxxxx', 'a'.repeat(23) + ' ', 'a'.repeat(23) + '%']) {
      assert.equal(isValidReceiptToken(bad), false, bad);
    }
  });

  await t('receipt URL is /r/<token> on the site, no double slash', () => {
    assert.match(receiptUrlFor('abc'), /^https:\/\/[^/]+\/r\/abc$/);
  });

  await t('money shows dollars and cents', () => {
    assert.equal(money(4900), '$49.00');
    assert.equal(money(12345), '$123.45');
    assert.equal(money(5), '$0.05');
    assert.equal(money(123456789), '$1,234,567.89');
  });

  await t('pickup time is Eastern, a.m./p.m.', () => {
    assert.equal(fmtPickup('2026-10-19T14:00:00Z'), 'Mon, Oct 19, 2026 · 10:00 a.m.');
    assert.equal(fmtPickup('2026-10-19T21:05:00Z'), 'Mon, Oct 19, 2026 · 5:05 p.m.');
    assert.equal(fmtPickup(null), '—');
    assert.equal(fmtPickup('not a date'), '—');
  });

  await t('card label: brand + last four only', () => {
    assert.equal(cardLabel('visa', '4242'), 'Visa •••• 4242');
    assert.equal(cardLabel('amex', '0005'), 'American Express •••• 0005');
    assert.equal(cardLabel('mastercard', '4444'), 'Mastercard •••• 4444');
    assert.equal(cardLabel(undefined, '1111'), 'Card •••• 1111');
    assert.equal(cardLabel('visa', '42'), null);
    assert.equal(cardLabel('visa', '4242424242424242'), null);
    assert.equal(cardLabel('visa', null), null);
  });

  await t('card shows the approved layout pieces', () => {
    const h = receiptCardHtml(R);
    for (const s of [
      'Payment receipt', 'T-20261016-0003', 'PAID', 'We Transport With Care.', 'logo-receipt.png',
      'FROM', 'Charlotte, NC', '(704) 941-8508', 'book@tassytrucks.com', 'BILLED TO', 'Marcus Johnson',
      'marcus.johnson@example.com', 'Paid with Visa •••• 4242', 'Oct 16, 2026', 'Pickup time',
      'Mon, Oct 19, 2026 · 10:00 a.m.', 'TT-MAJGAV', 'DESCRIPTION', 'AMOUNT', '$49.00', 'Total paid',
      'No fee if you let us know at least 4 hours ahead', 'We never ask for payment details over the phone',
      'Operated by Tassy Trucks LLC', 'Disabled Veteran-Owned', 'SBE / DBE / MBE Certified',
      'Keep this receipt for your records.',
    ]) {
      assert.ok(h.includes(s), `missing: ${s}`);
    }
  });

  await t('no street address, and no card line when the card is unknown', () => {
    const h = receiptCardHtml({ ...R, paymentMethodLabel: null });
    assert.ok(!h.includes('Paid with'));
    assert.ok(!/\bSt\b|Street|Rd\b|Road/.test(h.split('FROM')[1]!.split('BILLED TO')[0]!));
  });

  await t('customer-supplied text is escaped', () => {
    const h = receiptCardHtml({ ...R, contactName: '<script>alert(1)</script>', pickupAddress: 'A & B "x"' });
    assert.ok(!h.includes('<script>'));
    assert.ok(h.includes('&lt;script&gt;'));
    assert.ok(h.includes('A &amp; B &quot;x&quot;'));
  });

  await t('email has the receipt link button and plain-text link', () => {
    const h = receiptHtml(R);
    assert.ok(h.includes('View or save this receipt online'));
    assert.ok(h.includes(`href="${R.receiptUrl}"`));
    assert.ok(receiptText(R).includes(R.receiptUrl!));
    assert.ok(receiptSubject(R).includes('$49.00 paid'));
  });

  await t('email still sends with no receipt link (no button, no dead link)', () => {
    const h = receiptHtml({ ...R, receiptUrl: null });
    assert.ok(!h.includes('View or save this receipt online'));
    assert.ok(!receiptText({ ...R, receiptUrl: null }).includes('View or save'));
  });

  await t('payment link redirects to the receipt page when given one', async () => {
    const calls: Array<{ url: string; body: URLSearchParams }> = [];
    const realFetch = globalThis.fetch;
    process.env.STRIPE_SECRET_KEY = 'sk_test_do_not_use';
    globalThis.fetch = (async (url: string, init?: { body?: string; method?: string }) => {
      if (init?.method === 'POST') calls.push({ url, body: new URLSearchParams(init.body ?? '') });
      const json = String(url).endsWith('/prices')
        ? { id: 'price_x' }
        : String(url).includes('/products')
          ? { data: [] }
          : { id: 'plink_x', url: 'https://buy.stripe.test/x' };
      return new Response(JSON.stringify(json), { status: 200 });
    }) as unknown as typeof fetch;
    try {
      const withUrl = await createTripPaymentLink({
        amountCents: 4900, serviceName: 'Tassy Care', confirmationCode: 'TT-MAJGAV',
        tripRequestId: 'trip-1', serviceLine: 'care', receiptUrl: R.receiptUrl,
      });
      assert.equal(withUrl.id, 'plink_x');
      const link = calls.filter((c) => c.url.endsWith('/payment_links')).pop()!.body;
      assert.equal(link.get('after_completion[type]'), 'redirect');
      assert.equal(link.get('after_completion[redirect][url]'), R.receiptUrl);
      assert.equal(link.get('after_completion[hosted_confirmation][custom_message]'), null);

      await createTripPaymentLink({
        amountCents: 4900, serviceName: 'Tassy Care', confirmationCode: 'TT-MAJGAV',
        tripRequestId: 'trip-1', serviceLine: 'care',
      });
      const old = calls.filter((c) => c.url.endsWith('/payment_links')).pop()!.body;
      assert.equal(old.get('after_completion[type]'), 'hosted_confirmation');
      assert.equal(old.get('after_completion[redirect][url]'), null);
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.STRIPE_SECRET_KEY;
    }
  });

  console.log(`\n${n} receipt tests passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
