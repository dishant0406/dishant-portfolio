import type { MetadataRoute } from 'next';

import { fetchBlogPostsForSitemap } from '@/lib/api/hashnode';
import { env } from '@/lib/env';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;
  const publicationHost = env.NEXT_PUBLIC_HASHNODE_HOST;
  const entries: MetadataRoute.Sitemap = [];

  entries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  });

  entries.push({
    url: `${baseUrl}/blog`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  });

  try {
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
      const response = await fetchBlogPostsForSitemap(publicationHost, {
        first: 50,
        after: endCursor || undefined,
      });

      const posts = response.publication.posts.edges.map((edge) => edge.node);
      posts.forEach((post) => {
        entries.push({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: new Date(post.publishedAt),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      });

      hasNextPage = response.publication.posts.pageInfo.hasNextPage;
      endCursor = response.publication.posts.pageInfo.endCursor;
    }
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
  }

  return entries;
}
