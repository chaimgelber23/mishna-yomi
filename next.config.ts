import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility
  experimental: {},
  images: {
    unoptimized: true,
  },
  // Required for @cloudflare/next-on-pages
  reactStrictMode: true,
};

export default nextConfig;
