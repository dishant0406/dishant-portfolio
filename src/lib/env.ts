import 'server-only';

export const env = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://dishantsharma.dev',
  DEVTO_USERNAME: process.env.DEVTO_USERNAME || 'dishant0406',
  DEVTO_API_KEY: process.env.DEVTO_API_KEY || '',
};
