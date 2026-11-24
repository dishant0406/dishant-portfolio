import { fetchAllPosts } from '@/lib/api/devto';
import type { BlogPost } from '@/lib/types/blog';

import { BlogListItem } from './BlogListItem';

interface RecentPostsProps {
  currentSlug: string;
}

export async function RecentPosts({ currentSlug }: RecentPostsProps): Promise<React.JSX.Element | null> {
  let posts: BlogPost[] = [];

  try {
    const allPosts = await fetchAllPosts();
    posts = allPosts.filter((post) => post.slug !== currentSlug).slice(0, 4);
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    return null;
  }

  if (!posts.length) {
    return null;
  }

  return (
    <section className="border-t border-dashed pt-6">
      <h2 className="section-heading mb-3">More articles</h2>
      <ul className="px-4 pb-6 sm:px-6">
        {posts.map((post) => (
          <BlogListItem key={post.slug} post={post} />
        ))}
      </ul>
    </section>
  );
}
