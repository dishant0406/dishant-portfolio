import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const defaultPortfolioModelId = "deepseek-v4-flash";
export const defaultGuardrailModelId = "mimo-v2.5";

const opencodeGo = createOpenAICompatible({
  name: "opencode-go",
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: process.env.OPENCODE_BASE_URL || "https://opencode.ai/zen/go/v1",
  headers: {
    "HTTP-Referer": process.env.OPENCODE_HTTP_REFERER || "https://dishantsharma.dev",
  },
});

export const getPortfolioModelId = () =>
  process.env.OPENCODE_MODEL || defaultPortfolioModelId;

export const getGuardrailModelId = () =>
  process.env.OPENCODE_GUARDRAIL_MODEL || defaultGuardrailModelId;

export const getChatModel = (modelId = getPortfolioModelId()) =>
  opencodeGo(modelId);
