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

export function fetchRepo(fullName: string) {
  return getJson<GithubRepo>(`/repos/${fullName}`);
}

export function fetchProfile(owner: string) {
  return getJson<GithubProfile>(`/users/${owner}`);
}
