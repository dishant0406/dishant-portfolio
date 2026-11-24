import "server-only";

import { fetchGithubData } from "./github";
import { fetchOwnerRepos, fetchProfile, fetchPublicEvents } from "./repos";

export type Metric = {
  value: number | null;
  /** The same number for the 7 days before, or null when there is no trend. */
  before?: number | null;
};

export type InsightPoint = {
  date: string;
  contributions: number;
  pushes: number;
};

export type Insights = {
  /** The last 7 days, or null when the contribution calendar is not available. */
  points: InsightPoint[] | null;
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
  const [profile, repos, events, days] = await Promise.all([
    fetchProfile(owner),
    fetchOwnerRepos(owner),
    fetchPublicEvents(owner),
    process.env.PROFILE_G_TOKEN
      ? fetchGithubData(owner).catch(() => null)
      : null,
  ]);

  const lastWeek = days?.slice(-7) ?? null;
  const weekBefore = days?.slice(-14, -7) ?? null;

  // A push event says a push happened. GitHub no longer sends the commit count.
  const pushesByDate = new Map<string, number>();
  for (const event of events ?? []) {
    if (event.type !== "PushEvent") continue;
    const date = event.created_at.slice(0, 10);
    pushesByDate.set(date, (pushesByDate.get(date) ?? 0) + 1);
  }

  return {
    points:
      lastWeek?.map((day) => ({
        date: day.date,
        contributions: day.count,
        pushes: pushesByDate.get(day.date) ?? 0,
      })) ?? null,
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
