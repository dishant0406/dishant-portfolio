import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["@mastra/*"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  }
};

export default nextConfig;
