import type { Metadata } from 'next';

import { BlogList } from '@/components/blog/BlogList';
import { fetchAllPosts } from '@/lib/api/devto';
import { siteUrl } from '@/lib/seo';

/**
 * All posts are rendered on one page.
 *
 * Paging used to hide 47 of 56 posts behind `?page=2..7`. Those URLs
 * self-canonicalised, carried no `rel=next/prev`, and were only linked from the
 * bottom of the previous page, so search engines had almost no path into them —
 * which is why the blog went undiscovered. A single list of ~60 links is cheaper
 * to crawl and impossible to leave half-indexed.
 *
 * dev.to is the source of truth, so the list is refreshed hourly rather than
 * frozen at build time.
 */
export const revalidate = 3600;

const description = 'Essays, notes, and product stories from the studio.';

export const metadata: Metadata = {
  title: 'Blog',
  description,
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
  openGraph: {
    title: 'Blog',
    description,
    type: 'website',
    url: `${siteUrl}/blog`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog',
    description,
  },
};

export default async function BlogPage(): Promise<React.JSX.Element> {
  // Deliberately not swallowed: a fetch failure must surface as an error, not as
  // an empty blog. Silently rendering "No posts yet" is what previously hid a
  // broken feed for weeks.
  const posts = await fetchAllPosts();

  return (
    <main className="blog-page blog-page-light">
      <div className="blog-container">
        <header className="blog-hero">
          <h1 className="blog-hero-title blog-serif">Articles</h1>
          <p className="blog-hero-subtitle">
            A quiet corner for essays, system thinking, and work-in-progress notes.
          </p>
        </header>
        <BlogList posts={posts} />
      </div>
    </main>
  );
}
