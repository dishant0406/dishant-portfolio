import { ThemeProvider } from '@/components';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dishant Sharma | Full Stack Developer',
  description: 'Interactive portfolio of Dishant Sharma - Full Stack Developer. Chat with me to learn about my projects, skills, and experience.',
  keywords: ['Dishant Sharma', 'Portfolio', 'Full Stack Developer', 'React', 'Next.js', 'TypeScript'],
  authors: [{ name: 'Dishant Sharma' }],
  openGraph: {
    title: 'Dishant Sharma | Full Stack Developer',
    description: 'Interactive portfolio - Chat with me to learn about my projects, skills, and experience.',
    type: 'website',
  },
};

// Script to prevent flash on page load
const themeScript = `
  (function() {
    try {
      const storedTheme = localStorage.getItem('portfolio-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      let theme = storedTheme || 'system';
      if (theme === 'system') {
        theme = prefersDark ? 'dark' : 'light';
      }
      
      document.documentElement.classList.add(theme);
      document.documentElement.style.colorScheme = theme;
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={true}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
