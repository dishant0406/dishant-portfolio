'use client';

import { useTheme } from '@/hooks';
import { ThemeProvider as OpenUIThemeProvider } from '@openuidev/react-ui';
import { ReactNode } from 'react';
import { portfolioOpenUIDarkTheme, portfolioOpenUILightTheme } from '@/openui/theme';

interface OpenUIThemeScopeProps {
  children: ReactNode;
}

export function OpenUIThemeScope({ children }: OpenUIThemeScopeProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <OpenUIThemeProvider
      mode={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
      lightTheme={portfolioOpenUILightTheme}
      darkTheme={portfolioOpenUIDarkTheme}
    >
      {children}
    </OpenUIThemeProvider>
  );
}

export default OpenUIThemeScope;
