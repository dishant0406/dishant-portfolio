export function BlogPostContent({ html }: { html: string }): React.JSX.Element {
  return <div className="blog-content px-6 pb-10" dangerouslySetInnerHTML={{ __html: html }} />;
}
