import { RuntimeContext } from '@mastra/core/runtime-context';
import { portfolioTools } from '../src/mastra/tools/portfolio-tools';
import type { ChatSseEvent } from './sse';

type ToolName = keyof typeof portfolioTools;
type EmitEvent = (event: ChatSseEvent) => void;

type CollectedToolResult = {
  toolName: ToolName;
  args: Record<string, unknown>;
  result: unknown;
};

const BASE_TOOL_RUNS: Array<{ toolName: ToolName; args: Record<string, unknown> }> = [
  { toolName: 'getPersonalInfo', args: {} },
  { toolName: 'getGitHubProfile', args: {} },
  { toolName: 'getGitHubRepos', args: { limit: 12, sort: 'pushed' } },
  { toolName: 'getGitHubStats', args: {} },
];

const toolStatusLabels: Record<ToolName, string> = {
  getPersonalInfo: 'Reading portfolio profile',
  getGitHubProfile: 'Fetching GitHub profile',
  getGitHubRepos: 'Loading recent repositories',
  getGitHubStats: 'Analyzing GitHub stats',
  getGitHubActivity: 'Checking recent GitHub activity',
  getRepoReadme: 'Reading project README',
  searchRepos: 'Searching repositories',
};

const truncateString = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const compactResult = (value: unknown): unknown => {
  if (typeof value === 'string') return truncateString(value, 3500);
  if (Array.isArray(value)) return value.map(compactResult);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      typeof nestedValue === 'string' ? truncateString(nestedValue, 6000) : compactResult(nestedValue),
    ]),
  );
};

const executePortfolioTool = async (
  toolName: ToolName,
  args: Record<string, unknown>,
  emit: EmitEvent,
): Promise<CollectedToolResult> => {
  const toolCallId = `prefetch-${toolName}`;
  const label = toolName === 'getRepoReadme' && typeof args.repo === 'string'
    ? `Reading ${args.repo} README`
    : toolStatusLabels[toolName];

  emit({ type: 'status', id: toolCallId, label, state: 'running' });
  emit({ type: 'tool-call', toolName, toolCallId, args });

  const tool = portfolioTools[toolName];
  const result = await tool.execute?.({
    context: args,
    runtimeContext: new RuntimeContext(),
  });
  const compactedResult = compactResult(result);

  emit({ type: 'tool-result', toolName, toolCallId, result: compactedResult });
  emit({ type: 'status', id: toolCallId, label, state: 'completed' });

  return { toolName, args, result: compactedResult };
};

const getRepositoryNames = (reposResult: unknown) => {
  if (!reposResult || typeof reposResult !== 'object') return [];

  const repositories = (reposResult as { repositories?: unknown }).repositories;
  if (!Array.isArray(repositories)) return [];

  return repositories
    .map((repo) => {
      if (!repo || typeof repo !== 'object') return '';
      return typeof (repo as { name?: unknown }).name === 'string' ? (repo as { name: string }).name : '';
    })
    .filter(Boolean);
};

const getMentionedRepos = (query: string, repoNames: string[]) => {
  const normalizedQuery = query.toLowerCase();

  return repoNames
    .filter((repoName) => normalizedQuery.includes(repoName.toLowerCase()))
    .slice(0, 2);
};

const shouldFetchActivity = (query: string) =>
  /\b(activity|recent|working|current|commit|commits|pull request|pull requests|github)\b/i.test(query);

export const collectPortfolioContext = async (query: string, emit: EmitEvent) => {
  const toolRuns = shouldFetchActivity(query)
    ? [...BASE_TOOL_RUNS, { toolName: 'getGitHubActivity' as const, args: { limit: 8 } }]
    : BASE_TOOL_RUNS;

  const collectedResults = await Promise.all(
    toolRuns.map(({ toolName, args }) => executePortfolioTool(toolName, args, emit)),
  );

  const reposResult = collectedResults.find((result) => result.toolName === 'getGitHubRepos')?.result;
  const mentionedRepos = getMentionedRepos(query, getRepositoryNames(reposResult));

  for (const repo of mentionedRepos) {
    collectedResults.push(
      await executePortfolioTool('getRepoReadme', { repo }, emit),
    );
  }

  return JSON.stringify({
    collectedAt: new Date().toISOString(),
    source: 'server-prefetched portfolio tools',
    results: collectedResults,
  });
};
