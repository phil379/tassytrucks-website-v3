import type { Metadata } from 'next';
import Link from 'next/link';
import PrivacyRequestForm from '@/components/privacy/PrivacyRequestForm';
import { RESPONSE_DAYS } from '@/lib/privacy-requests';
import { BUSINESS } from '@/lib/business';

export const metadata: Metadata = {
  title: 'Your privacy choices & data requests',
  description:
    'Ask Tassy Transportation to show, correct or delete your information, or to stop texts and emails.',
  alternates: { canonical: '/privacy/request' },
  robots: { index: true, follow: true },
};

export default function PrivacyRequestPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Legal</div>
        <h1 className="h-section mt-3">Your privacy choices &amp; data requests</h1>
        <div className="mt-6 ink-soft leading-relaxed space-y-3">
          <p>
            Use this form to ask us to show you the information we hold about you, correct it, delete it, or stop sending you
            texts or non-essential emails. We do not sell your personal information and we do not share it for advertising, so
            there is nothing to opt out of there.
          </p>
          <p>
            We will check that you are the person the information is about before we act, and nothing is deleted automatically. You
            can also email {BUSINESS.bookingEmail} or call {BUSINESS.phoneDisplay}. More in our{' '}
            <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </div>
        <div className="mt-8">
          <PrivacyRequestForm responseDays={RESPONSE_DAYS} />
        </div>
      </div>
    </section>
  );
}
