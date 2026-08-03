const ROOT_PATTERN = /(^|\n)\s*root\s*=\s*Card\s*\(/;

const OPENUI_FENCE_PATTERN = /^\s*```(?:openui|txt|text)?\s*\n([\s\S]*?)\n```\s*$/i;

export const stripOpenUiFences = (content: string) => {
  const match = content.match(OPENUI_FENCE_PATTERN);
  return match?.[1]?.trim() || content.trim();
};

export const extractOpenUiProgram = (content: string) => {
  const stripped = stripOpenUiFences(content);
  const match = ROOT_PATTERN.exec(stripped);
  if (!match || match.index === undefined) return '';

  const rootIndex = stripped.indexOf('root', match.index);
  return rootIndex >= 0 ? stripped.slice(rootIndex).trim() : stripped.trim();
};

export const isOpenUiResponse = (content: string) =>
  Boolean(extractOpenUiProgram(content));

const openUiString = (value: string) =>
  JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export const wrapMarkdownInOpenUiCard = (markdown: string) => [
  'root = Card([body])',
  `body = MarkDownRenderer(${openUiString(markdown.trim() || 'No response was generated.')}, "clear")`,
].join('\n');

export const normalizeOpenUiResponse = (content: string) =>
  extractOpenUiProgram(content) || wrapMarkdownInOpenUiCard(content);
