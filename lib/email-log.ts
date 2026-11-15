import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Website email send log — one row in public.notification_log per send attempt.
 *
 * WHY. Every email this site sends — operator alerts, the customer receipt,
 * facility console mail, marketing — funnels through the three send helpers in
 * lib/notifications.ts, and until now none of it was recorded anywhere. A
 * Resend outage, a missing API key, or a marketing-guard refusal surfaced only
 * as a caller-side error (or, for the legs that swallow failures, as silence).
 * This log is the trace: every attempt leaves one row, so "did we actually
 * email them?" is a query, not an investigation. It is the email counterpart
 * of lib/webhook-log.ts, which does the same for Stripe webhook receipts.
 *
 * THE CONTRACT. Best effort, always. logEmailSend swallows every failure of
 * its own (the notification_log table not existing yet because the companion
 * migration has not landed, an unconfigured Supabase client, a network error)
 * and at most console.errors it. It can never change whether an email sends,
 * and it never throws into the send helpers. Callers await it so the row is
 * written before the serverless function freezes — a fire-and-forget insert
 * can be lost once the response returns.
 *
 * The client is the site's existing service-role client
 * (lib/supabase-admin.ts) — the same one lib/webhook-log.ts uses, pointed at
 * the tassy-ops database that owns notification_log. No new dependency, no
 * new env var.
 *
 * WHAT A ROW CARRIES. channel is always 'email'. kind is the send's
 * EmailKind when the caller set one ('transactional' | 'marketing' — see
 * lib/marketing-guard.ts), 'marketing' for sendMarketingEmail (its guard
 * kind is hard-coded), and 'website_email' when no kind was set.
 * metadata carries ONLY { to, subject } — never the body, never a secret.
 *
 * trip_id is deliberately NOT set: notification_log.trip_id is the TassyOps
 * trips bigint id, while a website send's trip reference (when it has one)
 * is the website's trip_requests uuid, which cannot fit a bigint column.
 * Same convention as lib/webhook-log.ts.
 */

export type EmailSendEntry = {
  /** The send's EmailKind when one was set, 'marketing' for sendMarketingEmail, else 'website_email'. */
  kind: string;
  /** 'sent' = the send helper returned (Resend accepted the message). 'failed' = it threw. */
  status: 'sent' | 'failed';
  /** The thrown error's message on failure; null on success. */
  errorMessage?: string | null;
  to: string;
  subject: string;
};

/** Insert one send-attempt row into public.notification_log. Never throws. */
export async function logEmailSend(entry: EmailSendEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from('notification_log')
      .insert({
        channel: 'email',
        kind: entry.kind,
        status: entry.status,
        error_message: entry.errorMessage ?? null,
        metadata: { to: entry.to, subject: entry.subject },
      });
    if (error) console.error('[email] send log failed:', error.message);
  } catch (e) {
    console.error('[email] send log failed:', e instanceof Error ? e.message : e);
  }
}
