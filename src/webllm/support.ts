import { getWebLlmModelOption } from './models';

export type WebLlmSupportResult = {
  supported: boolean;
  reason?: string;
};

const hasFeature = (features: unknown, feature: string) =>
  Boolean(
    features &&
      typeof (features as { has?: unknown }).has === 'function' &&
      (features as { has: (value: string) => boolean }).has(feature),
  );

export const getWebLlmSupport = async (modelId: string): Promise<WebLlmSupportResult> => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'Local models need a browser.' };
  }

  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (!gpu) {
    return { supported: false, reason: 'WebGPU is not available in this browser.' };
  }

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    return { supported: false, reason: 'No WebGPU adapter was found.' };
  }

  const model = getWebLlmModelOption(modelId);
  const features = (adapter as { features?: unknown }).features;
  const missingFeature = model.requiredFeatures?.find((feature) => !hasFeature(features, feature));
  if (missingFeature) {
    return { supported: false, reason: `This GPU is missing ${missingFeature}.` };
  }

  return { supported: true };
};
