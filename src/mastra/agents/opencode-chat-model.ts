import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const defaultPortfolioModelId = "deepseek-v4-flash";
export const defaultGuardrailModelId = "deepseek-v4-flash";
export const defaultOpencodeBaseURL = "https://opencode.ai/zen/go/v1";

const createOpencodeProvider = (
  baseURL = process.env.OPENCODE_BASE_URL || defaultOpencodeBaseURL,
) =>
  createOpenAICompatible({
    name: "opencode-go",
    apiKey: process.env.OPENCODE_API_KEY,
    baseURL,
    headers: {
      "HTTP-Referer": process.env.OPENCODE_HTTP_REFERER || "https://dishantsharma.dev",
    },
  });

export const getOpencodeBaseURL = () =>
  process.env.OPENCODE_BASE_URL || defaultOpencodeBaseURL;

export const getGuardrailBaseURL = () =>
  process.env.OPENCODE_GUARDRAIL_BASE_URL || getOpencodeBaseURL();

export const getPortfolioModelId = () =>
  process.env.OPENCODE_MODEL || defaultPortfolioModelId;

export const getGuardrailModelId = () =>
  process.env.OPENCODE_GUARDRAIL_MODEL || defaultGuardrailModelId;

export const getChatModel = (
  modelId = getPortfolioModelId(),
  baseURL = getOpencodeBaseURL(),
) => createOpencodeProvider(baseURL)(modelId);
