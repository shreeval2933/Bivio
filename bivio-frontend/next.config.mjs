/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizePackageImports: ['@mui/material', '@mui/icons-material', '@mui/x-data-grid'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
