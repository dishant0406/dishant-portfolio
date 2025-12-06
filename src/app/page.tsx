import { HomePage } from '@/components';
import { getThreadById } from '@/lib/get-thread';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';

// Weather condition to emoji and description mapping
const weatherInfo: Record<number, { emoji: string; description: string }> = {
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

// Get weather info using Open-Meteo free API
async function getWeather(lat: string, lon: string): Promise<{ temp: number; emoji: string; description: string } | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { next: { revalidate: 900 } } // Cache for 15 minutes
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const weatherCode = data.current_weather?.weathercode || 0;
    const temp = Math.round(data.current_weather?.temperature || 0);
    const info = weatherInfo[weatherCode] || { emoji: '🌡️', description: 'pleasant' };
    
    return {
      temp,
      emoji: info.emoji,
      description: info.description
    };
  } catch {
    return null;
  }
}

// Get upcoming holidays using Nager.Date API (free, no API key needed)
interface Holiday {
  name: string;
  date: string;
  emoji: string;
}

async function getUpcomingHoliday(countryCode: string): Promise<Holiday | null> {
  try {
    const year = new Date().getFullYear();
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );
    
    if (!response.ok) return null;
    
    const holidays = await response.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find next upcoming holiday within 7 days
    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      const diffDays = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 7) {
        // Holiday emoji mapping based on common holiday types
        let emoji = '🎉';
        const nameLower = holiday.name.toLowerCase();
        if (nameLower.includes('christmas')) emoji = '🎄';
        else if (nameLower.includes('new year')) emoji = '🎆';
        else if (nameLower.includes('independence') || nameLower.includes('republic')) emoji = '🇮🇳';
        else if (nameLower.includes('diwali')) emoji = '🪔';
        else if (nameLower.includes('holi')) emoji = '🎨';
        else if (nameLower.includes('easter')) emoji = '🐰';
        else if (nameLower.includes('gandhi')) emoji = '🕊️';
        else if (nameLower.includes('labour') || nameLower.includes('labor')) emoji = '👷';
        
        return {
          name: holiday.localName || holiday.name,
          date: holiday.date,
          emoji
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Country code mapping for common timezones
function getCountryCode(timezone: string): string {
  const tzToCountry: Record<string, string> = {
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
  
  return tzToCountry[timezone] || 'US'; // Default to US
}

// Get personalized greeting data from Vercel headers
interface GreetingData {
  greeting: string;
  city?: string;
  weather?: { temp: number; emoji: string; description: string };
  holiday?: Holiday;
}

async function getPersonalizedGreeting(): Promise<GreetingData> {
  const headersList = await headers();
  
  // Get location data from Vercel headers
  const timezone = headersList.get('x-vercel-ip-timezone');
  const city = headersList.get('x-vercel-ip-city');
  const latitude = headersList.get('x-vercel-ip-latitude');
  const longitude = headersList.get('x-vercel-ip-longitude');
  
  // Calculate time-based greeting
  let hour: number;
  
  if (timezone) {
    try {
      const now = new Date();
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      hour = userTime.getHours();
    } catch {
      hour = new Date().getUTCHours();
    }
  } else {
    hour = new Date().getUTCHours();
  }
  
  let greeting: string;
  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 17) greeting = 'Good Afternoon';
  else greeting = 'Good Evening';
  
  // Get weather if we have coordinates
  let weather: { temp: number; emoji: string; description: string } | null = null;
  if (latitude && longitude) {
    weather = await getWeather(latitude, longitude);
  }
  
  // Get upcoming holiday based on timezone
  let holiday: Holiday | null = null;
  if (timezone) {
    const countryCode = getCountryCode(timezone);
    holiday = await getUpcomingHoliday(countryCode);
  }
  
  // Decode city name (it's RFC3986 encoded)
  const decodedCity = city ? decodeURIComponent(city) : undefined;
  
  return {
    greeting,
    city: decodedCity,
    weather: weather || undefined,
    holiday: holiday || undefined
  };
}

// OG Image URL
const ogImage = 'https://cdn.jsdelivr.net/gh/dishant0406/images-repo@master/dishantsharma.webp';

// Default metadata
const defaultMetadata: Metadata = {
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

// Generate metadata based on chat ID in URL
export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: Promise<{ chat?: string }> 
}): Promise<Metadata> {
  const params = await searchParams;
  const chatId = params?.chat;

  // If no chat ID, return default metadata
  if (!chatId) {
    return defaultMetadata;
  }

  try {
    // Fetch thread data from Mastra memory
    const thread = await getThreadById(chatId);

    if (!thread) {
      return defaultMetadata;
    }

    const title = thread.title 
      ? `${thread.title} | Dishant Sharma` 
      : 'Chat with Dishant Sharma';
    
    const description = thread.description || 
      'A conversation about my projects, skills, and experience.';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return defaultMetadata;
  }
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
    </div>
  );
}

// Server Component - wraps the client HomePage with Suspense
export default async function Home() {
  const greetingData = await getPersonalizedGreeting();
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePage 
        serverGreeting={greetingData.greeting}
        city={greetingData.city}
        weather={greetingData.weather}
        holiday={greetingData.holiday}
      />
    </Suspense>
  );
}
