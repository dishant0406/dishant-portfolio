import { gql } from '@apollo/client';

import { getClient } from '@/lib/apollo/client';
import type {
    BlogPost,
    BlogPostDetailResponse,
    BlogPostsParams,
    BlogPostsResponse,
} from '@/lib/types/blog';

const GET_PUBLICATION_POSTS_QUERY = gql`
  query GetPublicationPosts($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      id
      title
      posts(first: $first, after: $after) {
        totalDocuments
        edges {
          node {
            id
            slug
            title
            brief
            url
            coverImage {
              url
              isPortrait
              attribution
            }
            publishedAt
            readTimeInMinutes
            views
            author {
              name
              username
              profilePicture
            }
            tags {
              name
              slug
            }
            seo {
              title
              description
            }
            ogMetaData {
              image
            }
            reactionCount
            responseCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export async function fetchBlogPosts(
  host: string,
  params: BlogPostsParams = { first: 10 }
): Promise<BlogPostsResponse> {
  try {
    const client = getClient();
    const { data } = await client.query<BlogPostsResponse>({
      query: GET_PUBLICATION_POSTS_QUERY,
      variables: {
        host,
        first: params.first || 10,
        after: params.after || null,
      },
      fetchPolicy: 'no-cache',
    });

    if (!data) {
      throw new Error('No data returned from query');
    }

    return data;
  } catch (error) {
    console.error('Hashnode API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch blog posts: ${errorMessage}`);
  }
}

export async function fetchBlogPostsForPage(
  host: string,
  page: number = 1,
  postsPerPage: number = 9
): Promise<{
  posts: BlogPost[];
  totalPosts: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}> {
  try {
    if (page === 1) {
      const response = await fetchBlogPosts(host, { first: postsPerPage });
      const posts = response.publication.posts.edges.map((edge) => edge.node);
      const totalPosts = response.publication.posts.totalDocuments || posts.length;
      const totalPages = Math.ceil(totalPosts / postsPerPage);

      return {
        posts,
        totalPosts,
        totalPages,
        currentPage: 1,
        hasNextPage: response.publication.posts.pageInfo.hasNextPage,
        hasPrevPage: false,
      };
    }

    const postsToFetch = page * postsPerPage;
    const response = await fetchBlogPosts(host, { first: postsToFetch });
    const allPosts = response.publication.posts.edges.map((edge) => edge.node);
    const totalPosts = response.publication.posts.totalDocuments || allPosts.length;

    const startIndex = (page - 1) * postsPerPage;
    const posts = allPosts.slice(startIndex, startIndex + postsPerPage);
    const totalPages = Math.ceil(totalPosts / postsPerPage);

    return {
      posts,
      totalPosts,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  } catch (error) {
    console.error('Hashnode API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch blog posts for page: ${errorMessage}`);
  }
}

const GET_POST_BY_SLUG_QUERY = gql`
  query GetPostBySlug($host: String!, $slug: String!) {
    publication(host: $host) {
      id
      post(slug: $slug) {
        id
        slug
        title
        brief
        url
        coverImage {
          url
          isPortrait
          attribution
        }
        content {
          markdown
          html
        }
        publishedAt
        readTimeInMinutes
        views
        author {
          name
          username
          profilePicture
          bio {
            text
          }
        }
        tags {
          name
          slug
        }
        seo {
          title
          description
        }
        ogMetaData {
          image
        }
        reactionCount
        responseCount
      }
    }
  }
`;

export async function fetchBlogPostBySlug(
  host: string,
  slug: string
): Promise<BlogPostDetailResponse> {
  try {
    const client = getClient();
    const { data } = await client.query<BlogPostDetailResponse>({
      query: GET_POST_BY_SLUG_QUERY,
      variables: {
        host,
        slug,
      },
      fetchPolicy: 'no-cache',
    });

    if (!data) {
      throw new Error('No data returned from query');
    }

    return data;
  } catch (error) {
    console.error('Hashnode API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch blog post: ${errorMessage}`);
  }
}

const GET_POST_METADATA_QUERY = gql`
  query GetPostMetadata($host: String!, $slug: String!) {
    publication(host: $host) {
      id
      post(slug: $slug) {
        id
        title
        brief
        publishedAt
        tags {
          name
          slug
        }
        author {
          name
        }
        coverImage {
          url
        }
        seo {
          title
          description
        }
        ogMetaData {
          image
        }
      }
    }
  }
`;

export async function fetchBlogPostMetadata(
  host: string,
  slug: string
): Promise<BlogPostDetailResponse> {
  try {
    const client = getClient();
    const { data } = await client.query<BlogPostDetailResponse>({
      query: GET_POST_METADATA_QUERY,
      variables: {
        host,
        slug,
      },
      fetchPolicy: 'no-cache',
    });

    if (!data) {
      throw new Error('No data returned from query');
    }

    return data;
  } catch (error) {
    console.error('Hashnode API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch blog post metadata: ${errorMessage}`);
  }
}

const GET_POSTS_FOR_SITEMAP_QUERY = gql`
  query GetPostsForSitemap($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      id
      posts(first: $first, after: $after) {
        edges {
          node {
            id
            slug
            publishedAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export async function fetchBlogPostsForSitemap(
  host: string,
  params: BlogPostsParams = { first: 50 }
): Promise<BlogPostsResponse> {
  try {
    const client = getClient();
    const { data } = await client.query<BlogPostsResponse>({
      query: GET_POSTS_FOR_SITEMAP_QUERY,
      variables: {
        host,
        first: params.first || 50,
        after: params.after || null,
      },
      fetchPolicy: 'no-cache',
    });

    if (!data) {
      throw new Error('No data returned from query');
    }

    return data;
  } catch (error) {
    console.error('Hashnode API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch blog posts for sitemap: ${errorMessage}`);
  }
}
