import type { Metadata } from 'next';
import HouseholdRequestForm from '@/components/school/HouseholdRequestForm';
import { reasonsFromQuery } from '@/lib/school-household';
import { planBySlug } from '@/lib/school-plans';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Join the Scholar list · Tassy Scholar' },
  description:
    'Tassy Scholar is coming soon. Join the list — tell us about your family and the plan you are interested in, and we will contact you when it opens.',
  // A family mid-request. Nothing here belongs in an index.
  robots: { index: false, follow: false },
};

/**
 * The Scholar JOIN LIST (Phil, 2026-11-17).
 *
 * This page was the Custom Household Request. While Scholar is parked ahead
 * of its later launch, the same form and the same plumbing
 * (scholar_household_requests, pending_review) serve as the join list: the
 * demand gauge for the launch. The framing changed; the submission did not —
 * the payload, the schema and the stored row are exactly what they were.
 */
export default function HouseholdRequestPage({
  searchParams,
}: {
  searchParams: { reasons?: string | string[]; plan?: string | string[] };
}) {
  const reasons = reasonsFromQuery(searchParams.reasons);
  const planParam = Array.isArray(searchParams.plan) ? searchParams.plan[0] : searchParams.plan;
  const plan = planParam ? planBySlug(planParam) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">
        Tassy Scholar · Coming soon
      </p>
      <h1 className="serif mt-3 text-center text-3xl font-semibold sm:text-4xl">
        Join the Scholar list
      </h1>
      <p className="mt-3 text-center text-sm text-[color:var(--ink-soft)]">
        Tassy Scholar is not enrolling yet. This list is how parents register their interest:
        tell us about your family and the plan you have in mind, and we will contact you when
        Scholar opens. Joining the list is not a booking — it does not charge you, reserve a
        seat, or promise a start date.
      </p>

      <div className="mt-10">
        <HouseholdRequestForm
          initialReasons={reasons}
          planSlug={(plan?.slug as 'full-year' | 'weekly' | 'after-school' | undefined) ?? null}
        />
      </div>
    </div>
  );
}
