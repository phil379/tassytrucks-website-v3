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
       * real slug, so those links must keep resolving — now to the wizard that
       * actually understands the vocabulary.
       *
       * Only when `plan` is present. A bare /request?service=scholar stays on
       * the request form: `scholar` is still a requestable line, which is what
       * audit-saas-links check 5 asserts, and a parent who wants one ride
       * should get the one-ride form.
       */
      {
        source: '/request',
        has: [
          { type: 'query', key: 'service', value: 'scholar' },
          { type: 'query', key: 'plan', value: '(?<planSlug>[a-z-]+)' },
        ],
        destination: '/school/book/:planSlug',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
