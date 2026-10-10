import 'server-only';

export const env = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://dishantsharma.dev',
  DEVTO_USERNAME: process.env.DEVTO_USERNAME || 'dishant0406',
  DEVTO_API_KEY: process.env.DEVTO_API_KEY || '',
};

/**
 * The one canonical origin, with no trailing slash so paths can be appended.
 * Lives here, the lowest layer, so metadata, the sitemap and structured data all
 * read the same value without importing each other.
 */
export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
