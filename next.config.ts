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
      {
        protocol: 'https',
        hostname: 'cloudmate-test.s3.us-east-1.amazonaws.com',
      }
    ],
  },
};

export default nextConfig;
