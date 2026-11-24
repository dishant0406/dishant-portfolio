import Link from 'next/link';

import { ArrowUpRight } from '@/components/shared/site-icons';
import type { BlogPost } from '@/lib/types/blog';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return dateFormatter.format(date);
}

/** One post row. It looks and moves like a row in the Work section. */
export function BlogListItem({ post }: { post: BlogPost }): React.JSX.Element {
  return (
    <li className="relative">
      <Link
        href={`/blog/${post.slug}`}
        className="group micro-transition flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-primary group-focus-visible:text-primary">
          <span className="inline font-medium text-foreground group-hover:text-primary group-focus-visible:text-primary">
            {post.title}
          </span>
          <span className="ml-2 inline font-normal text-muted-foreground max-md:hidden md:ml-4">
            {post.brief}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatDate(post.publishedAt)}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:text-primary"
        >
          <ArrowUpRight className="size-4" />
        </span>
      </Link>
    </li>
  );
}
