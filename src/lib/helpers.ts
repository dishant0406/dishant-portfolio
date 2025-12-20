import { headers } from 'next/headers';
import { DEFAULT_HOLIDAY_EMOJI, holidayEmojiMapping, timezoneToCountry, weatherInfo } from './constants';

// Holiday interface
export interface Holiday {
  name: string;
  date: string;
  emoji: string;
}

// Greeting data interface
export interface GreetingData {
  greeting: string;
  city?: string;
  weather?: { temp: number; emoji: string; description: string };
  holiday?: Holiday;
}

/**
 * Get weather info using Open-Meteo free API
 */
export async function getWeather(
  lat: string,
  lon: string
): Promise<{ temp: number; emoji: string; description: string } | null> {
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
      description: info.description,
    };
  } catch {
    return null;
  }
}

/**
 * Get upcoming holidays using Nager.Date API (free, no API key needed)
 */
export async function getUpcomingHoliday(countryCode: string): Promise<Holiday | null> {
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
        let emoji = DEFAULT_HOLIDAY_EMOJI;
        const nameLower = holiday.name.toLowerCase();

        // Find matching emoji from mapping
        for (const [key, value] of Object.entries(holidayEmojiMapping)) {
          if (nameLower.includes(key)) {
            emoji = value;
            break;
          }
        }

        return {
          name: holiday.localName || holiday.name,
          date: holiday.date,
          emoji,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get country code from timezone
 */
export function getCountryCode(timezone: string): string {
  return timezoneToCountry[timezone] || 'US'; // Default to US
}

/**
 * Get time-based greeting based on hour
 */
export function getTimeBasedGreeting(hour: number): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Get hour from timezone
 */
export function getHourFromTimezone(timezone: string): number {
  try {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return userTime.getHours();
  } catch {
    return new Date().getUTCHours();
  }
}

/**
 * Get personalized greeting data from headers (populated by middleware)
 */
export async function getPersonalizedGreeting(): Promise<GreetingData> {
  const headersList = await headers();

  // Get location data from custom middleware headers (replacing Vercel headers)
  const timezone = headersList.get('x-geo-timezone');
  const city = headersList.get('x-geo-city');
  const latitude = headersList.get('x-geo-latitude');
  const longitude = headersList.get('x-geo-longitude');

  // Calculate time-based greeting
  const hour = timezone ? getHourFromTimezone(timezone) : new Date().getUTCHours();
  const greeting = getTimeBasedGreeting(hour);

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
    holiday: holiday || undefined,
  };
}
