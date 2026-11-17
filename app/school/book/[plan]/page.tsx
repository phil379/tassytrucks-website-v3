import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Tassy Scholar enrollment is CLOSED while the service is prepared for its
 * later launch (Phil, 2026-11-17). This route was the per-plan setup door
 * (eligibility gate → setup wizard → card on file). It is parked, not
 * deleted, and returns with the launch; until then every plan slug — known
 * or not — lands on the Coming Soon page and its join list, which is also
 * where the old page sent an unknown slug's parent, one hop further on.
 */
export default function SchoolPlanSetupPage() {
  redirect('/school');
}
