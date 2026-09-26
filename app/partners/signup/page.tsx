import type { Metadata } from 'next';
import FacilitySignupForm from '@/components/partners/FacilitySignupForm';

export const metadata: Metadata = {
  title: 'Partner with Tassy Transportation — Facility Accounts',
  description:
    'Set up a facility account for patient and pet transport across Charlotte. Weekly invoicing or the passenger pays. Get started in 60 seconds — (704) 941-8508.',
  alternates: { canonical: '/partners/signup' },
  openGraph: { url: '/partners/signup' },
  robots: { index: false, follow: true },
};

export default function FacilitySignupPage({
  searchParams,
}: {
  searchParams?: { source?: string; type?: string };
}) {
  const source = searchParams?.source ?? 'partners-signup';

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
        Tassy Transportation
      </p>
      <h1 className="serif mt-3 text-center text-4xl font-semibold sm:text-5xl">
        Bring Tassy Transportation to your facility
      </h1>
      <p className="mt-4 text-center text-base text-[color:var(--muted)]">
        We Transport With Care. Get started in 60 seconds — no credit card.
      </p>

      <div className="mt-10">
        <FacilitySignupForm source={source} />
      </div>

      <ul className="mx-auto mt-10 grid max-w-lg gap-3 text-sm text-[color:var(--muted)]">
        <li>· Book rides for your patients, residents or pets in under a minute.</li>
        <li>· Choose weekly invoicing, or have the passenger pay by secure link.</li>
        <li>· Standing orders for recurring treatment — set it once.</li>
        <li>· One named account manager. One phone number that answers.</li>
      </ul>

      <p className="mt-10 text-center text-sm text-[color:var(--muted)]">
        We Transport With Care ·{' '}
        <a className="underline" href="tel:+17049418508">(704) 941-8508</a>
      </p>
    </main>
  );
}
