import "server-only";

import config from "@/config/config.json";
import type { Project } from "@/config/types";

import { searchReposByTopic, type GithubRepo } from "./repos";

type Override = Partial<
  Pick<Project, "title" | "tagline" | "description" | "liveUrl" | "image" | "imageAlt" | "category">
>;

const { github, overrides } = config.projects as {
  github: { topic: string; owners: string[] };
  overrides: Record<string, Override>;
};

// "ice-out" becomes "Ice Out".
function toTitle(name: string) {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// GitHub lets people type a homepage without the scheme.
function toUrl(homepage: string | null) {
  if (!homepage) return undefined;
  return /^https?:\/\//.test(homepage) ? homepage : `https://${homepage}`;
}

// Reads the share image (og:image) that a site publishes for link previews.
function findShareImage(html: string, pageUrl: string) {
  for (const tag of html.match(/<meta[^>]+>/gi) ?? []) {
    if (!/(property|name)=["'](og:image|twitter:image)["']/i.test(tag)) continue;
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try {
      const url = new URL(content, pageUrl);
      if (url.protocol === "https:") return url.href;
    } catch {
      // A broken address is skipped.
    }
  }
  return undefined;
}

async function fetchShareImage(liveUrl: string | undefined) {
  if (!liveUrl?.startsWith("https://")) return undefined;
  try {
    const response = await fetch(liveUrl, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return undefined;
    return findShareImage(await response.text(), liveUrl);
  } catch {
    return undefined;
  }
}

/**
 * The picture shown on hover, from best to worst: the one you set in `overrides`,
 * the share image of the live site, then the card GitHub makes for the repo.
 */
async function toProject(repo: GithubRepo): Promise<Project> {
  const override = overrides[repo.name] ?? {};
  const description = repo.description ?? "";
  const liveUrl = override.liveUrl ?? toUrl(repo.homepage);
  const image =
    override.image ??
    (await fetchShareImage(liveUrl)) ??
    `https://opengraph.githubassets.com/1/${repo.full_name}`;

  return {
    id: repo.name,
    title: override.title ?? toTitle(repo.name),
    tagline: override.tagline ?? description,
    description: override.description ?? description,
    year: new Date(repo.created_at).getFullYear(),
    category: override.category ?? repo.language ?? "Project",
    liveUrl,
    githubUrl: repo.html_url,
    image,
    imageAlt: override.imageAlt ?? `Preview of ${override.title ?? toTitle(repo.name)}`,
  };
}

/**
 * The project list is every public repo that has the topic named in
 * `projects.github.topic` (in config.json) and belongs to one of
 * `projects.github.owners`. Add the topic to a repo on GitHub and it shows here
 * within an hour. `overrides` in config.json can improve the text, link or
 * picture of one repo.
 */
export async function fetchProjects(): Promise<Project[]> {
  const repos = (await searchReposByTopic(github.topic, github.owners)) ?? [];

  return Promise.all(
    repos
      .filter((repo) => !repo.archived)
      .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
      .map(toProject),
  );
}
