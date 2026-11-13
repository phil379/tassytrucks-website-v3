/**
 * Careers switch. Phil, 2026-11-13: hide Careers until the commercial-insurance
 * and counsel gates clear. Taking applications now promises hiring the business
 * is not cleared to do.
 *
 * OFF (default): /careers answers 404, the footer has no Careers column, and
 * /careers is not in the sitemap. Nothing is deleted -- the page, the four role
 * links in lib/saas-links.ts and the applicant system all stay as they are.
 *
 * TO REOPEN: set CAREERS_OPEN=true on the Vercel project and redeploy. Before
 * doing that, publish a pay range for each role on /careers or delete the line
 * "We say the pay out loud before you apply" (Muse finding F14).
 */
export const CAREERS_OPEN = process.env.CAREERS_OPEN === 'true';
