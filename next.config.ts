import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["@mastra/*"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.hashnode.com',
      },
      {
        protocol: 'https',
        hostname: 'images.hashnode.dev',
      },
      {
        protocol: 'https',
        hostname: 'cdn.hashnode.dev',
      },
      {
        protocol: 'https',
        hostname: 'hashnode.com',
      },
    ],
  },
};

export default nextConfig;
