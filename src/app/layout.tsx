import { ThemeProvider } from '@/components';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// OG Image URL
const ogImage = 'https://cdn.jsdelivr.net/gh/dishant0406/images-repo@master/dishantsharma.webp';

// Base metadata - specific page metadata will override these
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dishant.dev'),
  title: {
    default: 'Dishant Sharma | Full Stack Developer',
    template: '%s | Dishant Sharma',
  },
  description: 'Interactive portfolio of Dishant Sharma - Full Stack Developer. Chat with me to learn about my projects, skills, and experience.',
  keywords: ['Dishant Sharma', 'Portfolio', 'Full Stack Developer', 'React', 'Next.js', 'TypeScript'],
  authors: [{ name: 'Dishant Sharma' }],
  creator: 'Dishant Sharma',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Dishant Sharma Portfolio',
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
    creator: '@dishant0406',
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
