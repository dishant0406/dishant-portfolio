export type WebLlmModelOption = {
  id: string;
  label: string;
  detail: string;
  vramMb: number;
  requiredFeatures?: string[];
};

export const WEBLLM_MODEL_OPTIONS: WebLlmModelOption[] = [
  {
    id: 'gemma3-1b-it-q4f16_1-MLC',
    label: 'Gemma 3 1B',
    detail: 'Best local default',
    vramMb: 711,
  },
  {
    id: 'Qwen3.5-0.8B-q4f16_1-MLC',
    label: 'Qwen3.5 0.8B',
    detail: 'Tiny Qwen',
    vramMb: 447,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    detail: 'Balanced',
    vramMb: 879,
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    label: 'SmolLM2 360M',
    detail: 'Fastest',
    vramMb: 580,
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 1.7B',
    detail: 'Sharper, heavier',
    vramMb: 1774,
    requiredFeatures: ['shader-f16'],
  },
];

export const DEFAULT_WEBLLM_MODEL_ID = WEBLLM_MODEL_OPTIONS[0].id;

export const getWebLlmModelOption = (modelId: string) =>
  WEBLLM_MODEL_OPTIONS.find((model) => model.id === modelId) || WEBLLM_MODEL_OPTIONS[0];
