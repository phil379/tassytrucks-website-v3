import { hotelQuoteServer } from '@/lib/hotel-price.server';
import { rateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { textToBookActive } from '@/lib/text-to-book';
import {
  HOUR_MS,
  INBOUND_PER_HOUR,
  isLinkToken,
  type InboundDeps,
  type MessageRow,
  type TextToBookStore,
} from '@/lib/text-to-book';

/**
 * SERVER ONLY. The production wiring for text-to-book: Supabase tables, the hotel quote that reads
 * the intro state, the in-memory rate limiter, and env. Tables (migration
 * supabase/migrations/20261110T0300_text_to_book.sql, RLS on, no policies):
 *   public.text_to_book_messages  the conversation log
 *   public.text_opt_outs          STOP / START per hashed number
 */

export const MESSAGES_TABLE = 'text_to_book_messages';
export const OPT_OUTS_TABLE = 'text_opt_outs';

function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

export const supabaseTextStore: TextToBookStore = {
  async isOptedOut(phoneHash) {
    const { data, error } = await supabaseAdmin()
      .from(OPT_OUTS_TABLE)
      .select('opted_out_at, opted_in_at')
      .eq('phone_hash', phoneHash)
      .maybeSingle();
    if (error) throw new Error(errText(error));
    if (!data || !data.opted_out_at) return false;
    if (!data.opted_in_at) return true;
    return Date.parse(data.opted_out_at) > Date.parse(data.opted_in_at);
  },
  async setOptOut(phoneHash, at) {
    const { error } = await supabaseAdmin()
      .from(OPT_OUTS_TABLE)
      .upsert({ phone_hash: phoneHash, opted_out_at: at.toISOString() }, { onConflict: 'phone_hash' });
    if (error) throw new Error(errText(error));
  },
  async clearOptOut(phoneHash, at) {
    const { error } = await supabaseAdmin()
      .from(OPT_OUTS_TABLE)
      .upsert({ phone_hash: phoneHash, opted_in_at: at.toISOString() }, { onConflict: 'phone_hash' });
    if (error) throw new Error(errText(error));
  },
  async lastInbound(phoneHash, since) {
    try {
      const { data, error } = await supabaseAdmin()
        .from(MESSAGES_TABLE)
        .select('body, parse_result')
        .eq('phone_hash', phoneHash)
        .eq('direction', 'in')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return null;
      return data[0] as Pick<MessageRow, 'body' | 'parse_result'>;
    } catch {
      return null;
    }
  },
  async logMessages(rows: MessageRow[]) {
    try {
      const { error } = await supabaseAdmin().from(MESSAGES_TABLE).insert(rows);
      if (error) console.warn(`[text-to-book] conversation log not written: ${errText(error)}`);
    } catch (err) {
      console.warn(`[text-to-book] conversation log not written: ${errText(err)}`);
    }
  },
};

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tassytrucks-website-v3.vercel.app').replace(/\/+$/, '');
}

export function defaultInboundDeps(): InboundDeps {
  return {
    env: {
      mode: process.env.TEXT_TO_BOOK_MODE,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      pepper: process.env.TEXT_TO_BOOK_PHONE_PEPPER,
      siteBase: siteBase(),
    },
    store: supabaseTextStore,
    now: () => new Date(),
    quotes: { hotelQuote: hotelQuoteServer },
    rateLimit: (key) => rateLimit(key, INBOUND_PER_HOUR, HOUR_MS),
  };
}

/**
 * The URL Twilio signed. TEXT_TO_BOOK_WEBHOOK_URL wins when set (a proxy or a custom domain can
 * change the host the function sees); otherwise it is rebuilt from the forwarded host and scheme.
 */
export function signedUrlFor(request: Request): string {
  const configured = process.env.TEXT_TO_BOOK_WEBHOOK_URL?.trim();
  if (configured) return configured;
  const u = new URL(request.url);
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || u.host;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || u.protocol.replace(':', '');
  return `${proto}://${host}${u.pathname}${u.search}`;
}

/**
 * Records that a texted booking link was opened (?ttb=<token> on the landing page). Harmless by
 * design: a bad token, a missing table or no database config does nothing and never throws.
 *
 * GATED (Phil, 2026-11-13): with TEXT_TO_BOOK_MODE off or unset it returns BEFORE touching the
 * database, so a `?ttb=` link changes nothing for a visitor. `opts` exist only so tests can pass a
 * mode and a fake client.
 */
export async function markTextLinkOpened(
  token: unknown,
  at: Date = new Date(),
  opts: { mode?: string | null; db?: () => ReturnType<typeof supabaseAdmin> } = {},
): Promise<void> {
  if (!textToBookActive(opts.mode === undefined ? process.env.TEXT_TO_BOOK_MODE : opts.mode)) return;
  if (!isLinkToken(token)) return;
  try {
    const { error } = await (opts.db ?? supabaseAdmin)()
      .from(MESSAGES_TABLE)
      .update({ link_opened_at: at.toISOString() })
      .eq('link_token', token)
      .is('link_opened_at', null);
    if (error) console.warn(`[text-to-book] link open not recorded: ${errText(error)}`);
  } catch (err) {
    console.warn(`[text-to-book] link open not recorded: ${errText(err)}`);
  }
}
