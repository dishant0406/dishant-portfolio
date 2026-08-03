type CollectedResult = {
  toolName?: string;
  result?: unknown;
};

const MAX_CONTEXT_CHARS = 5800;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cleanText = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s([,.;:])/g, '$1')
    .trim();

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;

const toolResult = (results: CollectedResult[], toolName: string) =>
  results.find((entry) => entry.toolName === toolName)?.result;

const stringifyCompact = (value: unknown, maxLength: number) =>
  truncate(cleanText(JSON.stringify(value ?? {}, null, 2)), maxLength);

const personalSummary = (value: unknown) => {
  if (!isRecord(value) || typeof value.content !== 'string') return '';

  return [
    'Personal profile:',
    truncate(cleanText(value.content), 2600),
  ].join('\n');
};

const githubProfileSummary = (value: unknown) => {
  if (!isRecord(value)) return '';

  return [
    'GitHub profile:',
    stringifyCompact({
      name: value.name,
      login: value.login,
      bio: value.bio,
      blog: value.blog,
      public_repos: value.public_repos,
      followers: value.followers,
      html_url: value.html_url,
    }, 700),
  ].join('\n');
};

const repoSummary = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.repositories)) return '';

  const repos = value.repositories.slice(0, 8).map((repo) => {
    if (!isRecord(repo)) return undefined;

    return {
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      url: repo.url,
      homepage: repo.homepage,
    };
  }).filter(Boolean);

  return [
    'Recent repositories:',
    stringifyCompact(repos, 1600),
  ].join('\n');
};

const statsSummary = (value: unknown) => [
  'GitHub stats:',
  stringifyCompact(value, 800),
].join('\n');

export const toLocalPortfolioContext = (portfolioContext: string) => {
  try {
    const parsed = JSON.parse(portfolioContext);
    const results = isRecord(parsed) && Array.isArray(parsed.results)
      ? parsed.results.filter(isRecord)
      : [];

    return truncate([
      personalSummary(toolResult(results, 'getPersonalInfo')),
      githubProfileSummary(toolResult(results, 'getGitHubProfile')),
      repoSummary(toolResult(results, 'getGitHubRepos')),
      statsSummary(toolResult(results, 'getGitHubStats')),
    ].filter(Boolean).join('\n\n'), MAX_CONTEXT_CHARS);
  } catch {
    return truncate(cleanText(portfolioContext), MAX_CONTEXT_CHARS);
  }
};
