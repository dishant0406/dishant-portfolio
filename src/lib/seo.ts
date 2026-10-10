import { ogImage } from './constants';
import { siteUrl } from './env';

export { siteUrl };

export const personName = 'Dishant Sharma';
export const personJobTitle = 'Full Stack Developer';
export const personDescription =
  'Full Stack Developer building interactive web products with React, Next.js and TypeScript.';

const sameAs = [
  'https://github.com/dishant0406',
  'https://twitter.com/dishant0406',
  'https://dev.to/dishant0406',
];

/**
 * Structured data for the person the site is about. `@id` is reused by
 * `blogPosting`, which is how search engines connect the author to the profile
 * instead of treating them as two unrelated names.
 */
export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${siteUrl}/#person`,
    name: personName,
    url: siteUrl,
    jobTitle: personJobTitle,
    description: personDescription,
    image: ogImage,
    sameAs,
    knowsAbout: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Full Stack Development'],
  };
}

export function blogPostingJsonLd(post: {
  slug: string;
  title: string;
  brief: string;
  publishedAt: string;
  updatedAt: string;
  coverImage?: { url: string };
  tags?: Array<{ name: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${siteUrl}/blog/${post.slug}/#article`,
    headline: post.title,
    description: post.brief,
    url: `${siteUrl}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    author: { '@id': `${siteUrl}/#person` },
    publisher: { '@id': `${siteUrl}/#person` },
    ...(post.coverImage && { image: post.coverImage.url }),
    ...(post.tags?.length && { keywords: post.tags.map((tag) => tag.name).join(', ') }),
  };
}

/** Home > Blog > post, matching the visible back-link trail on the article. */
export function breadcrumbJsonLd(post: { slug: string; title: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
    ],
  };
}
