import { fetchAllPosts } from '@/lib/api/devto';
import type { BlogPost } from '@/lib/types/blog';

import { BlogListItem } from './BlogListItem';

interface RecentPostsProps {
  currentSlug: string;
  currentTags: string[];
}

export async function RecentPosts({ currentSlug, currentTags }: RecentPostsProps): Promise<React.JSX.Element | null> {
  let posts: BlogPost[] = [];

  try {
    const allPosts = await fetchAllPosts();
    const currentTagNames = new Set(currentTags.map((tag) => tag.toLowerCase()));
    const ranked = allPosts
      .filter((post) => post.slug !== currentSlug)
      .map((post) => ({
        post,
        sharedTags: post.tags?.filter((tag) => currentTagNames.has(tag.name.toLowerCase())).length ?? 0,
      }))
      .sort((a, b) => b.sharedTags - a.sharedTags || Date.parse(b.post.publishedAt) - Date.parse(a.post.publishedAt));

    posts = ranked.slice(0, 4).map(({ post }) => post);
    if (!posts.length) return null;

    const hasRelatedTags = (ranked[0]?.sharedTags ?? 0) > 0;

    return (
      <section className="border-t border-dashed pt-6">
        <h2 className="section-heading mb-3">{hasRelatedTags ? 'Related articles' : 'More articles'}</h2>
        <ul className="px-4 pb-6 sm:px-6">
          {posts.map((post) => (
            <BlogListItem key={post.slug} post={post} />
          ))}
        </ul>
      </section>
    );
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    return null;
  }
}
