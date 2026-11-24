import "server-only";

import config from "@/config/config.json";
import type { Project } from "@/config/types";

import { fetchOwnerRepos, fetchRepo, type GithubRepo } from "./repos";

type Override = Partial<
  Pick<Project, "title" | "tagline" | "description" | "liveUrl" | "image" | "imageAlt" | "category">
>;

const { github, overrides } = config.projects as {
  github: { limit: number; featured: string[]; exclude: string[] };
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

function toProject(repo: GithubRepo): Project {
  const override = overrides[repo.name] ?? {};
  const description = repo.description ?? "";

  return {
    id: repo.name,
    title: override.title ?? toTitle(repo.name),
    tagline: override.tagline ?? description,
    description: override.description ?? description,
    year: new Date(repo.created_at).getFullYear(),
    category: override.category ?? repo.language ?? "Project",
    liveUrl: override.liveUrl ?? toUrl(repo.homepage),
    githubUrl: repo.html_url,
    image: override.image,
    imageAlt: override.imageAlt,
  };
}

/**
 * The project list comes from GitHub. `featured` in config.json names the
 * repositories that always show, in order. A name with a slash ("org/repo") is
 * read directly, which is how organization repositories get in. The rest of the
 * list, up to `limit`, is filled with your most recently pushed public repos
 * (not forks, not archived, with a description, not in `exclude`).
 * `overrides` in config.json can improve the text, link or picture of one repo.
 */
export async function fetchProjects(): Promise<Project[]> {
  const ownRepos = (await fetchOwnerRepos(config.person.githubUsername)) ?? [];

  const featured = (
    await Promise.all(
      github.featured.map((name) =>
        name.includes("/")
          ? fetchRepo(name)
          : ownRepos.find((repo) => repo.name === name) ?? null,
      ),
    )
  ).filter((repo): repo is GithubRepo => repo !== null);

  const recent = ownRepos.filter(
    (repo) =>
      !repo.fork &&
      !repo.archived &&
      repo.description &&
      !github.exclude.includes(repo.name),
  );

  const byName = new Map<string, GithubRepo>();
  for (const repo of [...featured, ...recent]) {
    if (!byName.has(repo.name)) byName.set(repo.name, repo);
  }

  return [...byName.values()].slice(0, github.limit).map(toProject);
}
