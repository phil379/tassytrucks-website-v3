import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SchoolSetupWizard from '@/components/school/SchoolSetupWizard';
import { SCHOOL_PLANS, planBySlug } from '@/lib/school-plans';

export const dynamic = 'force-dynamic';

/** Pre-renders the three real slugs; anything else redirects in the page. */
export function generateStaticParams() {
  return SCHOOL_PLANS.map((p) => ({ plan: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { plan: string };
}): Promise<Metadata> {
  const plan = planBySlug(params.plan);
  return {
    title: plan ? `${plan.planLabel} · Tassy Scholar` : 'Tassy Scholar',
    description: plan?.commitment,
    // One child, one family, mid-signup. Nothing here belongs in an index.
    robots: { index: false, follow: false },
  };
}

export default function SchoolPlanSetupPage({ params }: { params: { plan: string } }) {
  const plan = planBySlug(params.plan);

  /**
   * An unknown slug goes back to the plans rather than 404ing.
   *
   * `?plan=` values are already in the wild on the marketing site, and a parent
   * who follows a stale or mistyped one should land somewhere they can choose,
   * not on an error page.
   */
  if (!plan) redirect('/school/book');

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">
        Tassy Scholar
      </p>
      <h1 className="serif mt-3 text-center text-3xl font-semibold sm:text-4xl">
        {plan.planLabel}
      </h1>
      <p className="mt-3 text-center text-sm text-[color:var(--ink-soft)]">{plan.commitment}</p>

      <div className="mt-10">
        <SchoolSetupWizard plan={plan} googleMapsApiKey={googleMapsApiKey} />
      </div>
    </div>
  );
}
