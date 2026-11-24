import config from '@/config/config.json';

import { ogImage } from './constants';
import { siteUrl } from './env';

export { siteUrl };

export const personName = config.person.fullName;
export const personJobTitle = config.site.jobTitle;
export const personDescription = config.site.description;

// Every social link that has an address becomes a `sameAs` entry.
const sameAs = config.socials.items.flatMap((item) =>
  'href' in item && item.href && !item.href.startsWith('mailto:') ? [item.href] : [],
);

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
    knowsAbout: config.site.knowsAbout,
  };
}

/** Tells Google the homepage is a profile of one person. */
export function profilePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: siteUrl,
    mainEntity: personJsonLd(),
  };
}

/** Gives search engines the site name to show next to results. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: personName,
    url: siteUrl,
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
    // Name and url are repeated here because the full Person block is only on
    // the homepage, so a bare `@id` on a post would point at nothing.
    author: { '@type': 'Person', '@id': `${siteUrl}/#person`, name: personName, url: siteUrl },
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
