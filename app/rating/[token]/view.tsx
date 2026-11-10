import type { ReactNode } from 'react';
import type { PageState } from '@/lib/ride-ratings';

/**
 * Presentational pieces of /rating/<token>. No data access here, so tests can render them.
 * Everything rendered goes through React, which escapes text; nothing uses dangerouslySetInnerHTML.
 */

const GOLD = '#C8A253';
const INK = '#1B1A17';
const PAPER = '#FBF8F1';
const LINE = '#E3DCCB';
const MUTE = '#6B6455';
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';

export const SCORE_LABELS: Record<number, string> = {
  1: 'Very poor',
  2: 'Poor',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
};

export function RatingShell({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: PAPER,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: FONT,
        color: INK,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#FFFFFF',
          border: `1px solid ${LINE}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ background: INK, padding: '20px 24px', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-master.png" width={130} alt="Tassy Transportation" style={{ width: 130, height: 'auto' }} />
          <div style={{ color: GOLD, fontSize: 12, fontStyle: 'italic', marginTop: 6 }}>We Transport With Care.</div>
        </div>
        <div style={{ padding: '28px 22px 30px', textAlign: 'center' }}>{children}</div>
      </div>
    </main>
  );
}

const H1 = { margin: '0 0 8px', fontSize: 24, fontWeight: 600, color: INK } as const;
const P = { margin: 0, color: MUTE, fontSize: 15, lineHeight: 1.55 } as const;

/** Every state except the open form. Neutral wording: never says which trip, never names anyone. */
export function RatingMessage({ state }: { state: Exclude<PageState, { kind: 'open' }> }) {
  if (state.kind === 'thanks') return <RatingThanks score={state.score} googleUrl={state.googleUrl} />;
  const copy: Record<string, { title: string; body: string }> = {
    disabled: { title: 'Thanks for riding with Tassy', body: 'There is nothing to do on this page right now.' },
    invalid: { title: 'This link is not valid', body: 'Please use the most recent link we sent you, or call dispatch on (704) 941-8508.' },
    expired: { title: 'This link has expired', body: 'Rating links stay open for 14 days. Thank you for riding with Tassy.' },
    not_ratable: { title: 'This ride cannot be rated', body: 'Only completed rides can be rated. Thank you for riding with Tassy.' },
    error: { title: 'Something went wrong', body: 'We could not open this page just now. Please try again in a few minutes.' },
  };
  const c = copy[state.kind] ?? copy.error;
  return (
    <>
      <h1 style={H1}>{c.title}</h1>
      <p style={P}>{c.body}</p>
    </>
  );
}

export function RatingThanks({ score, googleUrl }: { score: number; googleUrl: string | null }) {
  const low = score <= 3;
  return (
    <div data-testid="rating-thanks">
      <h1 style={H1}>Thank you</h1>
      <p style={P}>
        {low
          ? 'Thank you for telling us. We are sorry the ride fell short, and your feedback has gone straight to our team.'
          : 'Thank you for your feedback. We are glad the ride went well.'}
      </p>
      {googleUrl && score >= 4 ? (
        <p style={{ ...P, marginTop: 22 }} data-testid="google-review-prompt">
          Would you share this on Google? It helps other families find us.
          <br />
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: 14,
              padding: '12px 20px',
              borderRadius: 10,
              background: INK,
              color: '#FFFFFF',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Leave a Google review
          </a>
        </p>
      ) : null}
    </div>
  );
}

export type FormNotice = 'bad_input' | 'busy' | 'error' | null;

/** Five large tap targets, an optional comment, one submit. Works without JavaScript. */
export function RatingForm({
  token,
  action,
  notice,
}: {
  token: string;
  action: (formData: FormData) => void | Promise<void>;
  notice: FormNotice;
}) {
  const noticeText =
    notice === 'bad_input'
      ? 'Please tap a score from 1 to 5.'
      : notice === 'busy'
        ? 'Too many tries from this device. Please wait a few minutes and try again.'
        : notice === 'error'
          ? 'We could not save that just now. Please try again.'
          : null;
  return (
    <>
      <style>{`
        .rr-scores{display:flex;gap:8px;justify-content:center;margin:18px 0 6px}
        .rr-score{flex:1;max-width:88px}
        .rr-score input{position:absolute;opacity:0;width:1px;height:1px}
        .rr-score span{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:76px;border:2px solid ${LINE};border-radius:14px;cursor:pointer;background:#fff}
        .rr-score b{font-size:28px;line-height:1;color:${INK}}
        .rr-score small{margin-top:6px;font-size:11px;color:${MUTE}}
        .rr-score input:checked + span{border-color:${GOLD};background:rgba(200,162,83,0.14)}
        .rr-score input:focus-visible + span{outline:3px solid ${INK};outline-offset:2px}
      `}</style>
      <h1 style={H1}>How was your ride?</h1>
      <p style={P}>Tap a score from 1 (very poor) to 5 (excellent).</p>
      <form action={action} style={{ marginTop: 6 }}>
        <input type="hidden" name="token" value={token} />
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ position: 'absolute', left: -9999 }}>Your score</legend>
          <div className="rr-scores">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="rr-score">
                <input type="radio" name="score" value={String(n)} required aria-label={`${n} - ${SCORE_LABELS[n]}`} />
                <span>
                  <b>{n}</b>
                  <small>{SCORE_LABELS[n]}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label style={{ display: 'block', textAlign: 'left', marginTop: 18, fontSize: 14, color: INK, fontWeight: 600 }}>
          Anything you want to tell us? <span style={{ color: MUTE, fontWeight: 400 }}>(optional)</span>
          <textarea
            name="comment"
            maxLength={1000}
            rows={4}
            style={{
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              marginTop: 6,
              padding: 10,
              fontSize: 16,
              fontFamily: FONT,
              border: `1px solid ${LINE}`,
              borderRadius: 10,
            }}
          />
        </label>
        {noticeText ? (
          <p role="alert" style={{ ...P, color: '#B3492F', marginTop: 12 }}>
            {noticeText}
          </p>
        ) : null}
        <button
          type="submit"
          style={{
            marginTop: 18,
            width: '100%',
            minHeight: 52,
            border: 0,
            borderRadius: 12,
            background: INK,
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Send my rating
        </button>
      </form>
    </>
  );
}
