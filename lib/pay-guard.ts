/**
 * Which trips may be sent to a live Stripe checkout from /pay/<token>?
 *
 * Only a trip that still owes money by card. The caller handles `paid` first (it shows the receipt);
 * everything else that is not plainly "unpaid" - on account, refunded, any value we do not know - and
 * every cancelled trip gets a plain page instead of a checkout. An allow-list on purpose: a status we
 * add later must not silently become chargeable.
 */
export type PayBlock = 'cancelled' | 'on_account' | 'refunded' | 'not_payable';

export function payBlockFor(row: { status?: string | null; payment_status?: string | null }): PayBlock | null {
  const pay = row.payment_status ?? 'unpaid';
  if (pay === 'on_account') return 'on_account';
  if (pay === 'refunded') return 'refunded';
  if (row.status === 'cancelled') return 'cancelled';
  if (pay !== 'unpaid') return 'not_payable';
  return null;
}

const PHONE = '(704) 941-8508';

export function payBlockMessage(block: PayBlock): { status: number; title: string; body: string } {
  switch (block) {
    case 'cancelled':
      return { status: 410, title: 'This ride was cancelled', body: `Nothing is due for a cancelled ride. If you think this is a mistake, please call ${PHONE}.` };
    case 'on_account':
      return { status: 200, title: 'Nothing to pay here', body: `This ride is billed to an account, so there is no card payment to make. Questions? Call ${PHONE}.` };
    case 'refunded':
      return { status: 200, title: 'This payment was refunded', body: `This ride has already been refunded, so there is nothing to pay. Questions? Call ${PHONE}.` };
    default:
      return { status: 410, title: 'This payment link is not available', body: `Please call ${PHONE} and we will help right away.` };
  }
}
