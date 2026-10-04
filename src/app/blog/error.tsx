'use client';

import { useEffect } from 'react';

interface BlogErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BlogError({ error, reset }: BlogErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error('Blog error:', error);
  }, [error]);

  return (
    <main className="blog-page blog-page-light">
      <div className="blog-container">
        <div className="blog-empty">
          <h2 className="blog-title blog-serif">Could not load articles</h2>
          <p className="blog-excerpt">
            The blog is temporarily unavailable. Please try again in a moment.
          </p>
          <button className="blog-read-more" onClick={reset} type="button">
            try again
          </button>
        </div>
      </div>
    </main>
  );
}
