'use client';

import { analytics } from '@/lib/analytics';
import { useTheme as useNextTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: 'light' | 'dark' | undefined;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
  mounted: boolean;
}

// Check if we're on the client
const getSnapshot = () => true;
const getServerSnapshot = () => false;
const subscribe = () => () => {};

export function useTheme(): UseThemeReturn {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  
  // Use useSyncExternalStore to track mounting state without triggering re-renders
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    analytics.themeToggled(newTheme);
  };

  const currentTheme = (theme as Theme) || 'system';
  const resolved = resolvedTheme as 'light' | 'dark' | undefined;

  return {
    theme: currentTheme,
    resolvedTheme: resolved,
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    toggleTheme,
    isDark: mounted ? resolved === 'dark' : false,
    isLight: mounted ? resolved === 'light' : false,
    isSystem: currentTheme === 'system',
    mounted,
  };
}

export default useTheme;
