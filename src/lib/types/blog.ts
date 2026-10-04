export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  brief: string;
  coverImage?: {
    url: string;
  };
  publishedAt: string;
  readTimeInMinutes: number;
  author: {
    name: string;
  };
  tags?: Array<{
    name: string;
    slug: string;
  }>;
}

export interface BlogPostDetail extends BlogPost {
  content: {
    html: string;
  };
}
