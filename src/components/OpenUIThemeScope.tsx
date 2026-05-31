'use client';

import { useTheme } from '@/hooks';
import { ThemeProvider as OpenUIThemeProvider } from '@openuidev/react-ui';
import { ReactNode } from 'react';
import { portfolioOpenUITheme } from '@/openui/theme';

interface OpenUIThemeScopeProps {
  children: ReactNode;
}

export function OpenUIThemeScope({ children }: OpenUIThemeScopeProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <OpenUIThemeProvider
      mode={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
      lightTheme={portfolioOpenUITheme}
      darkTheme={portfolioOpenUITheme}
    >
      {children}
    </OpenUIThemeProvider>
  );
}

export default OpenUIThemeScope;
