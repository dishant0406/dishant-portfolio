interface BlogPostContentProps {
  html: string;
}

export function BlogPostContent({ html }: BlogPostContentProps): React.JSX.Element {
  return (
    <div className="blog-content">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
