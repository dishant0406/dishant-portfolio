import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { RecentPosts } from '@/components/blog/RecentPosts';
import { ArrowLeft } from '@/components/shared/site-icons';
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
      // No "| Dishant Sharma" suffix: post titles are already long, and the
      // suffix pushed them past the ~60 characters Google shows.
      title: { absolute: title },
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
              width: 1000,
              height: 420,
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
    <>
      <JsonLd data={blogPostingJsonLd(post)} />
      <JsonLd data={breadcrumbJsonLd(post)} />
      <article className="flex flex-col gap-y-4">
        <header className="rise space-y-3 px-6">
          <Link
            href="/blog"
            className="micro-transition inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to articles
          </Link>
          <h1 className="font-serif text-3xl italic leading-[1.1] tracking-tight text-balance sm:text-4xl">
            {post.title}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {wasUpdated ? `Updated ${formatDate(post.updatedAt)}` : formattedDate}
            <span aria-hidden="true"> · </span>
            {post.author.name}
            <span aria-hidden="true"> · </span>
            {post.readTimeInMinutes} min read
          </p>
        </header>

        {post.coverImage?.url && (
          <div
            className="rise mx-6 overflow-hidden rounded-xl border"
            style={{ '--rise-delay': '0.08s' } as React.CSSProperties}
          >
            <Image
              priority
              alt={post.title}
              className="h-auto w-full"
              height={420}
              sizes="(max-width: 768px) 100vw, 768px"
              src={post.coverImage.url}
              width={1000}
            />
          </div>
        )}

        <div className="rise" style={{ '--rise-delay': '0.14s' } as React.CSSProperties}>
          <BlogPostContent html={post.content.html} />
        </div>
      </article>
      <RecentPosts currentSlug={slug} />
    </>
  );
}
