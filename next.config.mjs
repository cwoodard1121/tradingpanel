/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We type-check separately; keep builds resilient for Vercel deploys.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
