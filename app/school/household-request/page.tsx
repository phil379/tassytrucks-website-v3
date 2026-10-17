import type { Metadata } from 'next';
import HouseholdRequestForm from '@/components/school/HouseholdRequestForm';
import {
  HOUSEHOLD_PROMPT_BODY,
  HOUSEHOLD_PROMPT_TITLE,
  reasonsFromQuery,
} from '@/lib/school-household';
import { planBySlug } from '@/lib/school-plans';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Custom transportation request · Tassy Scholar',
  description: 'Tell us about your family’s school schedule and we’ll prepare a personalized transportation plan.',
  // A family mid-request. Nothing here belongs in an index.
  robots: { index: false, follow: false },
};

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
        Tassy Scholar
      </p>
      <h1 className="serif mt-3 text-center text-3xl font-semibold sm:text-4xl">
        Custom transportation request
      </h1>
      <p className="mt-3 text-center text-sm text-[color:var(--ink-soft)]">
        {HOUSEHOLD_PROMPT_TITLE} {HOUSEHOLD_PROMPT_BODY}
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
