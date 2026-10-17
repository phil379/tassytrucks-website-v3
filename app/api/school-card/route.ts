import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import {
  BILLING_STATUS,
  STANDING_ORDERS_TABLE,
  looksLikeUuid,
  startCardSetup,
} from '@/lib/school-billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Next caches identical GET fetches (Supabase reads, Stripe lookups) even here, so a repeat
// request can see a stale card status. Billing state must always be read live.
export const fetchCache = 'force-no-store';

const PER_IP_PER_HOUR = Number(process.env.SCHOOL_CARD_RATE_LIMIT) || 10;

/**
 * GET /api/school-card?o=<standing order id> — a fresh Stripe card page.
 *
 * Stripe's pages expire, and a parent may close the tab, so this hands out a new one for
 * a booking that already exists. It can only ever SAVE a card against that booking: it
 * creates no charge, no subscription and no booking, so an unguessable order id is enough
 * to hold in a link. A booking that already has a card is not given another page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const order = url.searchParams.get('o');
  const home = () => NextResponse.redirect(new URL('/school', url.origin), 303);
  const cancelled = (problem: string) =>
    NextResponse.redirect(new URL(`/school/book/card-cancelled?o=${order}&e=${problem}`, url.origin), 303);

  if (!looksLikeUuid(order)) return home();

  const limit = rateLimit(`school-card:${clientIp(request.headers)}`, PER_IP_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) return cancelled('unavailable');

  try {
    const db = supabaseAdmin();

    const { data: row } = await db
      .from(STANDING_ORDERS_TABLE)
      .select('id, student_id, service_line, label')
      .eq('id', order)
      .maybeSingle();
    // Only a Full Year Scholar booking has a card step.
    if (!row || row.service_line !== 'scholar' || !String(row.label ?? '').startsWith('Full Year Plan')) {
      return home();
    }

    // Billing columns come from a separate migration; if they are not there yet this read
    // simply returns nothing and the parent is given a page, which is the safe direction.
    const { data: billing } = await db
      .from(STANDING_ORDERS_TABLE)
      .select('billing_status, stripe_customer_id')
      .eq('id', order)
      .maybeSingle();
    if (billing?.billing_status === BILLING_STATUS.cardSaved || billing?.billing_status === BILLING_STATUS.active) {
      return cancelled('have');
    }

    const { data: student } = await db
      .from('students')
      .select('parent_name, parent_email, parent_phone')
      .eq('id', row.student_id)
      .maybeSingle();
    if (!student?.parent_email) return cancelled('unavailable');

    const card = await startCardSetup(db, {
      standingOrderId: row.id as string,
      studentId: row.student_id as string,
      plan: 'full_year',
      parentName: (student.parent_name as string) ?? '',
      parentEmail: student.parent_email as string,
      parentPhone: (student.parent_phone as string) ?? '',
      origin: url.origin,
      existingCustomerId: (billing?.stripe_customer_id as string | null) ?? null,
    });
    if (!card) return cancelled('unavailable');

    return NextResponse.redirect(card.url, 303);
  } catch (e) {
    console.error('[school-card] could not start card setup:', (e as Error).message);
    return cancelled('unavailable');
  }
}
