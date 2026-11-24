import localFont from 'next/font/local';

/**
 * Fonts are self-hosted rather than fetched from Google at build time.
 *
 * `next/font/google` downloads the stylesheet and inlines the font files during
 * the build. Google intermittently serves an extensionless `fonts.gstatic.com/l/font?kit=…`
 * URL that Turbopack cannot resolve, which fails the whole build — and the blog
 * pages are prerendered, so that fetch runs on every deploy. Keeping the
 * `.woff2` files in the repo removes the build's dependency on a third party.
 *
 * These are the `latin` subsets of the same fonts `next/font/google` would fetch.
 */
export const dmSans = localFont({
  src: './fonts/dm-sans-latin.woff2',
  weight: '100 1000',
  display: 'swap',
  variable: '--font-sans',
  fallback: ['system-ui', 'arial'],
});

export const instrumentSerif = localFont({
  src: [
    { path: './fonts/instrument-serif-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/instrument-serif-italic-latin.woff2', weight: '400', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-instrument-serif',
  fallback: ['Georgia', 'serif'],
});

export const geistMono = localFont({
  src: './fonts/geist-mono-latin.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-geist-mono',
  fallback: ['ui-monospace', 'monospace'],
});

export const handwriting = localFont({
  src: './fonts/caveat-latin.woff2',
  weight: '400',
  display: 'swap',
  fallback: ['cursive'],
});
