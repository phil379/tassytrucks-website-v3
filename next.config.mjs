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
    ];
  },
};

export default nextConfig;
