import type { Metadata } from 'next';

// Weather condition to emoji and description mapping
export const weatherInfo: Record<number, { emoji: string; description: string }> = {
  0: { emoji: '☀️', description: 'sunny' },
  1: { emoji: '🌤️', description: 'mostly sunny' },
  2: { emoji: '⛅', description: 'partly cloudy' },
  3: { emoji: '☁️', description: 'cloudy' },
  45: { emoji: '🌫️', description: 'foggy' },
  48: { emoji: '🌫️', description: 'misty' },
  51: { emoji: '🌧️', description: 'drizzly' },
  53: { emoji: '🌧️', description: 'drizzly' },
  55: { emoji: '🌧️', description: 'drizzly' },
  61: { emoji: '🌧️', description: 'rainy' },
  63: { emoji: '🌧️', description: 'rainy' },
  65: { emoji: '🌧️', description: 'rainy' },
  71: { emoji: '🌨️', description: 'snowy' },
  73: { emoji: '🌨️', description: 'snowy' },
  75: { emoji: '🌨️', description: 'snowy' },
  77: { emoji: '🌨️', description: 'snowy' },
  80: { emoji: '🌦️', description: 'showery' },
  81: { emoji: '🌦️', description: 'showery' },
  82: { emoji: '🌦️', description: 'showery' },
  85: { emoji: '🌨️', description: 'snowy' },
  86: { emoji: '🌨️', description: 'snowy' },
  95: { emoji: '⛈️', description: 'stormy' },
  96: { emoji: '⛈️', description: 'stormy' },
  99: { emoji: '⛈️', description: 'stormy' },
};

// Country code mapping for common timezones
export const timezoneToCountry: Record<string, string> = {
  'Asia/Kolkata': 'IN',
  'Asia/Mumbai': 'IN',
  'Asia/Delhi': 'IN',
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'America/Chicago': 'US',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Asia/Tokyo': 'JP',
  'Asia/Singapore': 'SG',
  'Australia/Sydney': 'AU',
  'Asia/Dubai': 'AE',
};

// OG Image URL
export const ogImage = 'https://cdn.jsdelivr.net/gh/dishant0406/images-repo@master/dishantsharma.webp';

// Default metadata
export const defaultMetadata: Metadata = {
  title: 'Dishant Sharma | Full Stack Developer',
  description: "Interactive portfolio of Dishant Sharma - Full Stack Developer. Chat with me to learn about my projects, skills, and experience.",
  keywords: ['Dishant Sharma', 'Portfolio', 'Full Stack Developer', 'React', 'Next.js', 'TypeScript'],
  openGraph: {
    title: 'Dishant Sharma | Full Stack Developer',
    description: 'Interactive portfolio - Chat with me to learn about my projects, skills, and experience.',
    type: 'website',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Dishant Sharma - Full Stack Developer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dishant Sharma | Full Stack Developer',
    description: 'Interactive portfolio - Chat with me to learn about my projects, skills, and experience.',
    images: [ogImage],
  },
};

// Holiday emoji mapping
export const holidayEmojiMapping: Record<string, string> = {
  christmas: '🎄',
  'new year': '🎆',
  independence: '🇮🇳',
  republic: '🇮🇳',
  diwali: '🪔',
  holi: '🎨',
  easter: '🐰',
  gandhi: '🕊️',
  labour: '👷',
  labor: '👷',
};

export const DEFAULT_HOLIDAY_EMOJI = '🎉';
