import type { BlogPost } from '@/lib/types/blog';

import { BlogListItem } from './BlogListItem';

interface BlogListProps {
  posts: BlogPost[];
}

export function BlogList({ posts }: BlogListProps): React.JSX.Element {
  if (!posts.length) {
    return (
      <div className="blog-empty">
        <h2 className="blog-title blog-serif">No posts yet</h2>
        <p className="blog-excerpt">Check back soon for new writing.</p>
      </div>
    );
  }

  return (
    <div className="blog-list">
      {posts.map((post) => (
        <BlogListItem key={post.id} post={post} />
      ))}
    </div>
  );
}
