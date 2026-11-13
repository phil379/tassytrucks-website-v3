'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isValidRatingToken, submitRating } from '@/lib/ride-ratings';
import { ratingDeps } from '@/lib/ride-ratings.server';

/**
 * The only place a rating is recorded: a POST from the form on /rating/<token>.
 * Afterwards it redirects back to the page, which reads the stored rating and shows the thank-you.
 */
export async function submitRatingAction(formData: FormData): Promise<void> {
  const token = formData.get('token');
  const back = `/rating/${isValidRatingToken(token) ? token : 'invalid'}`;

  const limit = rateLimit(`ride-rating:${clientIp(headers())}`, 10, 60 * 60 * 1000);
  if (!limit.ok) redirect(`${back}?e=busy`);

  let kind: string;
  try {
    const result = await submitRating(ratingDeps(), {
      token,
      score: formData.get('score'),
      comment: formData.get('comment'),
    });
    kind = result.kind;
  } catch (e) {
    console.error('[ride-ratings] submit failed:', (e as Error).message);
    kind = 'error';
  }

  if (kind === 'bad_input' || kind === 'error') redirect(`${back}?e=${kind}`);
  redirect(back);
}
