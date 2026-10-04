import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["@mastra/*"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media2.dev.to',
      },
      {
        protocol: 'https',
        hostname: 'cloudmate-test.s3.us-east-1.amazonaws.com',
      }
    ],
  },
};

export default nextConfig;
