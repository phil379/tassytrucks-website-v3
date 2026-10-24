/**
 * The do-not-email list. Marketing / outreach email must never go to an address on it.
 *
 * STAGED: the table is in docs/migrations_pending/20261024T0200_email_suppressions.sql and has NOT
 * been applied. Until Phil applies it and flips SUPPRESSION_TABLE_READY, this module cannot
 * promise that an unsubscribed address is never emailed again, so marketing email is refused
 * (see sendMarketingEmail). Transactional email is never affected by this list.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normaliseEmail } from '@/lib/unsubscribe-token';

export const SUPPRESSION_TABLE = 'email_suppressions';
export const SUPPRESSION_TABLE_READY = false;

export class SuppressionUnavailableError extends Error {
  constructor() {
    super('the do-not-email list is not set up yet, so marketing email cannot be sent safely');
    this.name = 'SuppressionUnavailableError';
  }
}

export async function isSuppressed(email: string): Promise<boolean> {
  if (!SUPPRESSION_TABLE_READY) throw new SuppressionUnavailableError();
  const { data, error } = await supabaseAdmin()
    .from(SUPPRESSION_TABLE)
    .select('email')
    .eq('email', normaliseEmail(email))
    .maybeSingle();
  if (error) throw new Error(`suppression check failed: ${error.message}`);
  return Boolean(data);
}

/** Adds an address. Idempotent. Returns false when the table is not set up (the caller falls back to telling the operator). */
export async function suppress(email: string, source: string): Promise<boolean> {
  if (!SUPPRESSION_TABLE_READY) return false;
  const { error } = await supabaseAdmin()
    .from(SUPPRESSION_TABLE)
    .upsert({ email: normaliseEmail(email), source }, { onConflict: 'email' });
  if (error) throw new Error(`could not record the unsubscribe: ${error.message}`);
  return true;
}
