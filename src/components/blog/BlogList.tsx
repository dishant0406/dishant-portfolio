import type { BlogPost } from '@/lib/types/blog';

import { BlogListItem } from './BlogListItem';

/** Groups posts by the year they were published, newest year first. */
function groupByYear(posts: BlogPost[]): Array<[string, BlogPost[]]> {
  const groups = new Map<string, BlogPost[]>();
  for (const post of posts) {
    const year = String(new Date(post.publishedAt).getFullYear());
    groups.set(year, [...(groups.get(year) ?? []), post]);
  }
  return [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
}

export function BlogList({ posts }: { posts: BlogPost[] }): React.JSX.Element {
  if (!posts.length) {
    return (
      <p className="px-6 py-6 text-sm text-muted-foreground">
        No posts yet. Check back soon for new writing.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 sm:px-6">
      {groupByYear(posts).map(([year, yearPosts]) => (
        <div key={year}>
          <h3 className="mb-1 px-1 py-1">
            <span className="inline-block -rotate-2 bg-muted/70 px-2.5 py-1 font-serif text-xl italic leading-none text-foreground">
              {year}
            </span>
          </h3>
          <ul className="ml-2">
            {yearPosts.map((post) => (
              <BlogListItem key={post.id} post={post} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
