import Image from 'next/image';
import Link from 'next/link';

import type { BlogPost } from '@/lib/types/blog';

interface BlogListItemProps {
  post: BlogPost;
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

export function BlogListItem({ post }: BlogListItemProps): React.JSX.Element {
  const formattedDate = formatDate(post.publishedAt);
  const category = post.tags?.[0]?.name || 'Article';

  return (
    <article className="blog-list-item">
      <Link className="blog-list-link" href={`/blog/${post.slug}`}>
        <div className="blog-list-media">
          {post.coverImage?.url ? (
            <div className="blog-list-image">
              <Image
                fill
                alt={post.title}
                className="blog-list-image-img"
                sizes="(max-width: 768px) 84px, 120px"
                src={post.coverImage.url}
              />
            </div>
          ) : (
            <div className="blog-list-placeholder" aria-hidden="true">
              <span>—</span>
            </div>
          )}
        </div>
        <div className="blog-list-body">
          <div className="blog-list-meta">
            {formattedDate && <span>{formattedDate}</span>}
            <span className="blog-dot" aria-hidden="true">
              ·
            </span>
            <span>{category}</span>
          </div>
          <h2 className="blog-title blog-serif">{post.title}</h2>
          <p className="blog-excerpt">{post.brief}</p>
          <span className="blog-read-more">read more</span>
        </div>
      </Link>
    </article>
  );
}
