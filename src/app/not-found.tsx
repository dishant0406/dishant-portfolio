import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
  // No canonical: an error page must not claim to be another page.
  alternates: {},
};

/**
 * `html`/`body` are locked to the viewport height in globals.css so the chat UI
 * can manage its own scrolling, so this page needs its own scrollable box or its
 * content is clipped on short viewports.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <main className="fixed inset-0 overflow-y-auto overscroll-contain blog-page blog-page-light">
      <div className="blog-container">
        <div className="blog-empty">
          <h1 className="blog-title blog-serif">Page not found</h1>
          <p className="blog-excerpt">
            That page does not exist. It may have moved or been renamed.
          </p>
          <Link className="blog-read-more" href="/">
            back home
          </Link>
        </div>
      </div>
    </main>
  );
}
