// Portfolio tools - now only exports GitHub tools for real data
import { githubTools } from "./github-tools";

// Export only GitHub tools - no more hardcoded data
export const portfolioTools = {
  ...githubTools,
};
