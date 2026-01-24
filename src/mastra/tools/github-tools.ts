import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const GITHUB_USERNAME = "dishant0406";
const GITHUB_API_BASE = "https://api.github.com";
const PERSONAL_INFO_GIST_ID = "3bddbc95bab218eae656576eb3665328";

// Helper function to fetch from GitHub API
async function fetchGitHub(endpoint: string) {
  const token = process.env.PROFILE_G_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Portfolio-Agent',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, { headers });
  
  if (!response.ok) {
    console.error(`GitHub API error: ${response.status} - ${await response.text()}`);
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return response.json();
}

// Tool to get GitHub profile information
export const getGitHubProfileTool = createTool({
  id: "get-github-profile",
  description: "Get Dishant's GitHub profile information including bio, location, company, followers, and public repos count",
  inputSchema: z.object({}),
  outputSchema: z.object({
    name: z.string().nullable(),
    login: z.string(),
    bio: z.string().nullable(),
    company: z.string().nullable(),
    location: z.string().nullable(),
    blog: z.string().nullable(),
    twitter_username: z.string().nullable(),
    public_repos: z.number(),
    followers: z.number(),
    following: z.number(),
    created_at: z.string(),
    avatar_url: z.string(),
    html_url: z.string(),
  }),
  execute: async () => {
    try {
      const profile = await fetchGitHub(`/users/${GITHUB_USERNAME}`);
      return {
        name: profile.name,
        login: profile.login,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        blog: profile.blog,
        twitter_username: profile.twitter_username,
        public_repos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        created_at: profile.created_at,
        avatar_url: profile.avatar_url,
        html_url: profile.html_url,
      };
    } catch (error) {
      console.error('Error fetching GitHub profile:', error);
      return {
        name: "Dishant Sharma",
        login: GITHUB_USERNAME,
        bio: "Software Developer",
        company: null,
        location: null,
        blog: null,
        twitter_username: null,
        public_repos: 0,
        followers: 0,
        following: 0,
        created_at: "",
        avatar_url: "",
        html_url: `https://github.com/${GITHUB_USERNAME}`,
      };
    }
  },
});

// Tool to get GitHub repositories
export const getGitHubReposTool = createTool({
  id: "get-github-repos",
  description: "Get Dishant's GitHub repositories including private ones (with token). Sorted by most recently worked on (pushed). Can filter by language or visibility.",
  inputSchema: z.object({
    language: z.string().optional().describe("Filter repositories by programming language"),
    sort: z.enum(["stars", "updated", "pushed", "created"]).optional().describe("Sort by: stars, updated, pushed (default - most recently worked on), or created"),
    limit: z.number().optional().describe("Limit number of repositories returned (default: 10)"),
    include_private: z.boolean().optional().describe("Include private repositories (requires token, default: true)"),
    include_forks: z.boolean().optional().describe("Include forked repositories (default: false)"),
  }),
  outputSchema: z.object({
    repositories: z.array(z.object({
      name: z.string(),
      description: z.string().nullable(),
      language: z.string().nullable(),
      stars: z.number(),
      forks: z.number(),
      url: z.string(),
      homepage: z.string().nullable(),
      topics: z.array(z.string()),
      pushed_at: z.string(),
      updated_at: z.string(),
      is_fork: z.boolean(),
      is_private: z.boolean(),
    })),
    total_count: z.number(),
  }),
  execute: async ({ context }) => {
    try {
      const sort = context?.sort || "pushed"; // Default to most recently worked on
      const limit = context?.limit || 10;
      const languageFilter = context?.language?.toLowerCase();
      const includePrivate = context?.include_private !== false; // Default true
      const includeForks = context?.include_forks === true; // Default false

      // Use authenticated endpoint if token is available to get private repos
      const hasToken = !!process.env.PROFILE_G_TOKEN;
      let allRepos: unknown[] = [];
      
      if (hasToken && includePrivate) {
        // Fetch repos from authenticated user endpoint (includes private repos)
        // Use affiliation to get owned repos and sort by pushed
        const repos = await fetchGitHub(`/user/repos?affiliation=owner&sort=${sort}&direction=desc&per_page=100`);
        allRepos = repos;
      } else {
        // Fallback to public repos only
        const repos = await fetchGitHub(`/users/${GITHUB_USERNAME}/repos?sort=${sort}&direction=desc&per_page=100`);
        allRepos = repos;
      }
      
      let filteredRepos = allRepos
        .filter((repo: unknown) => {
          const r = repo as { fork: boolean };
          return includeForks || !r.fork;
        })
        .map((repo: unknown) => {
          const r = repo as {
            name: string;
            description: string | null;
            language: string | null;
            stargazers_count: number;
            forks_count: number;
            html_url: string;
            homepage: string | null;
            topics: string[];
            pushed_at: string;
            updated_at: string;
            fork: boolean;
            private: boolean;
          };
          return {
            name: r.name,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            forks: r.forks_count,
            url: r.html_url,
            homepage: r.homepage,
            topics: r.topics || [],
            pushed_at: r.pushed_at,
            updated_at: r.updated_at,
            is_fork: r.fork,
            is_private: r.private,
          };
        });

      // Filter by language if specified
      if (languageFilter) {
        filteredRepos = filteredRepos.filter((repo: { language: string | null }) => 
          repo.language?.toLowerCase() === languageFilter
        );
      }

      // Sort by stars if requested (API already sorts by pushed by default)
      if (sort === "stars") {
        filteredRepos.sort((a: { stars: number }, b: { stars: number }) => b.stars - a.stars);
      } else if (sort === "pushed") {
        // Sort by pushed_at (most recent activity first)
        filteredRepos.sort((a: { pushed_at: string }, b: { pushed_at: string }) => 
          new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
        );
      }

      return {
        repositories: filteredRepos.slice(0, limit),
        total_count: filteredRepos.length,
      };
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      return { repositories: [], total_count: 0 };
    }
  },
});

// Tool to get repository README
export const getRepoReadmeTool = createTool({
  id: "get-repo-readme",
  description: "Get the README content of a specific GitHub repository to understand what the project does",
  inputSchema: z.object({
    repo: z.string().describe("The repository name to fetch README from"),
  }),
  outputSchema: z.object({
    content: z.string(),
    repo_name: z.string(),
    has_readme: z.boolean(),
  }),
  execute: async ({ context }) => {
    const repoName = context?.repo;
    if (!repoName) {
      return { content: "No repository name provided", repo_name: "", has_readme: false };
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${repoName}/readme`, {
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Portfolio-Agent',
          ...(process.env.PROFILE_G_TOKEN ? { 'Authorization': `Bearer ${process.env.PROFILE_G_TOKEN}` } : {}),
        },
      });

      if (!response.ok) {
        return { content: "README not found", repo_name: repoName, has_readme: false };
      }

      const content = await response.text();
      
      // Truncate if too long (to avoid token limits)
      const maxLength = 4000;
      const truncatedContent = content.length > maxLength 
        ? content.substring(0, maxLength) + "\n\n...(content truncated)"
        : content;

      return {
        content: truncatedContent,
        repo_name: repoName,
        has_readme: true,
      };
    } catch (error) {
      console.error('Error fetching README:', error);
      return { content: "Error fetching README", repo_name: repoName, has_readme: false };
    }
  },
});

// Tool to get GitHub activity (recent events)
export const getGitHubActivityTool = createTool({
  id: "get-github-activity",
  description: "Get Dishant's recent GitHub activity including commits, pull requests, issues, and other events",
  inputSchema: z.object({
    limit: z.number().optional().describe("Number of recent events to fetch (default: 10)"),
  }),
  outputSchema: z.object({
    activities: z.array(z.object({
      type: z.string(),
      repo: z.string(),
      created_at: z.string(),
      description: z.string(),
      details: z.any().optional(),
    })),
  }),
  execute: async ({ context }) => {
    const limit = context?.limit || 10;
    
    try {
      const events = await fetchGitHub(`/users/${GITHUB_USERNAME}/events/public?per_page=${limit}`);
      
      const activities = await Promise.all(events.map(async (event: {
        type: string;
        repo: { name: string };
        created_at: string;
        payload: {
          size?: number;
          head?: string;
          action?: string;
          pull_request?: {
            title?: string;
            number?: number;
            state?: string;
          };
          issue?: {
            title?: string;
            number?: number;
          };
          ref_type?: string;
          ref?: string;
          forkee?: {
            full_name?: string;
          };
          comment?: {
            body?: string;
          };
          review?: {
            state?: string;
          };
          release?: {
            tag_name?: string;
            name?: string; 
          }
        };
      }) => {
        let description = "";
        let details = null;
        
        
        switch (event.type) {
          case "PushEvent":
            // For PushEvent, we need to fetch commits separately
            const size = event.payload.size || 0;
            const commitSha = event.payload.head;
            
            if (commitSha) {
              try {
                // Fetch the commit details
                const commit = await fetchGitHub(`/repos/${event.repo.name}/commits/${commitSha}`);
                description = `Pushed ${size} commit(s): "${commit.commit.message.split('\n')[0]}"`;
                details = {
                  commits: size,
                  message: commit.commit.message,
                  sha: commitSha.substring(0, 7),
                  author: commit.commit.author.name,
                };
              } catch {
                description = `Pushed ${size} commit(s)`;
                details = { commits: size };
              }
            } else {
              description = `Pushed ${size} commit(s)`;
              details = { commits: size };
            }
            break;
            
          case "PullRequestEvent":
            description = `${event.payload.action} pull request: ${event.payload.pull_request?.title}`;
            details = {
              action: event.payload.action,
              title: event.payload.pull_request?.title,
              number: event.payload.pull_request?.number,
              state: event.payload.pull_request?.state,
            };
            break;
            
          case "IssuesEvent":
            description = `${event.payload.action} issue: ${event.payload.issue?.title}`;
            details = {
              action: event.payload.action,
              title: event.payload.issue?.title,
              number: event.payload.issue?.number,
            };
            break;
            
          case "CreateEvent":
            description = `Created ${event.payload.ref_type}${event.payload.ref ? `: ${event.payload.ref}` : ''}`;
            details = {
              ref_type: event.payload.ref_type,
              ref: event.payload.ref,
            };
            break;
            
          case "WatchEvent":
            description = "Starred repository";
            break;
            
          case "ForkEvent":
            description = "Forked repository";
            details = {
              forkee: event.payload.forkee?.full_name,
            };
            break;
            
          case "IssueCommentEvent":
            description = `Commented on issue #${event.payload.issue?.number}`;
            details = {
              issue_title: event.payload.issue?.title,
              comment: event.payload.comment?.body?.substring(0, 100),
            };
            break;
            
          case "PullRequestReviewEvent":
            description = `Reviewed pull request: ${event.payload.pull_request?.title}`;
            details = {
              state: event.payload.review?.state,
              title: event.payload.pull_request?.title,
            };
            break;
            
          case "PullRequestReviewCommentEvent":
            description = `Commented on pull request: ${event.payload.pull_request?.title}`;
            details = {
              title: event.payload.pull_request?.title,
            };
            break;
            
          case "ReleaseEvent":
            description = `${event.payload.action} release: ${event.payload.release?.tag_name}`;
            details = {
              tag: event.payload.release?.tag_name,
              name: event.payload.release?.name,
            };
            break;
            
          default:
            description = event.type.replace("Event", "");
        }
        
        return {
          type: event.type,
          repo: event.repo.name,
          created_at: event.created_at,
          description,
          details,
        };
      }));
      
      return { activities };
    } catch (error) {
      console.error('Error fetching GitHub activity:', error);
      return { activities: [] };
    }
  },
});

// Tool to get GitHub contribution stats
export const getGitHubStatsTool = createTool({
  id: "get-github-stats",
  description: "Get Dishant's GitHub statistics including top languages used across all repositories",
  inputSchema: z.object({}),
  outputSchema: z.object({
    top_languages: z.array(z.object({
      language: z.string(),
      count: z.number(),
      percentage: z.string(),
    })),
    total_repos: z.number(),
    total_stars: z.number(),
    most_starred_repo: z.object({
      name: z.string(),
      stars: z.number(),
      description: z.string().nullable(),
    }).nullable(),
  }),
  execute: async () => {
    try {
      const repos = await fetchGitHub(`/users/${GITHUB_USERNAME}/repos?per_page=100`);
      
      // Count languages
      const languageCount: Record<string, number> = {};
      let totalStars = 0;
      let mostStarred = null;
      
      for (const repo of repos) {
        if (repo.language) {
          languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
        }
        totalStars += repo.stargazers_count;
        
        if (!mostStarred || repo.stargazers_count > mostStarred.stars) {
          mostStarred = {
            name: repo.name,
            stars: repo.stargazers_count,
            description: repo.description,
          };
        }
      }

      // Sort and calculate percentages
      const totalRepos = repos.length;
      const topLanguages = Object.entries(languageCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([language, count]) => ({
          language,
          count,
          percentage: ((count / totalRepos) * 100).toFixed(1) + "%",
        }));

      return {
        top_languages: topLanguages,
        total_repos: totalRepos,
        total_stars: totalStars,
        most_starred_repo: mostStarred,
      };
    } catch (error) {
      console.error('Error fetching GitHub stats:', error);
      return {
        top_languages: [],
        total_repos: 0,
        total_stars: 0,
        most_starred_repo: null,
      };
    }
  },
});

// Tool to search within user's repositories
export const searchReposTool = createTool({
  id: "search-repos",
  description: "Search Dishant's repositories by keywords in name, description, or topics",
  inputSchema: z.object({
    query: z.string().describe("Search query to find in repository names, descriptions, or topics"),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      name: z.string(),
      description: z.string().nullable(),
      language: z.string().nullable(),
      stars: z.number(),
      url: z.string(),
      relevance: z.string(),
    })),
    total_found: z.number(),
  }),
  execute: async ({ context }) => {
    const query = context?.query?.toLowerCase();
    if (!query) {
      return { results: [], total_found: 0 };
    }

    try {
      const repos = await fetchGitHub(`/users/${GITHUB_USERNAME}/repos?per_page=100`);
      
      const results = repos
        .filter((repo: {
          name: string;
          description: string | null;
          topics: string[];
        }) => {
          const nameMatch = repo.name.toLowerCase().includes(query);
          const descMatch = repo.description?.toLowerCase().includes(query);
          const topicMatch = repo.topics?.some((t: string) => t.toLowerCase().includes(query));
          return nameMatch || descMatch || topicMatch;
        })
        .map((repo: {
          name: string;
          description: string | null;
          language: string | null;
          stargazers_count: number;
          html_url: string;
          topics: string[];
        }) => {
          let relevance = "low";
          if (repo.name.toLowerCase().includes(query)) relevance = "high";
          else if (repo.topics?.some((t: string) => t.toLowerCase().includes(query))) relevance = "medium";
          
          return {
            name: repo.name,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            url: repo.html_url,
            relevance,
          };
        })
        .sort((a: { relevance: string }, b: { relevance: string }) => {
          const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
          return order[a.relevance] - order[b.relevance];
        });

      return {
        results: results.slice(0, 10),
        total_found: results.length,
      };
    } catch (error) {
      console.error('Error searching repos:', error);
      return { results: [], total_found: 0 };
    }
  },
});

// Tool to get personal info from Gist (education, experience, resume details)
export const getPersonalInfoTool = createTool({
  id: "get-personal-info",
  description: "Get Dishant's personal information including education, work experience, skills, and resume details from his regularly updated Gist",
  inputSchema: z.object({}),
  outputSchema: z.object({
    content: z.string(),
    files: z.array(z.object({
      filename: z.string(),
      content: z.string(),
    })),
    updated_at: z.string(),
  }),
  execute: async () => {
    try {
      const response = await fetch(`${GITHUB_API_BASE}/gists/${PERSONAL_INFO_GIST_ID}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Portfolio-Agent',
          ...(process.env.PROFILE_G_TOKEN ? { 'Authorization': `Bearer ${process.env.PROFILE_G_TOKEN}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      
      // Extract all files from the gist
      const files = Object.entries(gist.files).map(([filename, fileData]: [string, unknown]) => {
        const file = fileData as { content?: string };
        return {
          filename,
          content: file.content || '',
        };
      });

      // Combine all file contents
      const combinedContent = files
        .map(f => `## ${f.filename}\n\n${f.content}`)
        .join('\n\n---\n\n');

      return {
        content: combinedContent,
        files,
        updated_at: gist.updated_at,
      };
    } catch (error) {
      console.error('Error fetching personal info gist:', error);
      return {
        content: "Unable to fetch personal information at this time.",
        files: [],
        updated_at: "",
      };
    }
  },
});

// Export all GitHub tools
export const githubTools = {
  getGitHubProfile: getGitHubProfileTool,
  getGitHubRepos: getGitHubReposTool,
  getRepoReadme: getRepoReadmeTool,
  getGitHubActivity: getGitHubActivityTool,
  getGitHubStats: getGitHubStatsTool,
  searchRepos: searchReposTool,
  getPersonalInfo: getPersonalInfoTool,
};
