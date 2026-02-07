import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { RecentPosts } from '@/components/blog/RecentPosts';
import { fetchBlogPostBySlug, fetchBlogPostMetadata } from '@/lib/api/hashnode';
import { env } from '@/lib/env';
import type { BlogPostDetail } from '@/lib/types/blog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return dateFormatter.format(date);
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const publicationHost = env.NEXT_PUBLIC_HASHNODE_HOST;

  try {
    const response = await fetchBlogPostMetadata(publicationHost, slug);
    const post = response.publication.post;

    if (!post) {
      return {
        title: 'Post Not Found',
        description: 'The requested blog post could not be found.',
      };
    }
    const title = post.seo?.title || post.title;
    const description = post.seo?.description || post.brief;
    const image = post.ogMetaData?.image || post.coverImage?.url;
    const canonicalUrl = `${env.NEXT_PUBLIC_SITE_URL}/blog/${slug}`;
    const keywords = post.tags?.map((tag) => tag.name).filter(Boolean);

    return {
      title,
      description,
      keywords,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: 'article',
        url: canonicalUrl,
        publishedTime: post.publishedAt,
        authors: [post.author.name],
        ...(image && {
          images: [
            {
              url: image,
              alt: title,
            },
          ],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image && {
          images: [image],
        }),
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Blog Post',
      description: 'Read the latest blog post.',
    };
  }
}

export default async function BlogPostPage({
  params,
}: BlogPostPageProps): Promise<React.JSX.Element> {
  const publicationHost = env.NEXT_PUBLIC_HASHNODE_HOST;
  const { slug } = await params;

  let post: BlogPostDetail | null = null;
  try {
    const response = await fetchBlogPostBySlug(publicationHost, slug);
    post = response.publication.post;

    if (!post) {
      notFound();
    }
  } catch (error) {
    console.error('Error fetching blog post:', error);
    notFound();
  }

  if (!post) {
    notFound();
  }

  const formattedDate = formatDate(post.publishedAt);

  return (
    <main className="blog-page blog-page-article">
      <div className="blog-container blog-article">
        <Link className="blog-back-link" href="/blog">
          Back to articles
        </Link>
        <h1 className="blog-hero-title blog-serif">{post.title}</h1>
        <div className="blog-meta">
          <span>{formattedDate}</span>
          <span className="blog-dot" aria-hidden="true">
            ·
          </span>
          <span>{post.author.name}</span>
          <span className="blog-dot" aria-hidden="true">
            ·
          </span>
          <span>{post.readTimeInMinutes} min read</span>
        </div>

        {post.coverImage?.url && (
          <div className="blog-cover">
            <Image
              alt={post.title}
              className="blog-cover-image"
              height={720}
              src={post.coverImage.url}
              width={1280}
            />
          </div>
        )}

        <BlogPostContent html={post.content.html} />
        <RecentPosts currentSlug={slug} />
      </div>
    </main>
  );
}
