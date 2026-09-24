import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';
import { verifyWebhookSignature } from '../../lib/stripe';
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
  type ConfirmedTrip,
} from '../../lib/confirmation-email';
import { generateConfirmationCode, isValidConfirmationCode } from '../../lib/confirmation';

/**
 * The money path.
 *
 * Two things are being protected here. The webhook is the only thing allowed
 * to mark a trip paid, so a forged call to it is a stranger marking every trip
 * paid — every rejection case below is load-bearing. And the confirmation
 * email is the document a customer screenshots and shows a front desk, so what
 * it contains, and what it must never contain, is asserted rather than assumed.
 */

const SECRET = 'whsec_test_not_a_real_secret';

function sign(body: string, secret = SECRET, tsSeconds = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac('sha256', secret).update(`${tsSeconds}.${body}`, 'utf8').digest('hex');
  return `t=${tsSeconds},v1=${v1}`;
}

test.describe('webhook signatures', () => {
  const body = JSON.stringify({ type: 'checkout.session.completed' });

  test('a correctly signed body is accepted', () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  test('no signature header is rejected', () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
  });

  test('no configured secret is rejected — it must never fail open', () => {
    expect(verifyWebhookSignature(body, sign(body), undefined)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), '')).toBe(false);
  });

  test('a signature from a different secret is rejected', () => {
    expect(verifyWebhookSignature(body, sign(body, 'whsec_someone_elses'), SECRET)).toBe(false);
  });

  test('a body altered after signing is rejected', () => {
    const header = sign(body);
    const tampered = JSON.stringify({ type: 'checkout.session.completed', extra: 'x' });
    expect(verifyWebhookSignature(tampered, header, SECRET)).toBe(false);
  });

  test('a replayed call from six minutes ago is rejected', () => {
    const old = Math.floor(Date.now() / 1000) - 360;
    expect(verifyWebhookSignature(body, sign(body, SECRET, old), SECRET)).toBe(false);
  });

  test('a call from four minutes ago is still inside tolerance', () => {
    const recent = Math.floor(Date.now() / 1000) - 240;
    expect(verifyWebhookSignature(body, sign(body, SECRET, recent), SECRET)).toBe(true);
  });

  test('a timestamp from the future is rejected too', () => {
    const ahead = Math.floor(Date.now() / 1000) + 3600;
    expect(verifyWebhookSignature(body, sign(body, SECRET, ahead), SECRET)).toBe(false);
  });

  test('junk in the header does not throw', () => {
    for (const header of ['', 'garbage', 't=,v1=', 'v1=abc', 't=123', 't=abc,v1=def']) {
      expect(() => verifyWebhookSignature(body, header, SECRET)).not.toThrow();
      expect(verifyWebhookSignature(body, header, SECRET)).toBe(false);
    }
  });
});

test.describe('confirmation codes', () => {
  test('they avoid every character a phone line confuses', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateConfirmationCode();
      expect(code).toMatch(/^TT-[34679ACDEFGHJKMNPQRTVWXY]{6}$/);
      expect(isValidConfirmationCode(code)).toBe(true);
    }
  });

  test('two codes in a row are not the same', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateConfirmationCode()));
    expect(codes.size).toBeGreaterThan(45);
  });
});

test.describe('the confirmation email', () => {
  const TRIP = {
    serviceLine: 'recovery',
    contactFirstName: 'Maria',
    contactLastName: 'Santos',
    contactPhone: '704-555-0142',
    contactEmail: 'maria@example.com',
    pickupAddress: '1000 Blythe Blvd, Charlotte NC',
    dropoffAddress: '2513 Example St, Charlotte NC',
    requestedAt: '2026-10-07T13:00',
    returnTrip: false,
    returnAt: null,
    passengers: 1,
    mobility: 'ambulatory',
  } as Parameters<typeof confirmationHtml>[1];

  const PAID: ConfirmedTrip = {
    confirmationCode: 'TT-4K7M2Q',
    agreedCents: 17400,
    payUrl: 'https://buy.stripe.com/test_abc123',
  };

  test('the code and the price are in the subject and both bodies', () => {
    expect(confirmationSubject(PAID, TRIP)).toContain('TT-4K7M2Q');
    for (const body of [confirmationHtml(PAID, TRIP), confirmationText(PAID, TRIP)]) {
      expect(body).toContain('TT-4K7M2Q');
      expect(body).toContain('$174');
    }
  });

  test('the pay link appears in both the HTML and the plain text', () => {
    expect(confirmationHtml(PAID, TRIP)).toContain('https://buy.stripe.com/test_abc123');
    expect(confirmationText(PAID, TRIP)).toContain('https://buy.stripe.com/test_abc123');
  });

  test('no pay link, no pay button — a facility on account must not get one', () => {
    const onAccount: ConfirmedTrip = { ...PAID, payUrl: null };
    expect(confirmationHtml(onAccount, TRIP)).not.toContain('buy.stripe.com');
    expect(confirmationHtml(onAccount, TRIP)).not.toContain('Pay $174 now');
    expect(confirmationText(onAccount, TRIP)).not.toContain('PAY AHEAD');
  });

  test('it never invites payment details over the phone', () => {
    const html = confirmationHtml(PAID, TRIP);
    expect(html).toContain('never ask');
    // The dispatch number is there to call about the TRIP, not to read a card to.
    expect(html).toContain('(704) 941-8508');
  });

  test('a name with HTML in it cannot break out of the markup', () => {
    const nasty = { ...TRIP, contactLastName: '<script>alert(1)</script>' } as typeof TRIP;
    const html = confirmationHtml(PAID, nasty);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
