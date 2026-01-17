// Portfolio tools - GitHub data plus UI generation helpers
import { githubTools } from "./github-tools";
import { generateJsonRendererTool } from "./json-renderer-tool";

// Export GitHub tools and JSON renderer registration
export const portfolioTools = {
  ...githubTools,
  generateJsonRenderer: generateJsonRendererTool,
};
