import { handleInbound } from '@/lib/text-to-book';
import { defaultInboundDeps, signedUrlFor } from '@/lib/text-to-book-db.server';

/**
 * POST /api/sms/inbound — Twilio's "A message comes in" webhook for text-to-book.
 *
 * Every request must carry a valid X-Twilio-Signature (403 otherwise, and 403 for everything while
 * TWILIO_AUTH_TOKEN is unset). TEXT_TO_BOOK_MODE decides what happens next (lib/text-to-book.ts);
 * it is off unless Phil sets it. A reply is only ever the TwiML in this response: nothing here
 * calls Twilio.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await handleInbound(
    { url: signedUrlFor(request), signature: request.headers.get('x-twilio-signature'), rawBody },
    defaultInboundDeps(),
  );
  return new Response(result.body, {
    status: result.status,
    headers: { 'Content-Type': result.contentType, 'Cache-Control': 'no-store' },
  });
}
