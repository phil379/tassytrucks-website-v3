/**
 * Stops marketing / prospecting / outreach email from going out without what the law
 * requires on it. Every email sent from this site passes through assertEmailAllowed()
 * (see lib/notifications.ts). Transactional email is always allowed here.
 *
 * Marketing email needs a full postal address (CAN-SPAM) and a one-click unsubscribe.
 * While BUSINESS_MAILING_ADDRESS is empty, ALL marketing email is blocked.
 *
 * This is not legal advice or a promise of compliance; counsel should review it.
 */
import { BUSINESS_MAILING_ADDRESS } from '@/lib/business';

export type EmailKind = 'transactional' | 'marketing';

export class EmailBlockedError extends Error {
  constructor(public readonly reason: string) {
    super(`Email blocked: ${reason}`);
    this.name = 'EmailBlockedError';
  }
}

export interface MarketingChecks {
  /** Defaults to BUSINESS_MAILING_ADDRESS. Passed in only by tests. */
  mailingAddress?: string;
  /** The one-click unsubscribe link that will be in the message. */
  unsubscribeUrl?: string | null;
}

/** Returns why the email may not be sent, or null when it may. */
export function emailBlockReason(kind: EmailKind, checks: MarketingChecks = {}): string | null {
  if (kind === 'transactional') return null;
  const address = (checks.mailingAddress ?? BUSINESS_MAILING_ADDRESS).trim();
  if (!address) {
    return 'no business mailing address is set (BUSINESS_MAILING_ADDRESS in lib/business.ts is empty), so marketing email is not allowed';
  }
  if (!checks.unsubscribeUrl) return 'marketing email needs a working one-click unsubscribe link';
  return null;
}

export function assertEmailAllowed(kind: EmailKind, checks: MarketingChecks = {}): void {
  const reason = emailBlockReason(kind, checks);
  if (reason) throw new EmailBlockedError(reason);
}
