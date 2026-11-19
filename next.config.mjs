/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN — dropped the images.unsplash.com host:
    // the hero no longer hotlinks Unsplash (now an on-brand CSS gradient) and no
    // other asset references it, so the allowance was dead.
    remotePatterns: [
      { protocol: 'https', hostname: 'tassytrucksops.vercel.app' },
    ],
  },
  /**
   * Keep every *.vercel.app copy of the site out of search results. The real site lives at
   * www.tassytrucks.com; an indexed sandbox copy would compete with it for the same pages.
   * Host-scoped, so it switches itself off for www.tassytrucks.com at the domain cutover.
   * (Noindex does not stop anyone from visiting the sandbox.)
   */
  async headers() {
    return [
      /**
       * Baseline security headers on every response (added 2026-11-18, Phil's
       * hardening pass). Deliberately the non-breaking set: no Content-Security-
       * Policy (the site loads Stripe and map assets a strict CSP would need
       * careful allow-listing for — that is a separate, tested change), and
       * HSTS is already sent by Vercel's edge. X-Frame-Options is SAMEORIGIN,
       * not DENY, so the site can still frame its own pages if it ever needs to.
       */
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(.*)\\.vercel\\.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      /**
       * The private "where is my ride" page (/ride/<token>): the token must never leak to another
       * site through the Referer header, and the page must never be indexed or cached.
       */
      {
        source: '/ride/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      /**
       * Self-hosted fonts (app/fonts.css). File names are content hashes, so they never change in
       * place and can be cached for a year, as next/font's own /_next/static/media files were.
       */
      {
        source: '/fonts/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  // Permanent redirects so old URLs keep working after we cut over from v2 landing
  async redirects() {
    return [
      { source: '/book', destination: '/#book', permanent: true },
      // FIX_PROD_026 — new brand display names discoverable as URLs; old slugs stay canonical for SEO
      { source: '/care', destination: '/nemt', permanent: true },
      { source: '/wellness', destination: '/renew', permanent: true },
      { source: '/guardian', destination: '/recover', permanent: true },
      { source: '/scholar', destination: '/school', permanent: true },
      /**
       * Tassy Scholar moved onto the site 2026-09-29. The marketing pages have
       * been linking out with ?plan=full-year for a while, and `full-year` is a
       * real slug, so those links must keep resolving.
       *
       * They used to land on the per-plan setup wizard. Scholar enrollment is
       * closed while the service is prepared for its later launch (Phil,
       * 2026-11-17), so plan links now land on the Coming Soon page and its
       * join list, where the form's own plan-interest question captures which
       * plan the parent had in mind. A bare /request?service=scholar is
       * redirected by the request page itself.
       */
      {
        source: '/request',
        has: [
          { type: 'query', key: 'service', value: 'scholar' },
          { type: 'query', key: 'plan', value: '(?<planSlug>[a-z-]+)' },
        ],
        destination: '/school',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
