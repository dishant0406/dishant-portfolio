const DEFAULT_FALLBACK_MODEL = 'deepseek-v4-pro';

type RetryOptions = {
  primaryModel: string;
  fallbackModel?: string;
  startedModelOutput: boolean;
};

export const getOpencodeFallbackModelId = (
  value = process.env.OPENCODE_FALLBACK_MODEL,
) => {
  const modelId = String(value || DEFAULT_FALLBACK_MODEL).trim();
  return modelId || DEFAULT_FALLBACK_MODEL;
};

export const shouldRetryWithFallbackModel = ({
  primaryModel,
  fallbackModel = getOpencodeFallbackModelId(),
  startedModelOutput,
}: RetryOptions) =>
  !startedModelOutput &&
  Boolean(fallbackModel) &&
  fallbackModel !== primaryModel;

export const getStreamErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Stream error';
};
