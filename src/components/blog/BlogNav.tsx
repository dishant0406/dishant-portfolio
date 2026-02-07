import Link from 'next/link';

const navItems = [
  { label: 'Articles', href: '/blog' },
  { label: 'Notes', href: '/notes' },
  { label: 'Info', href: '/info' },
  { label: 'Search', href: '/search' },
];

export function BlogNav(): React.JSX.Element {
  return (
    <header className="blog-nav">
      <div className="blog-container blog-nav-inner">
        <Link aria-label="Blog home" className="blog-logo" href="/blog">
          DS
        </Link>
        <nav className="blog-nav-links">
          {navItems.map((item) => (
            <Link key={item.label} className="blog-nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
