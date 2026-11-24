import "server-only";

const GITHUB_API = "https://api.github.com";

export type GithubRepo = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
  created_at: string;
};

export type GithubEvent = { type: string; created_at: string };

export type GithubProfile = {
  followers: number;
  public_repos: number;
};

// Reads one GitHub REST endpoint. The token is optional: it only raises the rate
// limit. An error returns null so a GitHub outage never breaks a page.
async function getJson<T>(path: string): Promise<T | null> {
  const token = process.env.PROFILE_G_TOKEN;

  try {
    const response = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`GitHub request failed: ${path} (${response.status})`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`GitHub request failed: ${path}`, error);
    return null;
  }
}

export function fetchOwnerRepos(owner: string) {
  return getJson<GithubRepo[]>(
    `/users/${owner}/repos?type=owner&sort=pushed&per_page=100`,
  );
}

export function fetchProfile(owner: string) {
  return getJson<GithubProfile>(`/users/${owner}`);
}

/** The latest 100 public events. GitHub keeps events for 90 days at most. */
export function fetchPublicEvents(owner: string) {
  return getJson<GithubEvent[]>(`/users/${owner}/events/public?per_page=100`);
}

/** Public repositories that carry a topic, owned by any of the given users or orgs. */
export async function searchReposByTopic(topic: string, owners: string[]) {
  const query = [`topic:${topic}`, ...owners.map((owner) => `user:${owner}`)].join(" ");
  const result = await getJson<{ items: GithubRepo[] }>(
    `/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=50`,
  );
  return result?.items ?? null;
}
