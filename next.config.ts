import type { NextConfig } from "next";

/**
 * `www.dishantsharma.dev` resolves and serves 200 without redirecting to the
 * apex, so search engines see two hosts with identical content. The apex is the
 * canonical host, so every request that arrives on `www` is permanently
 * redirected to it.
 *
 * `next.config.ts` is evaluated at build time, so this reads the same default as
 * `src/lib/env.ts` rather than letting the redirect vanish when the variable is
 * not exported into the build.
 */
function wwwRedirect() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dishantsharma.dev';

  let host: string;
  try {
    ({ host } = new URL(siteUrl));
  } catch {
    return [];
  }

  if (host.startsWith('www.')) {
    return [];
  }

  return [
    {
      source: '/:path*',
      has: [{ type: 'host' as const, value: `www.${host}` }],
      destination: `${siteUrl.replace(/\/$/, '')}/:path*`,
      permanent: true,
    },
  ];
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@mastra/*"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  async redirects() {
    return wwwRedirect();
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
