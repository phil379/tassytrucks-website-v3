import type { Metadata } from 'next';
import { loadRatingPage, type PageState } from '@/lib/ride-ratings';
import { ratingDeps } from '@/lib/ride-ratings.server';
import { submitRatingAction } from './actions';
import { RatingForm, RatingMessage, RatingShell, type FormNotice } from './view';

/**
 * /rating/<token> — the post-ride rating page (flag RATINGS_ENABLED, off by default).
 *
 * The token is the only key: 43 random characters, stored only as a sha256 hash, bound to one trip,
 * valid 14 days. Loading the page never records anything (email scanners follow links); the rating is
 * recorded only by the form's POST (./actions.ts). Never indexed, never cached, no referrer.
 * Any database failure shows a neutral page.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Rate your ride · Tassy Transportation' },
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

function noticeFrom(e: unknown): FormNotice {
  return e === 'bad_input' || e === 'busy' || e === 'error' ? e : null;
}

export default async function RatingPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { e?: string | string[] };
}) {
  let state: PageState;
  try {
    state = await loadRatingPage(ratingDeps(), params.token);
  } catch {
    state = { kind: 'error' };
  }

  return (
    <RatingShell>
      {state.kind === 'open' ? (
        <RatingForm token={params.token} action={submitRatingAction} notice={noticeFrom(searchParams.e)} />
      ) : (
        <RatingMessage state={state} />
      )}
    </RatingShell>
  );
}
