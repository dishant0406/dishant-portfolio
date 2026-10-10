import localFont from 'next/font/local';

/**
 * Fonts are self-hosted rather than fetched from Google at build time.
 *
 * `next/font/google` downloads the stylesheet and inlines the font files during
 * the build. Google intermittently serves an extensionless `fonts.gstatic.com/l/font?kit=…`
 * URL that Turbopack cannot resolve, which fails the whole build — and the blog
 * pages are prerendered, so that fetch now runs on every deploy. Keeping the
 * `.woff2` files in the repo removes the build's dependency on a third party.
 *
 * These are the `latin` subsets of the variable fonts, the same files
 * `next/font/google` would have fetched.
 */
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

export const blogHeadingFont = localFont({
  src: './fonts/cormorant-garamond-latin.woff2',
  weight: '300 700',
  display: 'swap',
  variable: '--font-blog-heading',
  fallback: ['Georgia', 'serif'],
});

export const blogBodyFont = localFont({
  src: './fonts/source-sans-3-latin.woff2',
  weight: '200 900',
  display: 'swap',
  variable: '--font-blog-body',
  fallback: ['system-ui', 'arial'],
});

export const interFont = inter;
