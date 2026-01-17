import { promises as fs } from 'fs';
import path from 'path';
import type { CalendarificHoliday } from './helpers';

interface CachedHolidayData {
  country: string;
  year: number;
  month: number;
  holidays: CalendarificHoliday[];
  cachedAt: string;
}

const CACHE_DIR = path.join(process.cwd(), '.cache', 'holidays');

/**
 * Ensures the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // Directory already exists or cannot be created
  }
}

/**
 * Generate cache file path for a country
 */
function getCacheFilePath(countryCode: string): string {
  return path.join(CACHE_DIR, `${countryCode.toLowerCase()}.json`);
}

/**
 * Check if cache is valid (less than 1 month old for the current month)
 */
function isCacheValid(cachedData: CachedHolidayData): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  // Cache is valid if it's for the current year and month
  return cachedData.year === currentYear && cachedData.month === currentMonth;
}

/**
 * Get cached holiday data for a country
 */
export async function getCachedHolidays(countryCode: string): Promise<CalendarificHoliday[] | null> {
  try {
    const cacheFile = getCacheFilePath(countryCode);
    const data = await fs.readFile(cacheFile, 'utf-8');
    const cachedData: CachedHolidayData = JSON.parse(data);

    if (isCacheValid(cachedData)) {
      return cachedData.holidays;
    }

    // Cache is outdated, return null to trigger refetch
    return null;
  } catch {
    // Cache file doesn't exist or is invalid
    return null;
  }
}

/**
 * Save holiday data to cache
 */
export async function setCachedHolidays(countryCode: string, holidays: CalendarificHoliday[]): Promise<void> {
  try {
    await ensureCacheDir();
    
    const now = new Date();
    const cacheData: CachedHolidayData = {
      country: countryCode,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      holidays,
      cachedAt: now.toISOString(),
    };

    const cacheFile = getCacheFilePath(countryCode);
    await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2), 'utf-8');
  } catch (error) {
    // Failed to write cache, but this shouldn't break the application
    console.error(`Failed to cache holidays for ${countryCode}:`, error);
  }
}

/**
 * Clear all cached holiday data (useful for testing or maintenance)
 */
export async function clearAllCache(): Promise<void> {
  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to clear holiday cache:', error);
  }
}
