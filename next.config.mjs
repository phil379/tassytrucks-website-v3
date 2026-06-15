/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
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
    ];
  },
};

export default nextConfig;
