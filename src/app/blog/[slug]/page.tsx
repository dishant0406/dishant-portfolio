import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { RecentPosts } from '@/components/blog/RecentPosts';
import { JsonLd } from '@/components/JsonLd';
import { fetchAllPosts, fetchBlogPostBySlug } from '@/lib/api/devto';
import { blogPostingJsonLd, breadcrumbJsonLd, siteUrl } from '@/lib/seo';

/**
 * The post list is cached for an hour, so rendering each article at request time
 * buys nothing except an uncacheable response. dev.to is the source of truth and
 * a post edited there is picked up on the next revalidation.
 */
export const revalidate = 3600;

/**
 * Enumerating the slugs is what makes an article static and cacheable. Without
 * it Next has to render every article on demand and cannot cache the HTML, which
 * is how these pages previously ended up `no-store`.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const posts = await fetchAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

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

  try {
    const post = await fetchBlogPostBySlug(slug);

    if (!post) {
      return {
        title: 'Post Not Found',
        description: 'The requested blog post could not be found.',
      };
    }
    const title = post.title;
    const description = post.brief;
    const image = post.coverImage?.url;
    const canonicalUrl = `${siteUrl}/blog/${slug}`;
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
        modifiedTime: post.updatedAt,
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
  const { slug } = await params;

  const post = await fetchBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = formatDate(post.publishedAt);
  // Compare instants, not strings: the same moment can be written as `Z` or
  // `+00:00`, which would otherwise read as an update.
  const wasUpdated = new Date(post.updatedAt).getTime() > new Date(post.publishedAt).getTime();

  return (
    <main className="blog-page blog-page-article">
      <JsonLd data={blogPostingJsonLd(post)} />
      <JsonLd data={breadcrumbJsonLd(post)} />
      <div className="blog-container blog-article">
        <Link className="blog-back-link" href="/blog">
          Back to articles
        </Link>
        <h1 className="blog-hero-title blog-serif">{post.title}</h1>
        <div className="blog-meta">
          <span>{wasUpdated ? `Updated ${formatDate(post.updatedAt)}` : formattedDate}</span>
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
