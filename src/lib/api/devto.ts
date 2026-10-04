import 'server-only';

import { DevToClient, NotFoundError, type Article, type ArticleDetail } from '@dishant0406/dev-to';
import { cache } from 'react';

import { env } from '@/lib/env';
import type { BlogPost, BlogPostDetail } from '@/lib/types/blog';

/** dev.to's maximum `per_page`, and how many pages we are willing to walk. */
const PER_PAGE = 1000;
const MAX_PAGES = 5;

/**
 * Only hosts that are safe to hand to `next/image` (see `next.config.ts`).
 * A cover image can point at an arbitrary third-party host, and `next/image`
 * throws on an unlisted hostname, so anything else falls back to `undefined`.
 */
const ALLOWED_IMAGE_HOSTS = new Set(['media2.dev.to']);

const client = new DevToClient({ apiKey: env.DEVTO_API_KEY || undefined });

/**
 * dev.to swaps the `tags` and `tag_list` fields between list and detail
 * responses: whichever one is an array in a list is a comma-separated string in
 * a detail response. Join either shape into one list of tag names.
 */
function tagNames(article: Article): string[] {
  const value = Array.isArray(article.tag_list) ? article.tag_list : article.tags;
  const text = Array.isArray(value) ? value.join(',') : String(value ?? '');
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function allowedImageUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    return ALLOWED_IMAGE_HOSTS.has(new URL(url).hostname) ? url : undefined;
  } catch {
    return undefined;
  }
}

function toBlogPost(article: Article): BlogPost {
  const coverImage = allowedImageUrl(article.cover_image) ?? allowedImageUrl(article.social_image);

  return {
    id: String(article.id),
    slug: article.slug,
    title: article.title,
    brief: article.description,
    coverImage: coverImage ? { url: coverImage } : undefined,
    publishedAt: article.published_at || article.created_at,
    readTimeInMinutes: article.reading_time_minutes,
    author: { name: article.user.name },
    tags: tagNames(article).map((name) => ({ name, slug: name })),
  };
}

/**
 * Every published article, newest first. The API returns no total count, so the
 * count comes from the posts themselves.
 *
 * Walking stops as soon as a page comes back short. The page count is capped so
 * a feed that ignores paging can never spin forever: the throttle allows only 30
 * reads a minute, so an unbounded walk would hang the request.
 */
async function loadAllPosts(): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const articles = await client.articles.list({
      username: env.DEVTO_USERNAME,
      page,
      perPage: PER_PAGE,
    });

    posts.push(...articles.map(toBlogPost));

    if (articles.length < PER_PAGE) {
      break;
    }
  }

  return posts;
}

/** Cached per request, so the blog page, recent posts and the sitemap share one walk. */
export const fetchAllPosts = cache(loadAllPosts);

export async function fetchBlogPostsForPage(
  page: number,
  postsPerPage: number
): Promise<{ posts: BlogPost[]; totalPages: number }> {
  const posts = await fetchAllPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / postsPerPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * postsPerPage;

  return { posts: posts.slice(start, start + postsPerPage), totalPages };
}

/** Returns null when the slug does not exist or is not published. */
export const fetchBlogPostBySlug = cache(async (slug: string): Promise<BlogPostDetail | null> => {
  let article: ArticleDetail;

  try {
    article = await client.articles.getByPath(env.DEVTO_USERNAME, slug);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null;
    }
    throw error;
  }

  return { ...toBlogPost(article), content: { html: article.body_html } };
});
