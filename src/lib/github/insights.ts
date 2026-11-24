import "server-only";

import { fetchGithubData } from "./github";
import { fetchOwnerRepos, fetchProfile } from "./repos";

export type Metric = {
  value: number | null;
  /** The same number for the 7 days before, or null when there is no trend. */
  before?: number | null;
};

export type Insights = {
  contributions: Metric;
  activeDays: Metric;
  followers: Metric;
  stars: Metric;
};

const sum = (days: { count: number }[]) =>
  days.reduce((total, day) => total + day.count, 0);
const countActive = (days: { count: number }[]) =>
  days.filter((day) => day.count > 0).length;

/** Four numbers about GitHub activity. Contributions need PROFILE_G_TOKEN. */
export async function getInsights(owner: string): Promise<Insights> {
  const [profile, repos, days] = await Promise.all([
    fetchProfile(owner),
    fetchOwnerRepos(owner),
    process.env.PROFILE_G_TOKEN
      ? fetchGithubData(owner).catch(() => null)
      : null,
  ]);

  const lastWeek = days?.slice(-7) ?? null;
  const weekBefore = days?.slice(-14, -7) ?? null;

  return {
    contributions: {
      value: lastWeek ? sum(lastWeek) : null,
      before: weekBefore ? sum(weekBefore) : null,
    },
    activeDays: {
      value: lastWeek ? countActive(lastWeek) : null,
      before: weekBefore ? countActive(weekBefore) : null,
    },
    followers: { value: profile?.followers ?? null },
    stars: {
      value: repos
        ? repos.reduce((total, repo) => total + repo.stargazers_count, 0)
        : null,
    },
  };
}
