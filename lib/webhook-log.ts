import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Stripe webhook receipt log — one row in public.notification_log per event received.
 *
 * WHY. On Nov 15 the Stripe dashboard showed two stale webhook endpoints erroring at
 * 100%, and nobody knew until a human went looking; the same week, assignment emails
 * were silently skipped by a missing flag. The pattern is failures that leave no
 * trace in our own systems. This log is the trace for the webhook: every event Stripe
 * delivers — handled, deliberately ignored, refused, or failed — leaves one row, so
 * "did Stripe tell us, and what did we do with it?" is a query, not an investigation.
 *
 * THE CONTRACT. Best effort, always. Logging must never change what the webhook
 * answers Stripe: both functions below swallow every failure of their own (the
 * notification_log table not existing yet because the companion migration has not
 * landed, an unconfigured Supabase client, a network error) and at most console.error
 * it. Callers await the log so the row is written before the serverless function
 * freezes — a fire-and-forget insert can be lost once the response returns.
 *
 * The client is the site's existing service-role client (lib/supabase-admin.ts) —
 * the same one the webhook already writes trip_requests through, in the same
 * tassy-ops database that owns notification_log. No new dependency, no new env var.
 *
 * trip_id is deliberately NOT set: notification_log.trip_id is the TassyOps trips
 * bigint id, while this webhook's trip reference is the website's trip_requests
 * uuid, which cannot fit a bigint column. The uuid travels in
 * metadata.trip_request_id instead of being forced somewhere it does not belong.
 */

/** The slice of a Stripe event the log needs. Structural, so the route's own event type fits. */
type WebhookEventShape = {
  id?: string;
  type?: string;
  livemode?: boolean;
  data?: {
    object?: {
      id?: string;
      metadata?: Record<string, string> | null;
    };
  };
};

export type WebhookReceipt = {
  /** Stripe event type, or 'unknown' when the body could not be trusted or parsed. */
  kind: string;
  /** 'received' = the handler answered 2xx (handled, or deliberately ignored). 'failed' = an error response or a throw. */
  status: 'received' | 'failed';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

/** Insert one receipt row into public.notification_log. Never throws. */
export async function logWebhookReceipt(receipt: WebhookReceipt): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from('notification_log')
      .insert({
        channel: 'webhook',
        kind: receipt.kind,
        status: receipt.status,
        error_message: receipt.errorMessage ?? null,
        metadata: receipt.metadata ?? {},
      });
    if (error) console.error('[stripe] webhook receipt log failed:', error.message);
  } catch (e) {
    console.error('[stripe] webhook receipt log failed:', e instanceof Error ? e.message : e);
  }
}

/**
 * Log the receipt for a response the handler has produced but not yet returned.
 * The outcome detail (the ignored reason, the Scholar result, the card outcome,
 * the error text) is read from a CLONE of the response body, so the response
 * Stripe receives is untouched, byte for byte.
 */
export async function logWebhookReceiptForResponse(args: {
  event: WebhookEventShape;
  mode: 'live' | 'test';
  response: Response;
}): Promise<void> {
  const { event, mode, response } = args;
  let errorMessage: string | null = null;
  let outcome: string | null = null;
  try {
    const body = (await response.clone().json()) as {
      error?: unknown;
      ignored?: unknown;
      scholar?: unknown;
      card?: unknown;
    } | null;
    if (body) {
      if (typeof body.error === 'string') errorMessage = body.error;
      if (typeof body.ignored === 'string') outcome = body.ignored;
      else if (typeof body.scholar === 'string') outcome = `scholar: ${body.scholar}`;
      else if (typeof body.card === 'string') outcome = `card: ${body.card}`;
    }
  } catch {
    // An unreadable body changes nothing: the status code still says how it ended.
  }
  const failed = response.status < 200 || response.status >= 300;
  await logWebhookReceipt({
    kind: event.type ?? 'unknown',
    status: failed ? 'failed' : 'received',
    errorMessage: failed ? (errorMessage ?? `Handler returned ${response.status}`) : null,
    metadata: {
      mode,
      event_id: event.id ?? null,
      livemode: event.livemode ?? null,
      session_id: event.data?.object?.id ?? null,
      trip_request_id: event.data?.object?.metadata?.trip_request_id ?? null,
      http_status: response.status,
      ...(outcome ? { outcome } : {}),
    },
  });
}
