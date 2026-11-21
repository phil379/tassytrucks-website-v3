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
  receiptHasJourneyDetail,
  receiptHtml,
  receiptJourney,
  receiptPriceLines,
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
      'No fee if you let us know at least 2 hours ahead', 'We never ask for payment details over the phone',
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

  // ── Transparency (Phil, 2026-11-21): the full journey + itemised charges ──
  // The Liz shape, from the live test receipt that prompted the change:
  // round trip, PetSmart stop on the way back, Saturday, $160 paid.
  const LIZ: ReceiptData = {
    tripNumber: 'T-20261121-0036',
    confirmationCode: 'TT-DE3QHT',
    serviceLine: 'winnie',
    contactFirstName: 'Liz',
    contactName: 'Liz Tassy',
    contactEmail: 'liz@example.com',
    pickupAddress: '2513 Pruitt St, Charlotte, NC 28208',
    dropoffAddress: '2523 South Blvd, Charlotte, NC 28203',
    requestedAt: '2026-11-21T22:30:00Z', // Sat, Nov 21, 2026 · 5:30 p.m. EST
    returnTrip: true,
    returnAt: '2026-11-21T23:30:00Z', // 6:30 p.m. EST
    returnStopAddress: '5401 South Blvd Ste 14, Charlotte, NC 28217',
    returnStopFeeCents: 1000,
    estimateLowCents: 16000,
    estimateHighCents: 16000,
    amountCents: 16000,
    paidAt: '2026-11-21T18:25:00Z',
    paymentMethodLabel: 'Visa •••• 4242',
  };

  await t('round trip with a return-leg stop: journey covers both legs and the stop, in order', () => {
    const steps = receiptJourney(LIZ);
    assert.deepEqual(
      steps.map((s) => s.label),
      ['Pickup', 'Drop-off', 'Return pickup', 'Stop on the way back', 'Final drop-off'],
    );
    assert.deepEqual(
      steps.map((s) => s.address),
      [
        '2513 Pruitt St, Charlotte, NC 28208',
        '2523 South Blvd, Charlotte, NC 28203',
        '2523 South Blvd, Charlotte, NC 28203',
        '5401 South Blvd Ste 14, Charlotte, NC 28217',
        '2513 Pruitt St, Charlotte, NC 28208',
      ],
    );
    assert.equal(steps[0]!.when, LIZ.requestedAt);
    assert.equal(steps[2]!.when, LIZ.returnAt);
    assert.equal(receiptHasJourneyDetail(LIZ), true);
  });

  await t('Liz price itemises to the stored components and foots to the $160 paid', () => {
    const lines = receiptPriceLines(LIZ);
    assert.ok(lines);
    assert.deepEqual(
      lines.map((l) => [l.label, l.cents]),
      [
        ['Winnie Ride ride', 13000],
        ['Weekend', 2000],
        ['Stop fee on the way back (15 min waiting included)', 1000],
      ],
    );
    assert.equal(lines.reduce((sum, l) => sum + l.cents, 0), LIZ.amountCents);
  });

  await t('Liz receipt card + text show the journey and every charge line', () => {
    const h = receiptCardHtml(LIZ);
    for (const s of [
      'YOUR TRIP', 'Return pickup', 'Stop on the way back', 'Final drop-off',
      '5401 South Blvd Ste 14, Charlotte, NC 28217', 'Sat, Nov 21, 2026 · 6:30 p.m.',
      '$130.00', 'Weekend', '$20.00', 'Stop fee on the way back (15 min waiting included)',
      '$10.00', 'Total paid', '$160.00',
    ]) {
      assert.ok(h.includes(s), `missing: ${s}`);
    }
    const txt = receiptText(LIZ);
    assert.ok(txt.includes('Stop on the way back: 5401 South Blvd Ste 14, Charlotte, NC 28217'));
    assert.ok(txt.includes('Weekend: $20.00'));
    assert.ok(txt.includes('Total paid: $160.00'));
  });

  await t('one-way trip with an outbound stop: journey and stop fee line, no return leg', () => {
    const one: ReceiptData = {
      ...R,
      stopAddress: '800 Pharmacy Rd, Charlotte, NC',
      stopFeeCents: 1000,
      estimateLowCents: 5900,
      estimateHighCents: 5900,
      amountCents: 5900,
    };
    assert.deepEqual(
      receiptJourney(one).map((s) => s.label),
      ['Pickup', 'Stop on the way', 'Drop-off'],
    );
    const lines = receiptPriceLines(one);
    assert.ok(lines);
    assert.equal(lines.reduce((sum, l) => sum + l.cents, 0), 5900);
    assert.ok(lines.some((l) => l.label.startsWith('Stop fee on the way (15 min')));
  });

  await t('one-way no-stop receipt is unchanged in substance', () => {
    assert.equal(receiptHasJourneyDetail(R), false);
    assert.equal(receiptPriceLines(R), null);
    const h = receiptCardHtml(R);
    assert.ok(!h.includes('YOUR TRIP'));
    assert.ok(!receiptText(R).includes('Charges:'));
  });

  await t('a dispatcher-set price is never reverse-engineered, but its journey still prints', () => {
    const manual: ReceiptData = { ...LIZ, estimateLowCents: 9000, estimateHighCents: 9000 };
    assert.equal(receiptPriceLines(manual), null);
    const h = receiptCardHtml(manual);
    assert.ok(h.includes('YOUR TRIP'));
    assert.ok(!h.includes('Stop fee on the way back (15 min waiting included)'));
    assert.ok(h.includes('$160.00'));
  });

  await t('a hotel flat price stays one line and says so', () => {
    const lines = receiptPriceLines({ ...R, hotelFlat: true, amountCents: 9900 });
    assert.ok(lines);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.cents, 9900);
    assert.ok(lines[0]!.note?.includes('Flat hotel price'));
  });

  console.log(`\n${n} receipt tests passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
