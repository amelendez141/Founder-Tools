/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://founder-toolkit-api-production.up.railway.app/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
