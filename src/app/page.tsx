import { HomePage } from '@/components';
import { getThreadById } from '@/lib/get-thread';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';

// Weather condition to emoji mapping
const weatherEmoji: Record<number, string> = {
  0: '☀️', // Clear sky
  1: '🌤️', 2: '⛅', 3: '☁️', // Mainly clear, partly cloudy, overcast
  45: '🌫️', 48: '🌫️', // Fog
  51: '🌧️', 53: '🌧️', 55: '🌧️', // Drizzle
  61: '🌧️', 63: '🌧️', 65: '🌧️', // Rain
  71: '🌨️', 73: '🌨️', 75: '🌨️', // Snow
  77: '🌨️', // Snow grains
  80: '🌦️', 81: '🌦️', 82: '🌦️', // Rain showers
  85: '🌨️', 86: '🌨️', // Snow showers
  95: '⛈️', // Thunderstorm
  96: '⛈️', 99: '⛈️', // Thunderstorm with hail
};

// Get weather info using Open-Meteo free API
async function getWeather(lat: string, lon: string): Promise<{ temp: number; emoji: string } | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { next: { revalidate: 900 } } // Cache for 15 minutes
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const weatherCode = data.current_weather?.weathercode || 0;
    const temp = Math.round(data.current_weather?.temperature || 0);
    
    return {
      temp,
      emoji: weatherEmoji[weatherCode] || '🌡️'
    };
  } catch {
    return null;
  }
}

// Get personalized greeting data from Vercel headers
interface GreetingData {
  greeting: string;
  city?: string;
  weather?: { temp: number; emoji: string };
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
  let weather: { temp: number; emoji: string } | null = null;
  if (latitude && longitude) {
    weather = await getWeather(latitude, longitude);
  }
  
  // Decode city name (it's RFC3986 encoded)
  const decodedCity = city ? decodeURIComponent(city) : undefined;
  
  return {
    greeting,
    city: decodedCity,
    weather: weather || undefined
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
      />
    </Suspense>
  );
}
