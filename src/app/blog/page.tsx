import type { Metadata } from 'next';

import { BlogList } from '@/components/blog/BlogList';
import { BlogPagination } from '@/components/blog/BlogPagination';
import { fetchBlogPostsForPage } from '@/lib/api/devto';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const POSTS_PER_PAGE = 9;

interface BlogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** `?page=abc` or a missing page falls back to page 1 instead of an empty list. */
function parsePage(value: string | string[] | undefined): number {
  const page = Number.parseInt(Array.isArray(value) ? value[0] : value ?? '', 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePage(params.page);
  const baseUrl = `${env.NEXT_PUBLIC_SITE_URL}/blog`;
  const canonical = page > 1 ? `${baseUrl}?page=${page}` : baseUrl;

  return {
    title: page > 1 ? `Blog - Page ${page}` : 'Blog',
    description: 'Essays, notes, and product stories from the studio.',
    alternates: {
      canonical,
    },
    openGraph: {
      title: page > 1 ? `Blog - Page ${page}` : 'Blog',
      description: 'Essays, notes, and product stories from the studio.',
      type: 'website',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title: page > 1 ? `Blog - Page ${page}` : 'Blog',
      description: 'Essays, notes, and product stories from the studio.',
    },
  };
}

export default async function BlogPage({
  searchParams,
}: BlogPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const page = parsePage(params.page);

  // Deliberately not swallowed: a fetch failure must surface as an error, not as
  // an empty blog. Silently rendering "No posts yet" is what previously hid a
  // broken feed for weeks.
  const { posts, totalPages } = await fetchBlogPostsForPage(page, POSTS_PER_PAGE);

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
        <BlogPagination currentPage={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
