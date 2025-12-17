import { Mastra } from "@mastra/core/mastra";
import { portfolioAgent } from "./agents/portfolio-agent";

// Use global to cache Mastra instance across serverless function invocations
// This prevents recreating the instance on every request
declare global {
  var _mastraInstance: Mastra | undefined;
}

// Initialize or reuse cached Mastra instance
if (!global._mastraInstance) {
  global._mastraInstance = new Mastra({
    agents: { portfolioAgent },
  });
}

export const mastra = global._mastraInstance;
