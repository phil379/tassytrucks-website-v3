/**
 * What a (re-)confirm of a trip is allowed to change. Pure, so it can be tested without a database.
 *
 * A confirm never undoes money state:
 *  - a trip that is already paid or closed out (cancelled / completed / no_show) keeps the price it has;
 *  - `paid`, `refunded` and `on_account` are never changed - only `unpaid` can become `on_account`;
 *  - a closed trip is not reopened (its status stays);
 *  - only a trip that still owes money by card (unpaid, not cancelled, not being put on account) is
 *    payable, i.e. gets a payment link and a pay link in the email;
 *  - when an existing payment link is being resent, the amount is what that link will actually charge
 *    (the payment attempt's amount, else the stored agreed price), so the email, the receipt and
 *    agreed_cents all agree with what /pay and the webhook use.
 */
export const CLOSED_STATUSES = ['cancelled', 'completed', 'no_show'];

export type ConfirmPlan = {
  /** The amount the email shows, the link is minted for and (unless kept) agreed_cents becomes. */
  amountCents: number;
  /** True when the requested price differed from what the existing link charges and was ignored. */
  amountOverridden: boolean;
  payableNow: boolean;
  isPaid: boolean;
  isClosed: boolean;
  nextStatus: string;
  nextPaymentStatus: string;
  /** The value to write to agreed_cents. */
  agreedCentsToWrite: number;
};

export function planConfirm(input: {
  row: { status?: string | null; payment_status?: string | null; agreed_cents?: number | null };
  requestedCents: number;
  onAccount: boolean;
  /** The trip already has a payment link being resent; its attempt amount if one is on file. */
  existingLink: boolean;
  attemptCents?: number | null;
}): ConfirmPlan {
  const { row, requestedCents, onAccount } = input;
  const currentPay = row.payment_status ?? 'unpaid';
  const isPaid = currentPay === 'paid';
  const status = String(row.status ?? 'new');
  const isClosed = CLOSED_STATUSES.includes(status);
  const stored =
    typeof row.agreed_cents === 'number' && Number.isInteger(row.agreed_cents) && row.agreed_cents > 0
      ? row.agreed_cents
      : null;
  const keepStored = (isPaid || isClosed) && stored !== null;

  let amountCents = keepStored ? (stored as number) : requestedCents;
  let amountOverridden = keepStored && stored !== requestedCents;

  if (input.existingLink && !isPaid) {
    const charged = input.attemptCents ?? stored;
    if (charged && charged !== amountCents) {
      amountCents = charged;
      amountOverridden = true;
    }
  }

  return {
    amountCents,
    amountOverridden,
    payableNow: !onAccount && currentPay === 'unpaid' && status !== 'cancelled',
    isPaid,
    isClosed,
    nextStatus: isClosed ? status : 'confirmed',
    nextPaymentStatus: currentPay === 'unpaid' && onAccount ? 'on_account' : currentPay,
    agreedCentsToWrite: keepStored ? (stored as number) : amountCents,
  };
}
