type RetryOptions = {
  primaryModel: string;
  fallbackModel?: string;
  startedModelOutput: boolean;
};

export const shouldRetryWithFallbackModel = ({
  primaryModel,
  fallbackModel,
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
