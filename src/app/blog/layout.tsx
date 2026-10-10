import Link from 'next/link';

import Header from '@/components/Header';

import { blogBodyFont, blogHeadingFont } from '../fonts';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={`${blogHeadingFont.variable} ${blogBodyFont.variable} blog-shell blog-root`}>
      <Header className="sticky top-0 z-30 bg-background/80 backdrop-blur" showGridButton={false} />
      {children}
      <footer className="blog-footer">
        <div className="blog-container blog-footer-inner">
          <Link href="/" className="blog-footer-link">Home</Link>
          <span className="blog-footer-sep" aria-hidden="true">
            ·
          </span>
          <Link href="/blog" className="blog-footer-link">Blog</Link>
          <span className="blog-footer-sep" aria-hidden="true">
            ·
          </span>
          <Link href="/sitemap.xml" className="blog-footer-link">Sitemap</Link>
        </div>
      </footer>
    </div>
  );
}
