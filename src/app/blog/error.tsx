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
    <section className="space-y-3 px-6">
      <h1 className="font-serif text-3xl italic leading-none">Unable to load articles</h1>
      <p className="text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
      <button
        className="micro-transition font-mono text-xs text-muted-foreground hover:text-foreground"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
