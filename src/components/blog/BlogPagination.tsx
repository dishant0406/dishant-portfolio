import Link from 'next/link';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
}

function pageHref(page: number): string {
  if (page <= 1) {
    return '/blog';
  }
  return `/blog?page=${page}`;
}

export function BlogPagination({
  currentPage,
  totalPages,
}: BlogPaginationProps): React.JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="blog-pagination">
      {currentPage > 1 ? (
        <Link className="blog-pagination-link" href={pageHref(currentPage - 1)}>
          Newer posts
        </Link>
      ) : (
        <span />
      )}
      {currentPage < totalPages && (
        <Link className="blog-pagination-link" href={pageHref(currentPage + 1)}>
          Older posts
        </Link>
      )}
    </div>
  );
}
