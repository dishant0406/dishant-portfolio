export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  brief: string;
  url: string;
  coverImage?: {
    url: string;
    isPortrait?: boolean;
    attribution?: string;
  };
  publishedAt: string;
  readTimeInMinutes: number;
  views: number;
  author: {
    name: string;
    username: string;
    profilePicture?: string;
  };
  tags?: Array<{
    name: string;
    slug: string;
  }>;
  seo?: {
    title?: string;
    description?: string;
  };
  ogMetaData?: {
    image?: string;
  };
  reactionCount: number;
  responseCount: number;
}

export interface BlogPostDetail extends BlogPost {
  content: {
    markdown: string;
    html: string;
  };
}

export interface BlogPostsResponse {
  publication: {
    posts: {
      totalDocuments?: number;
      edges: Array<{
        node: BlogPost;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
    };
  };
}

export interface BlogPostDetailResponse {
  publication: {
    post: BlogPostDetail;
  };
}

export interface BlogPostsParams {
  first?: number;
  after?: string;
}
