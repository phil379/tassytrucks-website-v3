import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your setup link has expired — Tassy Transportation',
  robots: { index: false, follow: false },
};

/**
 * Where an expired or already-used setup link lands.
 *
 * Deliberately says nothing about whether the email exists: a page that
 * distinguishes "expired" from "no such account" is an account-enumeration
 * oracle on a public URL.
 */
export default function FacilityLinkExpiredPage() {
  return (
    <main className="mx-auto max-w-lg px-5 py-24 text-center">
      <h1 className="serif text-3xl font-semibold">That link has expired</h1>
      <p className="mt-4 text-[color:var(--ink-soft)]">
        Setup links work once and then stop, which is what keeps your account safe if the
        email gets forwarded.
      </p>
      <p className="mt-6 text-[color:var(--ink-soft)]">
        Call us on{' '}
        <a className="underline" href="tel:+17049418508">
          (704) 941-8508
        </a>{' '}
        or reply to the email we sent, and we will send a new one straight away.
      </p>
      <p className="mt-8">
        <a className="btn-primary justify-center" href="/partners/signup">
          Start again
        </a>
      </p>
    </main>
  );
}
