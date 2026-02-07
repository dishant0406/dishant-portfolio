import type { Metadata } from 'next';

import { BlogList } from '@/components/blog/BlogList';
import { BlogPagination } from '@/components/blog/BlogPagination';
import { fetchBlogPostsForPage } from '@/lib/api/hashnode';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const POSTS_PER_PAGE = 9;

interface BlogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(1, parseInt((params.page as string) || '1', 10));
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
  const page = Math.max(1, parseInt((params.page as string) || '1', 10));
  const publicationHost = env.NEXT_PUBLIC_HASHNODE_HOST;

  const paginationData = await fetchBlogPostsForPage(publicationHost, page, POSTS_PER_PAGE);
  const { posts, totalPages } = paginationData;

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
