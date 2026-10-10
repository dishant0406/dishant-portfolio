import type { MetadataRoute } from 'next';

import { fetchAllPosts } from '@/lib/api/devto';
import { siteUrl } from '@/lib/seo';

/**
 * Posts live in dev.to, so the sitemap is rebuilt on a timer rather than frozen
 * at build time. An hour of staleness is harmless; a request-time build is not,
 * because it makes the sitemap uncacheable and gives it a `lastmod` that moves
 * on every fetch.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const posts = await fetchAllPosts();

  for (const post of posts) {
    entries.push({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return entries;
}
