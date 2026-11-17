import { redirect } from 'next/navigation';

/**
 * Tassy Scholar enrollment is CLOSED while the service is prepared for its
 * later launch (Phil, 2026-11-17). The plan cards that lived here — and the
 * setup wizard behind them — are parked, not deleted: the pages, the wizard
 * and lib/school-plans.ts return with the launch. Until then every Scholar
 * visitor lands on the Coming Soon page and its join list.
 */
export default function SchoolBookPage() {
  redirect('/school');
}
