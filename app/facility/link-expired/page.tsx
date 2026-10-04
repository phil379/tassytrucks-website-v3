import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your setup link has expired — Tassy Transportation',
  robots: { index: false, follow: false },
};

/**
 * Where an expired or already-used setup link lands — and where a deliberate
 * sign-out lands too.
 *
 * Deliberately says nothing about whether the email exists: a page that
 * distinguishes "expired" from "no such account" is an account-enumeration
 * oracle on a public URL.
 *
 * The ?signedout=1 variant exists because landing someone who just pressed
 * "Sign out" on "That link has expired" reads as a fault. Same page, because
 * the session state is identical; different words, because the reason is not.
 */
export default function FacilityLinkExpiredPage({
  searchParams,
}: {
  searchParams?: { signedout?: string };
}) {
  const signedOut = searchParams?.signedout === '1';

  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <h1 className="serif text-3xl font-semibold">
        {signedOut ? 'You are signed out' : 'That link has expired'}
      </h1>

      {signedOut ? (
        <>
          <p className="mt-4 text-[color:var(--ink-soft)]">
            This computer no longer has access to your account. Nothing on it shows your
            passengers or your trips.
          </p>
          <p className="mt-6 text-[color:var(--ink-soft)]">
            To come back in, ask us for a sign-in link on{' '}
            <a className="underline" href="tel:+17049418508">
              (704) 941-8508
            </a>{' '}
            or at{' '}
            <a className="underline" href="mailto:book@tassytrucks.com">
              book@tassytrucks.com
            </a>
            .
          </p>
          <p className="mt-8">
            <a className="btn-primary justify-center" href="/">
              Back to the site
            </a>
          </p>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
