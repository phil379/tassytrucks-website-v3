import type { Metadata } from 'next';
import { verifyUnsubscribe } from '@/lib/unsubscribe-token';
import UnsubscribeButton from '@/components/privacy/UnsubscribeButton';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

function mask(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(1, user.length - 1))}@${domain}`;
}

export default function UnsubscribePage({ searchParams }: { searchParams: { t?: string } }) {
  const token = typeof searchParams.t === 'string' ? searchParams.t : '';
  const email = verifyUnsubscribe(token);
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-xl">
        <h1 className="h-section">Unsubscribe</h1>
        {email ? (
          <>
            <p className="mt-4 ink-soft">
              Stop marketing and outreach email to <strong>{mask(email)}</strong>? You will still get messages about a ride you
              booked, such as a confirmation or receipt.
            </p>
            <UnsubscribeButton token={token} />
          </>
        ) : (
          <p className="mt-4 ink-soft">
            This unsubscribe link is not valid. Email book@tassytrucks.com and we will remove you.
          </p>
        )}
      </div>
    </section>
  );
}
