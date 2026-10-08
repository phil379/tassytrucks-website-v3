import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * /rate?t=<trip id>&s=bad|ok|great
 *
 * The landing for the one-tap smiley in the post-ride email. The tap IS the
 * vote: this records it to tassy_archive.trip_ratings (service role, so it works
 * even though the browser roles cannot touch that schema) and shows a thank-you
 * with the option to change the answer. Idempotent — one customer rating per
 * trip; a re-tap updates it, so an email prefetch and a real tap settle to the
 * same value.
 */

export const dynamic = 'force-dynamic';

const BRAND = {
  gold: '#C8A253',
  ink: '#1B1A17',
  paper: '#FBF8F1',
  line: '#E3DCCB',
  mute: '#6B6455',
  green: '#2E7D32',
  red: '#B3492F',
};

const SCORE: Record<string, number> = { bad: 1, ok: 3, great: 5 };
const FACES: Array<{ key: 'bad' | 'ok' | 'great'; emoji: string; label: string; color: string; bg: string }> = [
  { key: 'bad', emoji: '😞', label: 'Not great', color: BRAND.red, bg: 'rgba(179,73,47,0.08)' },
  { key: 'ok', emoji: '😐', label: 'Okay', color: '#7A5F1E', bg: 'rgba(200,162,83,0.10)' },
  { key: 'great', emoji: '😀', label: 'Awesome', color: BRAND.green, bg: 'rgba(46,125,50,0.10)' },
];

async function record(tripId: string, rating: number): Promise<boolean> {
  try {
    const db = supabaseAdmin().schema('tassy_archive');
    const { data: existing } = await db
      .from('trip_ratings')
      .select('id')
      .eq('trip_id', tripId)
      .eq('rater_type', 'customer')
      .limit(1);
    const now = new Date().toISOString();
    if (existing && existing.length > 0) {
      await db
        .from('trip_ratings')
        .update({ rating, submitted_at: now })
        .eq('id', (existing[0] as { id: number }).id);
    } else {
      await db
        .from('trip_ratings')
        .insert({ trip_id: tripId, rater_type: 'customer', rating, submitted_at: now });
    }
    return true;
  } catch {
    return false;
  }
}

export default async function RatePage({
  searchParams,
}: {
  searchParams: { t?: string; s?: string };
}) {
  const tripId = typeof searchParams.t === 'string' ? searchParams.t : undefined;
  const scoreKey = typeof searchParams.s === 'string' ? searchParams.s : undefined;
  const rating = scoreKey ? SCORE[scoreKey] : undefined;

  const saved = tripId && rating ? await record(tripId, rating) : false;
  const chosen = FACES.find((f) => f.key === scoreKey);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: BRAND.paper,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          border: `1px solid ${BRAND.line}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ background: BRAND.ink, padding: '22px 28px', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-master.png" width={130} alt="Tassy Transportation" style={{ width: 130, height: 'auto' }} />
          <div style={{ color: BRAND.gold, fontSize: 12, fontStyle: 'italic', marginTop: 6 }}>
            We Transport With Care.
          </div>
        </div>

        <div style={{ padding: '32px 28px', textAlign: 'center' }}>
          {saved && chosen ? (
            <>
              <div style={{ fontSize: 56, lineHeight: 1 }}>{chosen.emoji}</div>
              <h1 style={{ margin: '16px 0 6px', fontSize: 24, color: BRAND.ink, fontWeight: 600 }}>
                Thank you — got it.
              </h1>
              <p style={{ margin: 0, color: BRAND.mute, fontSize: 15, lineHeight: 1.55 }}>
                You rated this trip <b style={{ color: chosen.color }}>{chosen.label}</b>. Your
                feedback goes straight to how we coach and reward our drivers.
              </p>
              <p style={{ margin: '22px 0 10px', color: BRAND.mute, fontSize: 13 }}>
                Changed your mind? Tap a different face:
              </p>
            </>
          ) : (
            <>
              <h1 style={{ margin: '0 0 6px', fontSize: 24, color: BRAND.ink, fontWeight: 600 }}>
                How was your trip?
              </h1>
              <p style={{ margin: '0 0 18px', color: BRAND.mute, fontSize: 15, lineHeight: 1.55 }}>
                {tripId
                  ? 'Tap the face that matches your ride.'
                  : 'This link is missing its trip. If you have a rating email, tap one of the faces there.'}
              </p>
            </>
          )}

          {tripId ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              {FACES.map((f) => (
                <a
                  key={f.key}
                  href={`/rate?t=${encodeURIComponent(tripId)}&s=${f.key}`}
                  style={{
                    flex: 1,
                    maxWidth: 130,
                    textDecoration: 'none',
                    background: f.bg,
                    border: `1.5px solid ${f.color}`,
                    borderRadius: 14,
                    padding: '16px 6px',
                    opacity: chosen && chosen.key !== f.key ? 0.55 : 1,
                  }}
                >
                  <div style={{ fontSize: 34, lineHeight: 1 }}>{f.emoji}</div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: f.color }}>
                    {f.label}
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ background: BRAND.ink, padding: '18px 28px', textAlign: 'center' }}>
          <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>Tassy Transportation</div>
          <div style={{ color: BRAND.mute, fontSize: 12, marginTop: 4 }}>
            Charlotte, NC · (704) 941-8508
          </div>
        </div>
      </div>
    </main>
  );
}
