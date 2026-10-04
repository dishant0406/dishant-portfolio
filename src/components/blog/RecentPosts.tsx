import Link from 'next/link';

import { fetchAllPosts } from '@/lib/api/devto';
import type { BlogPost } from '@/lib/types/blog';

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
    <section className="blog-recent">
      <h2 className="blog-recent-title blog-serif">Recent posts</h2>
      <div className="blog-recent-list">
        {posts.map((post) => (
          <article key={post.slug} className="blog-recent-item">
            <Link className="blog-recent-link" href={`/blog/${post.slug}`}>
              <span className="blog-recent-meta">{post.readTimeInMinutes} min read</span>
              <span className="blog-recent-name">{post.title}</span>
            </Link>
          </article>
        ))}
      </div>
      <Link className="blog-recent-all" href="/blog">
        View all posts
      </Link>
    </section>
  );
}
