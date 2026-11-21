/**
 * Careers switch. Phil, 2026-11-13: close Careers until the commercial-insurance
 * and counsel gates clear. Taking applications now promises hiring the business
 * is not cleared to do.
 *
 * OFF (default): applications are closed, but /careers is VISIBLE (Phil,
 * 2026-11-21 — it answered 404 before this date). The page renders its
 * interest-list state: the role cards and company intro stay readable, the
 * Apply buttons and every SaaS application link (lib/saas-links.ts apply.*)
 * come off, an honest banner says why applications are closed, and one
 * interest form (lib/careers-interest.ts, POST /api/careers-interest)
 * collects names for the day hiring opens — the operator email is that
 * list's record, there is no table. The footer keeps its Careers column
 * and links it to /careers. The page stays noindex and out of the sitemap
 * until applications actually open: an interest page is for people already
 * looking at us, not a search landing page. Nothing is deleted -- the open
 * page, the four role links in lib/saas-links.ts and the applicant system
 * all stay as they are.
 *
 * TO REOPEN: set CAREERS_OPEN=true on the Vercel project and redeploy. Before
 * doing that, publish a pay range for each role on /careers or delete the line
 * "We say the pay out loud before you apply" (Muse finding F14).
 */
export const CAREERS_OPEN = process.env.CAREERS_OPEN === 'true';
